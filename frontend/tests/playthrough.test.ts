// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import { Assets } from '../src/game/assets';
import { layouts } from '../src/game/levels/layouts';

class FakeAssets {
  scenes = new Map(); tiles = new Map(); meta = {};
  size() { return { w: 48, h: 40 }; }
  src() { return null; } has() { return true; }
  draw() { /* no-op */ } region() { /* no-op */ }
}
interface Internals { update(dt: number): void; p: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; shield: number; onGround: boolean; vx: number; dieT: number }; world: { width: number; goal: { x: number }; ladders: { x: number; y: number; w: number; h: number }[]; surfaces: { x: number; w: number; top: number; solid: boolean }[] }; boss: { state: string } | null; ended: boolean; setControl(c: string, v: boolean): void; keys: Record<string, boolean> }

function makeEngine(level: number, done: { won: boolean; lost: boolean }) {
  const canvas = document.createElement('canvas');
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  (canvas as unknown as { getContext: () => unknown }).getContext = () => ctx;
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  return new Engine(canvas, new FakeAssets() as unknown as Assets, level, { onWin: () => { done.won = true; }, onLose: () => { done.lost = true; } }) as unknown as Internals;
}

describe('layouts', () => {
  it('has 16 missions with continuous ground at both mirror seams', () => {
    expect(layouts).toHaveLength(16);
    for (const l of layouts) {
      const g = (l.parts ? l.parts.flatMap((q) => q.surfaces) : l.surfaces).filter((s) => s.kind === 'ground');
      expect(g.length, l.id).toBeGreaterThan(0);
      if (!['river-02', 'beach-05'].includes(l.id)) expect(g.some((s) => s.x === 0) && g.some((s) => s.x + s.w >= 357), l.id).toBe(true);
    }
  });
});

describe('bot playthrough (jump arcs, ladders, gaps)', () => {
  layouts.forEach((l, idx) => {
    it(`${idx + 1}. ${l.name} can be crossed from start to goal`, () => {
      const done = { won: false, lost: false }; const e = makeEngine(idx, done);
      e.p.hp = 9999; e.p.maxHp = 9999; // test geometry, not combat
      if (e.boss) e.boss.state = 'dead';
      let t = 0, stuckT = 0, lastX = e.p.x, jumpTimer = 0;
      while (t < 240 && !done.won) {
        const p = e.p; const k = e.keys;
        k.right = true; k.left = false; k.shoot = true;
        const ahead = p.x + p.w + 70; const ladder = e.world.ladders.find((s) => p.x + p.w > s.x && p.x < s.x + s.w);
        const floorAhead = e.world.surfaces.some((s) => ahead >= s.x && ahead <= s.x + s.w && s.top >= p.y + p.h - 90);
        jumpTimer -= 1 / 60;
        k.jump = p.onGround && (!floorAhead || stuckT > 0.25 || jumpTimer < 0);
        if (k.jump && jumpTimer < 0) jumpTimer = 0.9;
        k.up = !!ladder && stuckT > 0.35 && p.y + p.h > ladder.y + 4;
        stuckT = Math.abs(p.x - lastX) < 0.3 ? stuckT + 1 / 60 : 0; lastX = p.x;
        e.update(1 / 60); t += 1 / 60;
      }
      expect(done.won, `${l.name}: stuck at x=${Math.round(e.p.x)} of ${Math.round(e.world.width)} y=${Math.round(e.p.y)} t=${Math.round(t)}`).toBe(true);
    });
  });
});
