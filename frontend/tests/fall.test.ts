// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import type { Assets } from '../src/game/assets';

class FakeAssets { scenes = new Map(); tiles = new Map(); meta = {}; size() { return { w: 48, h: 40 }; } src() { return null; } has() { return true; } draw() { /* */ } region() { /* */ } }
interface I { update(dt: number): void; p: { x: number; y: number; h: number; hp: number; onGround: boolean; dieT: number }; safe: { x: number; y: number; t: number }; world: { surfaces: { x: number; w: number; top: number; kind: string }[] } }

describe('queda em vão', () => {
  it('nunca fica caindo para sempre: depois de cair, volta a pisar em uma superfície', () => {
    const canvas = document.createElement('canvas');
    (canvas as unknown as { getContext: () => unknown }).getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() { /* */ } }), set: () => true });
    vi.stubGlobal('ResizeObserver', class { observe() { /* */ } disconnect() { /* */ } });
    for (let lvl = 0; lvl < 8; lvl++) {
      const e = new Engine(canvas, new FakeAssets() as unknown as Assets, lvl, { onWin: () => { /* */ }, onLose: () => { /* */ } }) as unknown as I;
      e.p.hp = 9999;
      // posição segura "ruim": ponta de uma plataforma, com vazio 30px à esquerda
      const sf = e.world.surfaces.find((s) => s.kind !== 'ground') ?? e.world.surfaces[0]!;
      e.safe = { x: sf.x + 4, y: sf.top - e.p.h, t: 0 };
      e.p.x = sf.x - 400; e.p.y = 900;
      let landed = false;
      for (let i = 0; i < 600 && !landed; i++) { e.update(1 / 60); if (e.p.onGround && e.p.y < 700) landed = true; }
      expect(landed, `fase ${lvl + 1}`).toBe(true);
    }
  });
});
