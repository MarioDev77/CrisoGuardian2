import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENEMIES } from '../src/game/entities';

const PUB = join(__dirname, '../public/assets');
const atlas = JSON.parse(readFileSync(join(PUB, 'game/atlas.json'), 'utf8')) as Record<string, { x: number; y: number; w: number; h: number; ax: number; ay: number }>;
type Anim = { frames: string[]; loop: boolean; fps: number };
const meta = JSON.parse(readFileSync(join(PUB, 'sprites/actors/actors.json'), 'utf8')) as {
  atlas_size: { w: number; h: number }; frames: Record<string, { x: number; y: number; w: number; h: number; ax: number; ay: number }>;
  enemies: Record<string, { body: { w: number; h: number }; hp: number; animations: Record<string, Anim> }>;
  enemies_procedural: Record<string, { sprite: string; body: { w: number; h: number } }>;
  boss: { animations: Record<string, Anim> }; effects: Record<string, Anim>;
};
/** Largura/altura do PNG lidas do cabeçalho IHDR. */
const png = (p: string) => { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };
const allAnims = (): [string, Anim][] => [
  ...Object.entries(meta.enemies).flatMap(([k, v]) => Object.entries(v.animations).map(([a, x]) => [`${k}.${a}`, x] as [string, Anim])),
  ...Object.entries(meta.boss.animations).map(([a, x]) => [`boss.${a}`, x] as [string, Anim]),
  ...Object.entries(meta.effects).map(([a, x]) => [`fx.${a}`, x] as [string, Anim]),
];

describe('metadados de inimigos, chefe e efeitos (actors.json)', () => {
  it('o atlas é PNG RGBA e o tamanho declarado confere', () => {
    const i = png(join(PUB, 'game/atlas.png')); expect(i.colorType).toBe(6); expect({ w: i.w, h: i.h }).toEqual(meta.atlas_size);
  });
  it('cada quadro tem exatamente o retângulo e o pivô de atlas.json e cabe no atlas', () => {
    for (const [n, f] of Object.entries(meta.frames)) {
      expect(atlas[n], n).toBeDefined(); expect(f, n).toEqual({ x: atlas[n]!.x, y: atlas[n]!.y, w: atlas[n]!.w, h: atlas[n]!.h, ax: atlas[n]!.ax, ay: atlas[n]!.ay });
      expect(f.x + f.w, n).toBeLessThanOrEqual(meta.atlas_size.w); expect(f.y + f.h, n).toBeLessThanOrEqual(meta.atlas_size.h);
      expect(f.ax).toBeGreaterThanOrEqual(0); expect(f.ax).toBeLessThanOrEqual(f.w); expect(f.ay).toBeLessThanOrEqual(f.h);
    }
  });
  it('toda animação usa só quadros declarados; ordem e quantidade não ficam vazias', () => {
    for (const [n, a] of allAnims()) { expect(a.frames.length, n).toBeGreaterThan(0); for (const f of a.frames) expect(meta.frames[f], `${n} → ${f}`).toBeDefined(); }
  });
  it('quadros não se sobrepõem no atlas (nenhum quadro invade o vizinho)', () => {
    const r = Object.entries(atlas).map(([n, f]) => ({ n, ...f }));
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i]!, b = r[j]!; const hit = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; expect(hit, `${a.n} × ${b.n}`).toBe(false);
    }
  });
  it('espelha ENEMIES (entities.ts): quadros, hitbox e vida de cada inimigo', () => {
    for (const [k, sp] of Object.entries(ENEMIES)) {
      const m = meta.enemies[k], p = meta.enemies_procedural[k];
      expect(Boolean(m) !== Boolean(p), `${k} deve estar em exatamente um grupo`).toBe(true);
      if (p) { expect(p.sprite).toBe(sp.frames[0]); expect(p.body).toMatchObject({ w: sp.w, h: sp.h }); continue; }
      expect(m!.body).toMatchObject({ w: sp.w, h: sp.h }); expect(m!.hp).toBe(sp.hp);
      const used = new Set(Object.values(m!.animations).flatMap((a) => a.frames));
      for (const f of [...sp.frames, sp.chase, sp.attack, sp.die].filter(Boolean) as string[]) expect(used.has(f), `${k}: ${f}`).toBe(true);
    }
  });
  it('o chefe cobre todos os estados que o engine desenha, com os quadros do engine', () => {
    const src = readFileSync(join(__dirname, '../src/game/engine.ts'), 'utf8');
    const drawn = new Set([...src.matchAll(/'(boss_(?:die|hurt|atk1|atk2|idle))'/g)].map((m) => m[1]!));
    const declared = new Set(Object.values(meta.boss.animations).flatMap((a) => a.frames));
    for (const n of drawn) expect(declared.has(n), n).toBe(true);
    for (const st of ['idle', 'windup', 'charge', 'spit', 'leap', 'recover', 'hurt', 'dead']) expect(meta.boss.animations[st], st).toBeDefined();
  });
  it('efeitos de duração finita têm duração definida', () => {
    for (const k of ['special_ring', 'special_burst']) expect((meta.effects[k] as Anim & { duration: number }).duration).toBeGreaterThan(0);
  });
});
