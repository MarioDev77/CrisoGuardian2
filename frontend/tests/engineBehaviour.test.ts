// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Engine, type Control } from '../src/game/engine';
import type { Assets } from '../src/game/assets';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; crisoman = null; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface P { x: number; y: number; w: number; h: number; vx: number; vy: number; hp: number; maxHp: number; inv: number; hurtT: number; dieT: number; onGround: boolean; coyote: number; jumpBuf: number; facing: 1 | -1; shootT: number }
interface E { playerFrame(): { name: string; state: string }; update(dt: number): void; setControl(c: Control, v: boolean): void; restart(): void; hurtPlayer(x: number): void; p: P; enemies: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; vx: number; dying: number }[]; boss: unknown; shots: unknown[]; anim: { state: string }; world: { surfaces: { x: number; w: number; top: number; solid: boolean }[]; width: number } }

function make(level = 0): E {
  const canvas = document.createElement('canvas');
  (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  const e = new Engine(canvas, new FakeAssets() as unknown as Assets, level, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as E;
  e.enemies = []; e.boss = null; e.p.hp = e.p.maxHp = 99;
  return e;
}
const DT = 1 / 60;
/** A máquina de animação é avançada pelo desenho do quadro (`playerFrame`); aqui ela roda a cada atualização, como no jogo. */
const run = (e: E, secs: number, each?: (i: number) => void) => { for (let i = 0; i < Math.round(secs / DT); i++) { each?.(i); e.update(DT); e.playerFrame(); } };

describe('salto e controles', () => {
  it('pular segurando atinge altura estável; toque curto salta menos (altura variável)', () => {
    const peak = (hold: number) => { const e = make(); run(e, 0.3); const y0 = e.p.y; let top = y0; e.setControl('jump', true); run(e, 1.2, (i) => { if (i * DT >= hold) e.setControl('jump', false); top = Math.min(top, e.p.y); }); return y0 - top; };
    const full = peak(5), tap = peak(0.05);
    expect(full).toBeGreaterThan(150); expect(full).toBeLessThan(230);
    expect(tap).toBeLessThan(full * 0.75); expect(tap).toBeGreaterThan(30);
  });
  it('não há pulo duplo no ar', () => {
    const e = make(); run(e, 0.3); e.setControl('jump', true); run(e, 0.1); e.setControl('jump', false); run(e, 0.15);
    const vy = e.p.vy; e.setControl('jump', true); e.update(DT); expect(e.p.vy).toBeGreaterThan(vy - 1); // só gravidade, nenhum impulso novo
  });
  it('coyote time: ainda pula logo depois de sair da borda, mas não muito depois', () => {
    const e = make(); run(e, 0.3); expect(e.p.onGround).toBe(true);
    e.p.y -= 40; e.p.onGround = false; run(e, 0.05); e.setControl('jump', true); e.update(DT); expect(e.p.vy).toBeLessThan(-400);
    const f = make(); run(f, 0.3); f.p.y -= 200; f.p.onGround = false; run(f, 0.2); f.setControl('jump', true); f.update(DT); expect(f.p.vy).toBeGreaterThan(0);
  });
  it('jump buffer: apertar um pouco antes de pousar faz o salto sair no pouso', () => {
    const e = make(); run(e, 0.3); e.p.y -= 12; e.p.onGround = false; e.p.vy = 300; e.p.coyote = -1;
    e.setControl('jump', true); e.update(DT); e.setControl('jump', false); let jumped = false;
    run(e, 0.2, () => { if (e.p.vy < -400) jumped = true; }); expect(jumped).toBe(true);
  });
  it('velocidade de queda é limitada (terminal) e o herói não atravessa o chão', () => {
    const e = make(); run(e, 0.3); const top = e.world.surfaces.find((s) => s.solid && e.p.x + e.p.w / 2 > s.x && e.p.x + e.p.w / 2 < s.x + s.w)!.top;
    e.p.y = top - 3000; e.p.onGround = false; let max = 0; run(e, 6, () => { max = Math.max(max, e.p.vy); });
    expect(max).toBeLessThanOrEqual(1400); expect(e.p.y + e.p.h).toBeLessThanOrEqual(top + 0.5); expect(e.p.onGround).toBe(true);
  });
  it('aceleração gradual, velocidade máxima e parada sem escorregar para sempre', () => {
    const e = make(); run(e, 0.3); e.setControl('right', true); run(e, 0.02); expect(e.p.vx).toBeGreaterThan(0); expect(e.p.vx).toBeLessThan(200);
    run(e, 1); expect(e.p.vx).toBeLessThanOrEqual(440); e.setControl('right', false); run(e, 0.5); expect(e.p.vx).toBe(0);
  });
});

describe('animação x física', () => {
  it('parado em idle; correndo só com velocidade; no ar nunca fica em idle/walk/run; não corre parado', () => {
    const e = make(); const seen: [string, number, boolean][] = []; e.setControl('right', false);
    run(e, 0.5, () => seen.push([e.anim.state, e.p.vx, e.p.onGround])); expect(seen.every((s) => s[0] === 'idle' || s[0] === 'landing' || s[0] === 'collect')).toBe(true);
    e.setControl('right', true); e.setControl('jump', true); const air: string[] = []; const still: string[] = [];
    run(e, 1.4, () => { if (!e.p.onGround) air.push(e.anim.state); if (e.p.onGround && Math.abs(e.p.vx) < 10) still.push(e.anim.state); });
    expect(air.length).toBeGreaterThan(10); expect(air.some((s) => ['idle', 'walk', 'run'].includes(s))).toBe(false);
    expect(still.includes('run')).toBe(false);
  });
});

describe('dano, ataque e reinício', () => {
  it('invulnerabilidade temporária: dois golpes seguidos tiram só 1 de vida', () => {
    const e = make(); run(e, 0.3); const hp = e.p.hp; e.hurtPlayer(e.p.x + 100); e.hurtPlayer(e.p.x + 100); expect(e.p.hp).toBe(hp - 1); expect(e.p.inv).toBeGreaterThan(0.3);
    run(e, 2); expect(e.p.inv).toBe(0); e.hurtPlayer(e.p.x + 100); expect(e.p.hp).toBe(hp - 2);
  });
  it('um golpe (um tiro) causa dano uma única vez ao alvo, mesmo segurando o botão', () => {
    const e = make(); run(e, 0.3);
    const g = e.world.surfaces.find((s) => s.solid && e.p.x >= s.x && e.p.x < s.x + s.w)!;
    e.enemies.push({ x: e.p.x + 160, y: g.top - 60, w: 40, h: 60, hp: 5, maxHp: 5, vx: 0, dying: 0, kind: 'rat', id: 99, dir: 1, onGround: true, minX: e.p.x + 160, maxX: e.p.x + 160, baseY: g.top - 60, t: 0, hurt: 0, chasing: false, attacking: 0, vy: 0 } as never);
    e.setControl('shoot', true); run(e, 0.2); e.setControl('shoot', false); run(e, 0.6);
    expect(e.enemies[0]!.hp).toBe(4); expect(e.shots.length).toBe(0);
  });
  it('o tiro só sai no quadro ativo do golpe (não no primeiro instante)', () => {
    const e = make(); run(e, 0.3); e.setControl('shoot', true); e.update(DT); expect(e.shots.length).toBe(0); run(e, 0.1); expect(e.shots.length).toBeGreaterThan(0);
  });
  it('morte é terminal e reiniciar restaura vida, posição, animação e tiros', () => {
    const e = make(); const x0 = e.p.x, y0 = e.p.y; run(e, 0.3); e.p.hp = 1; e.hurtPlayer(e.p.x + 50); run(e, 0.3); expect(e.anim.state).toBe('death'); e.setControl('jump', true); run(e, 0.3); expect(e.anim.state).toBe('death');
    e.setControl('jump', false); e.restart(); expect(e.p.hp).toBe(e.p.maxHp); expect(e.p.dieT).toBe(0); expect(e.p.x).toBe(x0); expect(Math.abs(e.p.y - y0)).toBeLessThan(1); expect(e.shots.length).toBe(0);
    e.update(DT); expect(e.anim.state).not.toBe('death');
  });
  it('limites do mapa: não sai pelas bordas nem em alta velocidade', () => {
    const e = make(); e.p.x = 5; e.p.vx = -5000; run(e, 0.3); expect(e.p.x).toBeGreaterThanOrEqual(0);
    e.p.x = e.world.width - e.p.w - 5; e.p.vx = 5000; run(e, 0.3); expect(e.p.x + e.p.w).toBeLessThanOrEqual(e.world.width + 0.01);
  });
});

describe('depuração visual', () => {
  it('só existe em desenvolvimento: todo uso está protegido por import.meta.env.DEV', () => {
    const src = readFileSync(join(__dirname, '../src/game/engine.ts'), 'utf8');
    const calls = src.match(/.*\bdrawDebug(World|Panel)\(.*/g)?.filter((l) => !l.includes('import {')) ?? []; expect(calls.length).toBe(2);
    for (const c of calls) expect(c).toContain('import.meta.env.DEV');
    expect(src).toMatch(/if \(import\.meta\.env\.DEV\) \{ this\.debug = /);
  });
});
