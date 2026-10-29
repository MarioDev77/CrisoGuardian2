import { describe, expect, it } from 'vitest';
import { levelConfigs } from '../src/game/levels/levelConfigs';
import { generateLevel } from '../src/game/procedural/LevelGenerator';

describe('sixteen level configurations', () => {
  it('defines all sixteen missions with unique ids', () => {
    expect(levelConfigs).toHaveLength(16);
    expect(new Set(levelConfigs.map(level => level.id)).size).toBe(16);
  });
  it('generates reproducible levels for every biome', () => {
    for (const config of levelConfigs) {
      const a = generateLevel(config, 24680);
      const b = generateLevel(config, 24680);
      expect(a.width).toBe(b.width);
      expect(a.finishX).toBe(b.finishX);
      expect(a.collectibles.map(c => [c.x, c.y, c.material])).toEqual(b.collectibles.map(c => [c.x, c.y, c.material]));
      expect(a.enemies.map(e => [e.x, e.y, e.kind])).toEqual(b.enemies.map(e => [e.x, e.y, e.kind]));
    }
  });
});
