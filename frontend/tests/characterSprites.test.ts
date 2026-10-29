import { describe, expect, it } from 'vitest';
import { heroPose } from '../src/game/playerAnim';
import { suitTintFor, HERO_FOLDER } from '../src/game/assets';
import fs from 'node:fs';

const base = { stateT: 0.5, hurtT: 0.3, landT: 0.15, dieT: 0.6, vy: 0, speed: 200 };
const ANIMS = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'hurt', 'attack', 'death'];

describe('sprites reais dos heróis', () => {
  for (const [id, folder] of Object.entries(HERO_FOLDER)) {
    it(`${id}: pasta ${folder} tem as 9 animações com quadros PNG individuais`, () => {
      const meta = JSON.parse(fs.readFileSync(`public/assets/characters/${folder}/sprites.json`, 'utf8'));
      for (const a of ANIMS) {
        expect(meta.animations[a], a).toBeTruthy();
        for (const name of meta.animations[a].frames) {
          const file = `public/assets/characters/${folder}/${a}/${name}.png`;
          const buf = fs.readFileSync(file);
          expect(buf.subarray(1, 4).toString()).toBe('PNG');
          expect(buf.readUInt8(25)).toBe(6); // color type 6 = RGBA
          expect(buf.readUInt32BE(16)).toBe(meta.cell.w); expect(buf.readUInt32BE(20)).toBe(meta.cell.h);
        }
      }
    });
  }
  it('mapeia estados do jogo para animações existentes', () => {
    const map: Record<string, string> = { idle: 'idle', walk: 'walk', run: 'run', jumpStart: 'jump', jumpRise: 'jump', fall: 'fall', landing: 'land', hurt: 'hurt', attack: 'attack', death: 'death' };
    for (const [state, anim] of Object.entries(map)) expect(heroPose(state as never, base).anim).toBe(anim);
  });
  it('morte e dano avançam e terminam no último quadro', () => {
    expect(heroPose('death', { ...base, dieT: 0 }).index).toBe(0);
    expect(heroPose('death', { ...base, dieT: 5 }).index).toBe(3);
    expect(heroPose('hurt', { ...base, hurtT: 0.45 }).index).toBe(0);
  });
  it('só o uniforme é recolorido nas skins', () => {
    expect(suitTintFor('skin-crisoman-verde')).toBeNull();
    expect(suitTintFor('skin-crisogirl-fogo')?.hue).toBe(11);
  });
});
