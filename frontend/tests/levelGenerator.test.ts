import { describe, expect, it } from 'vitest';
import { forestConfig } from '../src/game/levels/forestConfig';
import { generateLevel } from '../src/game/procedural/LevelGenerator';
import { validateLevel } from '../src/game/procedural/SegmentValidator';
describe('LevelGenerator',()=>{it('produz nível válido para múltiplas seeds',()=>{for(const seed of [1,2,3,42,123456]){const level=generateLevel(forestConfig,seed);expect(validateLevel(level,forestConfig).valid).toBe(true);expect(level.segments.length).toBeGreaterThan(5);}});it('é determinístico para uma mesma seed',()=>{expect(generateLevel(forestConfig,777)).toEqual(generateLevel(forestConfig,777));});it('altera a distribuição para seeds diferentes',()=>{expect(generateLevel(forestConfig,4).collectibles).not.toEqual(generateLevel(forestConfig,5).collectibles);});});
