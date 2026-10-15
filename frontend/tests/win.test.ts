// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import type { Assets } from '../src/game/assets';

class FakeAssets {
  scenes = new Map(); tiles = new Map(); meta = {};
  look = { ambient: [1, 1, 1], haze: [200, 220, 235], shadow: [14, 24, 34], light: [255, 244, 214] };
  size() { return { w: 48, h: 40 }; }
  src() { return null; } has() { return true; }
  draw() { /* no-op */ } region() { /* no-op */ }
}
interface Internals {
  update(dt: number): void; render(): void; startWin(): void;
  win: { phase: string; t: number } | null; keys: Record<string, boolean>;
  p: { x: number; y: number; w: number; h: number; hp: number; onGround: boolean };
  world: { goal: { x: number; y: number } }; enemies: unknown[];
}
function make(level: number, cb: { won: number }) {
  const canvas = document.createElement('canvas');
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
  (canvas as unknown as { getContext: () => unknown }).getContext = () => ctx;
  vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
  return new Engine(canvas, new FakeAssets() as unknown as Assets, level, { onWin: () => { cb.won++; }, onLose: () => { /* */ } }) as unknown as Internals;
}
const stand = (e: Internals) => { const g = e.world.goal; e.p.x = g.x - 20; e.p.y = g.y - e.p.h; e.enemies = []; };

describe('sequência de vitória', () => {
  it('toca a animação e só então chama onWin (uma única vez)', () => {
    const cb = { won: 0 }; const e = make(0, cb); stand(e);
    e.update(1 / 60); e.update(1 / 60); // toca no portal
    expect(e.win).not.toBeNull(); expect(cb.won).toBe(0);
    const phases = new Set<string>();
    for (let i = 0; i < 60 * 6; i++) { e.update(1 / 60); e.render(); if (e.win) phases.add(e.win.phase); }
    expect(cb.won).toBe(1);
    expect([...phases]).toEqual(expect.arrayContaining(['suck', 'burst', 'iris']));
  });

  it('dura entre 1,5 s e 4 s sem entrada do jogador', () => {
    const cb = { won: 0 }; const e = make(2, cb); stand(e); let t = 0;
    while (cb.won === 0 && t < 10) { e.update(1 / 60); t += 1 / 60; }
    expect(t).toBeGreaterThan(1.5); expect(t).toBeLessThan(4);
  });

  it('pular/atirar depois de soltar as teclas encurta a animação', () => {
    const slow = { won: 0 }; const a = make(1, slow); stand(a); let ta = 0;
    while (slow.won === 0 && ta < 10) { a.update(1 / 60); ta += 1 / 60; }
    const fast = { won: 0 }; const b = make(1, fast); stand(b); let tb = 0;
    while (fast.won === 0 && tb < 10) { b.update(1 / 60); tb += 1 / 60; if (tb > 0.5 && tb < 0.9) b.keys.jump = tb > 0.7; }
    expect(fast.won).toBe(1); expect(tb).toBeLessThan(ta);
  });

  it('o herói fica invulnerável: nada o fere durante a sequência', () => {
    const cb = { won: 0 }; const e = make(0, cb); stand(e); e.update(1 / 60); const hp = e.p.hp;
    for (let i = 0; i < 60 * 4; i++) e.update(1 / 60);
    expect(e.p.hp).toBe(hp);
  });
});
