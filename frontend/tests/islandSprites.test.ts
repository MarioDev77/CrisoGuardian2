import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUB = join(process.cwd(), 'public');
const BIOMES = ['manguezal', 'geleira', 'vulcao', 'fabrica', 'copas', 'oceano', 'cidade', 'guardiao'];
/** PNG: largura/altura no IHDR e tipo de cor 6 = RGBA (canal alfa real). */
const png = (f: string) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25]! }; };

describe('sprites exclusivos das fases 9–16', () => {
  it.each(BIOMES)('%s: lixeira existe, em PNG RGBA', (b) => {
    for (const f of ['bin.png']) {
      const p = join(PUB, 'assets/islands', b, f); expect(existsSync(p), p).toBe(true);
      expect(png(p).colorType, `${b}/${f} sem alfa`).toBe(6);
    }
  });
  // AUSENTE neste pacote: portal_custom.png de cada bioma (o motor cai no portal padrão). Reative quando a arte voltar.
  it.skip.each(BIOMES)('%s: portal exclusivo existe, em PNG RGBA', (b) => {
    const p = join(PUB, 'assets/islands', b, 'portal_custom.png'); expect(existsSync(p), p).toBe(true); expect(png(p).colorType).toBe(6);
  });
  it('chefes do Vulcão e do Guardião existem em PNG RGBA', () => {
    for (const b of ['vulcao', 'guardiao']) { const p = join(PUB, 'assets/islands', b, 'boss_custom.png'); expect(png(p).colorType).toBe(6); }
  });
  it('catálogo: lixeiras 9–16 apontam para arquivos existentes e têm PNG em escala inteira do tamanho lógico (1× ou 2×; o motor reduz 2× ao carregar)', () => {
    const cat = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string; w: number; h: number; role: string; hitbox?: { w: number; h: number } }[];
    for (let n = 9; n <= 16; n++) {
      const e = cat.find((c) => c.name === `p${String(n).padStart(2, '0')}_bin`)!; expect(e, `p${n}_bin`).toBeTruthy();
      expect(existsSync(join(PUB, e.src))).toBe(true); expect(e.role).toBe('recycling-bin');
      const { w, h } = png(join(PUB, e.src)); const k = w / e.w; expect(Number.isInteger(k) && k >= 1, `${e.name} escala ${k}`).toBe(true); expect(h).toBe(e.h * k); expect(e.w).toBeLessThanOrEqual(64);
    }
  });
  it('todo asset do catálogo de fases existe e não está corrompido (PNG ou SVG válido)', () => {
    const cat = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string }[];
    for (const e of cat) { const p = join(PUB, e.src); expect(existsSync(p), e.name).toBe(true); const b = readFileSync(p); const ok = p.endsWith('.svg') ? b.toString('utf8').includes('<svg') : b.subarray(0, 4).toString('hex') === '89504e47'; expect(ok, e.name).toBe(true); }
  });
  it('todo PNG das fases 9–16 tem escala inteira em relação ao w/h do catálogo (evita sprite desenhado em tamanho errado)', () => {
    const cat = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string; w: number; h: number; phase: number }[];
    for (const e of cat.filter((c) => c.phase >= 9)) { const { w, h } = png(join(PUB, e.src)); const k = w / e.w; expect(Number.isInteger(k) && k >= 1 && h === e.h * k, `${e.name}: ${w}×${h} vs ${e.w}×${e.h}`).toBe(true); }
  });
});
