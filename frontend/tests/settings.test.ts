// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIONS, clearAlt, DEFAULT_KEYS, defaultSettings, DIFFICULTY, getSettings, rebind, reloadSettings, resetSettings, sanitize, updateSettings, actionForCode,
} from '../src/app/settings';
import { Engine } from '../src/game/engine';
import { audio } from '../src/game/audio';
import type { Assets } from '../src/game/assets';

beforeEach(() => { localStorage.clear(); resetSettings(); });

describe('configurações: validação e persistência', () => {
  it('salva, recarrega e corrige valores inválidos', () => {
    updateSettings({ difficulty: 'hard', master: 0.3, autoFire: true });
    expect(reloadSettings()).toMatchObject({ difficulty: 'hard', master: 0.3, autoFire: true });
    const bad = sanitize({ difficulty: 'impossível', master: 7, music: -2, quality: 'ultra', touchSize: 5, keys: { jump: ['Escape', '!!'] } });
    expect(bad.difficulty).toBe('normal'); expect(bad.master).toBe(1); expect(bad.music).toBe(0); expect(bad.quality).toBe('high'); expect(bad.touchSize).toBe('md');
    expect(bad.keys.jump).toEqual(DEFAULT_KEYS.jump); // teclas inválidas/reservadas voltam ao padrão
    expect(sanitize('lixo')).toEqual(defaultSettings()); expect(sanitize(null)).toEqual(defaultSettings());
  });
  it('arquivo salvo com a mesma tecla em duas ações volta às teclas padrão', () => {
    const s = sanitize({ keys: { ...DEFAULT_KEYS, jump: ['KeyJ', ''] } }); // KeyJ também é "atirar"
    expect(s.keys).toEqual(DEFAULT_KEYS);
  });
  it('localStorage corrompido não derruba o jogo', () => { localStorage.setItem('crisoguardian-settings-v1', '{nao-e-json'); expect(reloadSettings()).toEqual(defaultSettings()); });
  it('restaurar padrões', () => { updateSettings({ muted: true, quality: 'low' }); resetSettings(); expect(getSettings()).toEqual(defaultSettings()); });
});

describe('remapear teclas', () => {
  it('troca tecla entre ações sem deixar nenhuma ação sem tecla ou com tecla repetida', () => {
    const r = rebind(DEFAULT_KEYS, 'jump', 0, 'KeyJ'); // KeyJ era de "atirar"
    expect(r.ok).toBe(true); expect(r.swapped).toBe('shoot');
    expect(r.keys.jump[0]).toBe('KeyJ'); expect(r.keys.shoot[0]).toBe('Space');
    const all = ACTIONS.flatMap((a) => r.keys[a]).filter(Boolean); expect(new Set(all).size).toBe(all.length);
    for (const a of ACTIONS) expect(r.keys[a][0], a).toBeTruthy();
  });
  it('tecla livre vira a nova, e Esc/Tab/F5 são recusadas', () => {
    const r = rebind(DEFAULT_KEYS, 'special', 1, 'KeyQ'); expect(r.ok).toBe(true); expect(r.keys.special).toEqual(['KeyK', 'KeyQ']); expect(r.swapped).toBeUndefined();
    for (const c of ['Escape', 'Tab', 'F5', 'MetaLeft']) expect(rebind(DEFAULT_KEYS, 'jump', 0, c).ok, c).toBe(false);
  });
  it('limpar a alternativa mantém a principal; "pausar" tem alternativa vazia por padrão', () => {
    expect(clearAlt(DEFAULT_KEYS, 'left').left).toEqual(['ArrowLeft', '']); expect(DEFAULT_KEYS.pause[1]).toBe('');
    expect(actionForCode('KeyP', DEFAULT_KEYS)).toBe('pause'); expect(actionForCode('KeyQ', DEFAULT_KEYS)).toBeNull();
  });
});

// ---------------------------------------------------------------- integração com o motor
class FakeAssets {
  scenes = new Map(); tiles = new Map(); meta = {}; look = { ambient: [1, 1, 1], haze: [200, 220, 235], shadow: [14, 24, 34], light: [255, 244, 214] };
  size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ }
}
interface Int {
  update(dt: number): void; render(): void; destroy(): void; keys: Record<string, boolean>; shots: unknown[]; introT: number; enemies: { hp: number; maxHp: number; kind: string }[]; boss: { maxHp: number } | null;
  p: { hp: number; maxHp: number; specialCd: number; inv: number };
}
const ctxProxy = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
function make(level = 0) {
  const canvas = document.createElement('canvas'); (canvas as unknown as { getContext: () => unknown }).getContext = ctxProxy;
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  return new Engine(canvas, new FakeAssets() as unknown as Assets, level, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as Int;
}
const press = (code: string, down = true) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, cancelable: true }));

describe('o motor obedece às configurações', () => {
  it('dificuldade muda corações, vida dos inimigos e do chefe', () => {
    const hp = {} as Record<string, number>; const en = {} as Record<string, number>; const boss = {} as Record<string, number>;
    for (const d of ['easy', 'normal', 'hard'] as const) {
      updateSettings({ difficulty: d }); const a = make(0); hp[d] = a.p.hp; expect(a.p.maxHp).toBe(DIFFICULTY[d].hp);
      const rat = a.enemies.find((e) => e.kind === 'rat')!; en[d] = rat.maxHp; expect(rat.hp).toBe(rat.maxHp);
      boss[d] = make(7).boss!.maxHp; a.destroy();
    }
    expect(hp).toEqual({ easy: 6, normal: 5, hard: 3 });
    expect(en.easy).toBeLessThan(en.normal!); expect(en.normal).toBeLessThan(en.hard!);
    expect(boss.easy).toBeLessThan(boss.normal!); expect(boss.normal).toBeLessThan(boss.hard!);
  });
  it('dificuldade muda o tempo de recarga do especial e a invulnerabilidade', () => {
    updateSettings({ difficulty: 'hard' }); const e = make(0); press('KeyK'); e.update(1 / 60); expect(e.p.specialCd).toBeGreaterThan(10); press('KeyK', false);
    updateSettings({ difficulty: 'easy' }); const f = make(0); press('KeyK'); f.update(1 / 60); expect(f.p.specialCd).toBeLessThan(6.1); press('KeyK', false);
    e.destroy(); f.destroy();
  });
  it('teclas remapeadas valem na hora; as antigas deixam de funcionar', () => {
    const e = make(0); updateSettings({ keys: rebind(getSettings().keys, 'shoot', 0, 'KeyQ').keys });
    press('KeyQ'); expect(e.keys.shoot).toBe(true); press('KeyQ', false); expect(e.keys.shoot).toBe(false);
    press('KeyJ'); expect(e.keys.shoot).toBe(false); // KeyJ não é mais de "atirar"
    press('KeyX'); expect(e.keys.shoot).toBe(true); // alternativa continua
    e.destroy();
  });
  it('tiro automático atira sem apertar nada; desligado, não atira', () => {
    const e = make(0); e.update(1 / 60); expect(e.shots.length).toBe(0);
    updateSettings({ autoFire: true }); e.update(1 / 60); expect(e.shots.length).toBe(1); e.destroy();
  });
  it('desligar a abertura pula a animação de início', () => {
    updateSettings({ introAnim: false }); const a = make(0); expect(a.introT).toBeGreaterThan(2.8);
    updateSettings({ introAnim: true }); const b = make(0); expect(b.introT).toBe(0); a.destroy(); b.destroy();
  });
  it('renderiza sem erro em qualquer combinação de tela (qualidade, luz, FPS, tremor)', () => {
    const e = make(2);
    for (const quality of ['high', 'medium', 'low'] as const) for (const lighting of [true, false]) for (const showFps of [true, false]) {
      updateSettings({ quality, lighting, showFps, screenShake: lighting }); e.update(1 / 60); expect(() => e.render()).not.toThrow();
    }
    e.destroy();
  });
});

// ---------------------------------------------------------------- áudio
describe('áudio', () => {
  it('sem AudioContext (como nos testes) tudo é seguro', () => { expect(() => { audio.unlock(); audio.sfx('jump'); audio.setTrack(3); audio.duck(true); }).not.toThrow(); });
  it('com AudioContext: efeitos tocam, e mudo / volume zero silenciam', () => {
    const made: string[] = [];
    const node = () => new Proxy({ connect() { /* */ }, start() { /* */ }, stop() { /* */ }, frequency: param(), gain: param(), Q: param() } as Record<string, unknown>, { set: (t, k, v) => { (t as Record<string, unknown>)[k as string] = v; return true; } });
    const param = () => ({ value: 0, setValueAtTime() { /* */ }, exponentialRampToValueAtTime() { /* */ }, setTargetAtTime() { /* */ } });
    class FakeCtx {
      state = 'running'; currentTime = 0; sampleRate = 8000; destination = {};
      createGain() { return node(); } createDynamicsCompressor() { return node(); } createBiquadFilter() { return node(); } createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
      createOscillator() { made.push('osc'); return node(); } createBufferSource() { made.push('noise'); return node(); } resume() { return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', FakeCtx); (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    const fresh = new (audio.constructor as new () => typeof audio)(); fresh.unlock();
    fresh.sfx('coin'); expect(made.length).toBeGreaterThan(0);
    made.length = 0; updateSettings({ muted: true }); fresh.sfx('win'); expect(made.length).toBe(0);
    updateSettings({ muted: false, sfx: 0 }); fresh.sfx('win'); expect(made.length).toBe(0);
    updateSettings({ sfx: 0.8 }); fresh.sfx('win'); expect(made.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
