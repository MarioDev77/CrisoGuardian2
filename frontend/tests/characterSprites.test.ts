import { describe, expect, it } from 'vitest';
import { heroPose } from '../src/game/playerAnim';
import { suitTintFor, HERO_FOLDER } from '../src/game/assets';
import fs from 'node:fs';

const base = { stateT: 0.5, hurtT: 0.3, landT: 0.15, dieT: 0.6, vy: 0, speed: 200 };
const ANIMS = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'hurt', 'attack', 'death'];

describe('sprites reais dos heróis', () => {
  for (const [id, folder] of Object.entries(HERO_FOLDER)) {
    it(`${id}: pasta ${folder} tem as 9 animações, todas dentro da spritesheet RGBA`, () => {
      const meta = JSON.parse(fs.readFileSync(`public/assets/characters/${folder}/sprites.json`, 'utf8'));
      const buf = fs.readFileSync(`public/assets/characters/${folder}/spritesheet.png`);
      expect(buf.subarray(1, 4).toString()).toBe('PNG');
      expect(buf.readUInt8(25)).toBe(6); // color type 6 = RGBA
      const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
      for (const a of ANIMS) {
        expect(meta.animations[a], a).toBeTruthy();
        for (const name of meta.animations[a].frames) {
          const f = meta.frames[name]; expect(f, name).toBeTruthy();
          expect([f.w, f.h], name).toEqual([meta.cell.w, meta.cell.h]);
          expect(f.x + f.w, name).toBeLessThanOrEqual(W); expect(f.y + f.h, name).toBeLessThanOrEqual(H);
        }
      }
    });
  }
  it('mapeia estados do jogo para animações existentes', () => {
    const map: Record<string, string> = { idle: 'idle', walk: 'walk', run: 'run', jumpStart: 'jump', jumpRise: 'jump', fall: 'fall', landing: 'land', hurt: 'hurt', attack: 'attack', death: 'death' };
    for (const [state, anim] of Object.entries(map)) expect(heroPose(state as never, { ...base, speed: state === 'landing' ? 0 : 200 }).anim).toBe(anim);
  });
  it('morte e dano avançam e terminam no último quadro', () => {
    expect(heroPose('death', { ...base, dieT: 0 }).index).toBe(0);
    expect(heroPose('death', { ...base, dieT: 5 }).index).toBe(3);
    expect(heroPose('hurt', { ...base, hurtT: 0.45 }).index).toBe(0);
  });
  it('coletar ou aterrissar correndo não agacha o herói', () => {
    for (const st of ['collect', 'interact', 'landing'] as const) expect(heroPose(st, { ...base, speed: 320 }).anim).toBe('run');
    expect(heroPose('collect', { ...base, speed: 120 }).anim).toBe('walk');
    expect(heroPose('landing', { ...base, speed: 0 }).anim).toBe('land'); // parado, aterrissar ainda agacha
    expect(heroPose('collect', { ...base, speed: 0 }).anim).toBe('idle');
  });
  it('só o uniforme é recolorido nas skins', () => {
    expect(suitTintFor('skin-crisoman-verde')).toBeNull();
    expect(suitTintFor('skin-crisogirl-fogo')?.hue).toBe(24);
    expect(suitTintFor('skin-crisogirl-rosa')?.hue).toBe(358); // Crisogirl padrão = vermelha
  });
});
