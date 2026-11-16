import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(__dirname, '../public/assets/characters');
const ANIMS = ['idle','walk','run','jump','fall','land','crouch','hurt','attack','death'];
describe.each(['crisomer','quisogril'])('sprites novos %s', (folder) => {
  const meta = JSON.parse(readFileSync(resolve(root, folder, 'sprites.json'), 'utf8'));
  it('tem todas as animações, frames existentes e dentro do spritesheet', () => {
    expect(existsSync(resolve(root, folder, 'spritesheet.png'))).toBe(true);
    const sheet = readFileSync(resolve(root, folder, 'spritesheet.png')); const W = sheet.readUInt32BE(16), H = sheet.readUInt32BE(20);
    for (const a of ANIMS) {
      expect(meta.animations[a]?.frames.length, a).toBeGreaterThan(0);
      for (const f of meta.animations[a].frames) { expect(meta.frames[f], f).toBeTruthy(); const r = meta.frames[f]; expect(r.x + r.w, f).toBeLessThanOrEqual(W); expect(r.y + r.h, f).toBeLessThanOrEqual(H); }
    }
    expect(meta.animations.attack.frames).toHaveLength(4);
    expect(meta.animations.death.frames).toHaveLength(4);
  });
});
