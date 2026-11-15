// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import type { Assets } from '../src/game/assets';
import { buildWorld } from '../src/game/level';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; size() { return { w: 95, h: 38 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
const fake = () => new FakeAssets() as unknown as Assets;
describe('obstáculos perigosos das fases 9–16', () => {
  it.each([8, 9, 10, 11, 12, 13, 14, 15])('fase %i: há obstáculos válidos, em chão, longe de início, portal, chefe e lixeiras', (i) => {
    const w = buildWorld(i, fake());
    const hz = w.decor.filter((d) => d.hazard && /^p\d\d_d_/.test(d.tile));
    expect(hz.length, 'obstáculos').toBeGreaterThanOrEqual(2);
    for (const h of hz) {
      expect(h.x).toBeGreaterThan(500); expect(h.x).toBeLessThan(w.goal.x - 360);
      expect(w.surfaces.some((s) => s.kind === 'ground' && h.x >= s.x + 50 && h.x <= s.x + s.w - 50 && Math.abs(s.top - h.y) < 1)).toBe(true);
      if (w.bossAt) expect(Math.abs(h.x - w.bossAt.x)).toBeGreaterThan(400);
      for (const b of w.bins) expect(Math.abs(b.x - h.x)).toBeGreaterThan(60);
    }
    for (let a = 0; a < hz.length; a++) for (let b = a + 1; b < hz.length; b++) expect(Math.abs(hz[a]!.x - hz[b]!.x)).toBeGreaterThan(300);
  });
  it('encostar no obstáculo tira vida do herói (fase 9)', () => {
    const canvas = document.createElement('canvas');
    (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
    vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
    const e = new Engine(canvas, fake(), 8, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as { p: { x: number; y: number; w: number; h: number; hp: number; vy: number; inv: number }; world: { decor: { x: number; y: number; hazard: boolean; tile: string }[] }; update(dt: number): void };
    const h = e.world.decor.find((d) => d.hazard && /^p09_d_/.test(d.tile))!; const hp0 = e.p.hp;
    e.p.x = h.x - e.p.w / 2; e.p.y = h.y - e.p.h - 1; e.p.vy = 0; e.p.inv = 0;
    for (let i = 0; i < 10; i++) e.update(1 / 60);
    expect(e.p.hp).toBeLessThan(hp0);
  });
});
