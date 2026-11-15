import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const PUB = join(process.cwd(), 'public');
type F = { x: number; y: number; w: number; h: number; ax: number; by: number };
const meta = JSON.parse(readFileSync(join(PUB, 'assets/islands/animals/animals.json'), 'utf8')) as { image: string; animals: Record<string, { idle: F[]; move: F[] }> };
describe('animais ambientais 9–16', () => {
  it('sheet existe, é PNG RGBA e cobre as 8 fases', () => {
    const p = join(PUB, meta.image); expect(existsSync(p)).toBe(true);
    const b = readFileSync(p); expect(b[25]).toBe(6);
    expect(Object.keys(meta.animals).sort()).toEqual(['10', '11', '12', '13', '14', '15', '16', '9'].sort());
  });
  it('todo quadro cabe na sheet e tem pés dentro do quadro', () => {
    const b = readFileSync(join(PUB, meta.image)); const W = b.readUInt32BE(16), H = b.readUInt32BE(20);
    for (const [k, a] of Object.entries(meta.animals)) for (const f of [...a.idle, ...a.move]) {
      expect(f.x + f.w, k).toBeLessThanOrEqual(W); expect(f.y + f.h, k).toBeLessThanOrEqual(H);
      expect(f.by).toBeGreaterThan(40); expect(f.by).toBeLessThan(f.h); expect(f.ax).toBeGreaterThan(20);
    }
    for (const a of Object.values(meta.animals)) { expect(a.idle.length).toBeGreaterThan(0); expect(a.move.length).toBeGreaterThan(0); }
  });
});
