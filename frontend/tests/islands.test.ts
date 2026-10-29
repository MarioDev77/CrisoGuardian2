import { describe, expect, it } from 'vitest';
import { layouts, SCENE_W } from '../src/game/levels/layouts';
import { levelConfigs } from '../src/game/levels/levelConfigs';
import { LEVEL_COUNT } from '../src/app/progress';
import { NEW_ISLANDS } from '../src/app/catalog';
import { buildWorld } from '../src/game/level';
import fs from 'node:fs';

const fakeAssets = { size: () => ({ w: 128, h: 96 }), has: () => true } as never;

describe('Mapa 2 (fases 9 a 16)', () => {
  it('tem 16 fases cadastradas e 8 ilhas novas', () => {
    expect(LEVEL_COUNT).toBe(16); expect(layouts).toHaveLength(16); expect(levelConfigs).toHaveLength(16); expect(NEW_ISLANDS).toHaveLength(8);
    expect(new Set(layouts.slice(8).map((l) => l.id)).size).toBe(8);
  });
  for (let i = 8; i < 16; i++) {
    const L = layouts[i]!;
    it(`${L.name}: partes A–D encaixam e a fase é jogável`, () => {
      expect(L.parts!.length).toBeGreaterThanOrEqual(4);
      for (const part of L.parts!) {
        const g = part.surfaces.filter((s) => s.kind === 'ground').sort((a, b) => a.x - b.x);
        expect(g[0]!.x).toBe(0); expect(g[0]!.y).toBe(220);                       // emenda esquerda
        const last = g[g.length - 1]!; expect(last.x + last.w).toBe(SCENE_W); expect(last.y).toBe(220); // emenda direita
        for (let k = 1; k < g.length; k++) expect(g[k]!.x - (g[k - 1]!.x + g[k - 1]!.w)).toBeLessThanOrEqual(46); // buraco pulável
        for (const s of part.surfaces) if (s.kind !== 'ground') expect(220 - s.y).toBeLessThanOrEqual(80);
      }
      const w = buildWorld(i, fakeAssets);
      expect(w.start.y).toBeLessThan(600); expect(w.goal.y).toBeLessThan(600); expect(w.waste.length).toBeGreaterThan(5);
      expect(w.bossAt !== null).toBe(!!L.boss);
      for (const t of ['ground', 'ledge', 'bridge', 'bin', 'prop', 'animal']) expect(fs.existsSync(`public/assets/islands/${NEW_ISLANDS[i - 8]!.id.replace(/-\d+$/, '')}/${t === 'ground' || t === 'ledge' || t === 'bridge' ? `tiles/${t}.svg` : t === 'prop' ? 'props.svg' : `${t}.svg`}`)).toBe(true);
    });
  }
});
