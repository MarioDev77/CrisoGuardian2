import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUB = join(process.cwd(), 'public');
const BIOMES = ['manguezal', 'geleira', 'vulcao', 'fabrica', 'copas', 'oceano', 'cidade', 'guardiao'];
/** PNG: largura/altura no IHDR e tipo de cor 6 = RGBA (canal alfa real). */
const png = (f: string) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25]! }; };

describe('sprites exclusivos das fases 9–16', () => {
  it.each(BIOMES)('%s: lixeira e portal existem, em PNG RGBA', (b) => {
    for (const f of ['bin_custom.png', 'portal_custom.png']) {
      const p = join(PUB, 'assets/islands', b, f); expect(existsSync(p), p).toBe(true);
      expect(png(p).colorType, `${b}/${f} sem alfa`).toBe(6);
    }
  });
  it('chefes do Vulcão e do Guardião existem em PNG RGBA', () => {
    for (const b of ['vulcao', 'guardiao']) { const p = join(PUB, 'assets/islands', b, 'boss_custom.png'); expect(png(p).colorType).toBe(6); }
  });
  it('catálogo: lixeiras 9–16 apontam para arquivos existentes e têm hitbox menor que a arte (o motor reduz para ~48 px)', () => {
    const cat = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string; w: number; h: number; role: string; hitbox?: { w: number; h: number } }[];
    for (let n = 9; n <= 16; n++) {
      const e = cat.find((c) => c.name === `p${String(n).padStart(2, '0')}_bin`)!; expect(e, `p${n}_bin`).toBeTruthy();
      expect(existsSync(join(PUB, e.src))).toBe(true); expect(e.role).toBe('recycling-bin');
      const { w, h } = png(join(PUB, e.src)); expect([w, h]).toEqual([e.w, e.h]); expect(e.hitbox!.w).toBeLessThan(e.w / 1.5);
    }
  });
  it('todo asset do catálogo de fases existe e não está corrompido (PNG ou SVG válido)', () => {
    const cat = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string }[];
    for (const e of cat) { const p = join(PUB, e.src); expect(existsSync(p), e.name).toBe(true); const b = readFileSync(p); const ok = p.endsWith('.svg') ? b.toString('utf8').includes('<svg') : b.subarray(0, 4).toString('hex') === '89504e47'; expect(ok, e.name).toBe(true); }
  });
});
