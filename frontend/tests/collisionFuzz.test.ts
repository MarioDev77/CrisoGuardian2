// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import type { Assets } from '../src/game/assets';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean }
interface I {
  update(dt: number): void; restart(): void; ended: boolean; keys: Record<string, boolean>; p: Body & { hp: number; inv: number; dieT: number }; enemies: (Body & { dying: number })[];
  world: { width: number; surfaces: { x: number; y: number; w: number; h: number; solid: boolean; top: number }[] };
}
/** Gerador pseudo-aleatório determinístico (mulberry32). */
function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function make(level: number): I {
  const canvas = document.createElement('canvas');
  (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  return new Engine(canvas, new FakeAssets() as unknown as Assets, level, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as I;
}
/** Quanto o corpo está enterrado em uma superfície sólida (menor penetração entre os eixos). */
function buried(b: Body, s: I['world']['surfaces'][number]): number {
  if (!s.solid) return 0;
  const ox = Math.min(b.x + b.w, s.x + s.w) - Math.max(b.x, s.x), oy = Math.min(b.y + b.h, s.y + s.h) - Math.max(b.y, s.y);
  return ox > 0 && oy > 0 ? Math.min(ox, oy) : 0;
}

describe('fuzz de colisão (8 fases, entradas aleatórias)', () => {
  for (let lvl = 0; lvl < 8; lvl++) {
    it(`fase ${lvl + 1}: herói e inimigos nunca ficam presos em sólidos nem saem do mapa`, () => {
      let worstP = 0, worstE = 0, outside = 0, nan = 0, held = 0, wins = 0;
      for (let seed = 0; seed < 6; seed++) {
        const e = make(lvl); const r = rng(1000 + lvl * 17 + seed); e.p.hp = 99999;
        for (let f = 0; f < 5000; f++) {
          if (e.ended) { wins++; e.restart(); e.p.hp = 99999; }
          if (f % 20 === 0) { e.keys.left = r() < 0.35; e.keys.right = r() < 0.6; e.keys.jump = r() < 0.5; e.keys.down = r() < 0.08; e.keys.shoot = r() < 0.3; }
          const dt = r() < 0.05 ? 0.033 : 1 / 60 + r() * 0.01; // inclui quadros longos (o motor limita a 33 ms)
          e.update(dt);
          const p = e.p; if (![p.x, p.y, p.vx, p.vy].every(Number.isFinite)) nan++;
          if (p.x < -0.01 || p.x + p.w > e.world.width + 0.01) outside++;
          for (const s of e.world.surfaces) { worstP = Math.max(worstP, buried(p, s)); for (const en of e.enemies) if (en.dying <= 0) worstE = Math.max(worstE, buried(en, s)); }
          if (p.onGround && p.vy > 1) held++;
        }
      }
      expect(wins).toBeGreaterThan(0);
      expect(nan).toBe(0); expect(outside).toBe(0);
      expect(worstP, 'herói enterrado em sólido (px)').toBeLessThan(3);
      expect(worstE, 'inimigo enterrado em sólido (px)').toBeLessThan(3);
      expect(held).toBe(0);
    });
  }
});
