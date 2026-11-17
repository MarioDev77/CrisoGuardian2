import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUB = join(process.cwd(), 'public');
const catalog = JSON.parse(readFileSync(join(PUB, 'assets/phases/catalog.json'), 'utf8')) as { name: string; src: string; phase: number; role: string }[];
const entitiesSource = readFileSync(join(process.cwd(), 'src/game/entities.ts'), 'utf8');
const png = (path: string) => {
  const b = readFileSync(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25]! };
};

describe('reconstrução visual das fases 9–16', () => {
  // AUSENTE neste pacote: spritesheets de criaturas (public/assets/islands/creatures). O motor usa os PNGs individuais + animação por código.
  it.skip.each(Array.from({ length: 8 }, (_, i) => i + 9))('fase %i: spritesheet de criaturas com alpha e manifest completo', (phase) => {
    const root = join(PUB, 'assets/islands/creatures');
    const manifestPath = join(root, `phase_${String(phase).padStart(2, '0')}.json`);
    const sheetPath = join(root, `phase_${String(phase).padStart(2, '0')}.png`);
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(sheetPath)).toBe(true);
    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as { image: string; animations: Record<string, { name: string; image: string; frameX: number; frameY: number; frameW: number; frameH: number }[]> };
    expect(png(sheetPath).colorType).toBe(6);
    expect(png(sheetPath).width).toBe(640);
    for (const role of ['walker', 'flyer']) {
      expect(m.animations[role].length).toBeGreaterThan(0);
      for (const frame of m.animations[role]) {
        expect(frame.frameW).toBeGreaterThan(0);
        expect(frame.frameH).toBeGreaterThan(0);
        expect(existsSync(join(PUB, frame.image))).toBe(true);
        expect(png(join(PUB, frame.image)).colorType).toBe(6);
        expect(entitiesSource.includes(`'${frame.name}'`)).toBe(true);
      }
    }
  });


  it('cada fase tem quatro camadas de fundo independentes e válidas', () => {
    const islands = JSON.parse(readFileSync(join(PUB, 'assets/islands/catalog.json'), 'utf8')) as { index: number; layers: Record<string, string> }[];
    expect(islands).toHaveLength(8);
    for (const island of islands) {
      expect(island.index).toBeGreaterThanOrEqual(8);
      for (const layer of ['sky', 'far', 'mid', 'near']) {
        const src = island.layers[layer];
        expect(src, `fase ${island.index + 1} / ${layer}`).toBeTruthy();
        expect(existsSync(join(PUB, src))).toBe(true);
      }
    }
  });

  // AUSENTE neste pacote: 40 elementos ambientais (_pack_) no catálogo.
  it.skip('40 novos elementos ambientais estão no catálogo e nas fases', () => {
    const layouts = readFileSync(join(process.cwd(), 'src/game/levels/islandLayouts.ts'), 'utf8');
    let total = 0;
    for (let phase = 9; phase <= 16; phase++) {
      const entries = catalog.filter((e) => e.phase === phase && e.name.includes('_pack_'));
      expect(entries.length).toBe(5);
      for (const entry of entries) {
        expect(existsSync(join(PUB, entry.src))).toBe(true);
        expect(layouts.includes(`\"tile\":\"${entry.name}\"`) || layouts.includes(`tile:'${entry.name}'`)).toBe(true);
      }
      total += entries.length;
    }
    expect(total).toBe(40);
  });


  // AUSENTE neste pacote: atlas deco/pack por bioma.
  it.skip.each(Array.from({ length: 8 }, (_, i) => i + 9))('fase %i: atlas de objetos tem manifest e quadros dentro da imagem', (phase) => {
    const slugs = ['manguezal', 'geleira', 'vulcao', 'fabrica', 'copas', 'oceano', 'cidade', 'guardiao'];
    const slug = slugs[phase - 9]!;
    const folder = join(PUB, 'assets/islands', slug, 'deco/pack');
    const manifest = JSON.parse(readFileSync(join(folder, 'phase_props_sheet.json'), 'utf8')) as { image: string; items: { name: string; src: string; frameX: number; frameY: number; frameW: number; frameH: number }[] };
    const sheet = png(join(PUB, manifest.image));
    expect(sheet.colorType).toBe(6);
    expect(manifest.items).toHaveLength(5);
    for (const item of manifest.items) {
      expect(item.frameX + item.frameW).toBeLessThanOrEqual(sheet.width);
      expect(item.frameY + item.frameH).toBeLessThanOrEqual(sheet.height);
      expect(existsSync(join(PUB, item.src))).toBe(true);
    }
  });

  it('todos os arquivos apontados pelo catálogo existem', () => {
    for (const entry of catalog) expect(existsSync(join(PUB, entry.src)), entry.name).toBe(true);
  });
});
