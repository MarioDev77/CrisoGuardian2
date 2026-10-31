// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine, type Control, type PlayerAppearance } from '../src/game/engine';
import type { Assets } from '../src/game/assets';

/** Verifica que as habilidades e o nível do pet realmente mudam a jogabilidade no motor (não só a interface). */
class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; crisoman = null; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface E { update(dt: number): void; playerFrame(): unknown; setControl(c: Control, v: boolean): void; p: { x: number; y: number; w: number; h: number; vx: number; hp: number; maxHp: number; vy: number }; enemies: unknown[]; boss: unknown; pickups: { id: number; type: string; sprite: string; value: string; x: number; y: number; w: number; h: number; taken: boolean; phase: number; spawnKey?: string }[]; result?: unknown }
const base: PlayerAppearance = { character: 'crisoman', skinId: 'skin-crisoman-verde', petId: null };
function make(extra: Partial<PlayerAppearance> = {}): E {
  const canvas = document.createElement('canvas');
  (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  const e = new Engine(canvas, new FakeAssets() as unknown as Assets, 0, { onWin: () => { /* */ }, onLose: () => { /* */ } }, { ...base, ...extra }) as unknown as E;
  e.enemies = []; e.boss = null; return e;
}
const DT = 1 / 60; const run = (e: E, s: number, each?: (i: number) => void) => { for (let i = 0; i < Math.round(s / DT); i++) { each?.(i); e.update(DT); e.playerFrame(); } };
const skills = (n: number) => ({ jump: n, speed: n, defense: n, magnet: n });
const peak = (n: number) => { const e = make({ skills: { jump: n, speed: 0, defense: 0, magnet: 0 } }); run(e, 0.3); const y0 = e.p.y; let top = y0; e.setControl('jump', true); run(e, 1.2, () => { top = Math.min(top, e.p.y); }); return y0 - top; };

describe('efeitos das habilidades e do pet na partida', () => {
  it('defesa soma 1 ponto de vida por nível (máx. 3)', () => {
    const hp0 = make().p.maxHp; for (const n of [1, 2, 3]) { const e = make({ skills: { jump: 0, speed: 0, defense: n, magnet: 0 } }); expect(e.p.maxHp).toBe(hp0 + n); expect(e.p.hp).toBe(hp0 + n); }
  });
  it('salto: cada nível aumenta a altura do pulo', () => { const h = [0, 1, 2, 3].map(peak); expect(h[1]).toBeGreaterThan(h[0]); expect(h[2]).toBeGreaterThan(h[1]); expect(h[3]).toBeGreaterThan(h[2]); expect(h[3] / h[0]).toBeGreaterThan(1.25); });
  it('velocidade: cada nível aumenta a velocidade horizontal máxima (+6% por nível)', () => {
    const top = (n: number) => { const e = make({ skills: { jump: 0, speed: n, defense: 0, magnet: 0 } }); run(e, 0.3); let v = 0; e.setControl('right', true); run(e, 0.35, () => { v = Math.max(v, Math.abs(e.p.vx)); }); return v; };   // mede vx (o início da fase tem parede a ~175 px)
    const v = [0, 1, 2, 3].map(top); expect(v[1]).toBeGreaterThan(v[0]); expect(v[2]).toBeGreaterThan(v[1]); expect(v[3]).toBeGreaterThan(v[2]); expect(v[3] / v[0]).toBeCloseTo(1.18, 1);
  });
  it('coleta magnética e nível do pet ampliam o alcance de coleta', () => {
    const taken = (extra: Partial<PlayerAppearance>) => { const e = make(extra); run(e, 0.3); const gap = 20; e.pickups = [{ id: 9001, type: 'coin', sprite: 'it_moeda', value: 'coin', x: e.p.x + e.p.w + gap, y: e.p.y + 4, w: 28, h: 28, taken: false, phase: 0, spawnKey: 'coin:test' }]; e.update(DT); return e.pickups[0]!.taken; };
    expect(taken({})).toBe(false); expect(taken({ skills: { jump: 0, speed: 0, defense: 0, magnet: 1 } })).toBe(false);
    expect(taken({ skills: { jump: 0, speed: 0, defense: 0, magnet: 3 } })).toBe(true);
    expect(taken({ petId: 'pet-foxy', petLevel: 1 })).toBe(false); expect(taken({ petId: 'pet-foxy', petLevel: 10 })).toBe(true);
  });
  it('sem habilidades o comportamento original é preservado (compatibilidade)', () => { expect(peak(0)).toBeGreaterThan(150); expect(make({ skills: skills(0) }).p.maxHp).toBe(make().p.maxHp); });
});
