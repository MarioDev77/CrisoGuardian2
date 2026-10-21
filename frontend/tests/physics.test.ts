import { describe, expect, it } from 'vitest';
import { createPlayer } from '../src/game/entities/Player';
import { stepPlayer, intersects } from '../src/game/Physics';

/**
 * `Physics.ts` / `GameCanvas.ts` pertencem ao protótipo antigo (não são usados pelo jogo atual, que roda em `engine.ts`).
 * Os testes abaixo validam o próprio protótipo e foram corrigidos: antes partiam de um jogador no ar (o salto nunca
 * acontecia) e de uma queda que já começava abaixo do chão.
 */
describe('Physics (protótipo legado)', () => {
  it('aplica movimento e salto com gravidade', () => {
    const p = createPlayer(); p.y = 406; p.onGround = true; // pés exatamente no chão (406 + 64 = 470)
    stepPlayer(p, 1 / 60, 1, true, 470, []);
    expect(p.x).toBeGreaterThan(80);
    expect(p.vy).toBeLessThan(0);
  });
  it('faz aterrissagem no chão', () => {
    const p = createPlayer(); p.y = 400; p.vy = 200; // pés em 464, acima do chão (470)
    stepPlayer(p, 0.1, 0, false, 470, []);
    expect(p.y + p.h).toBe(470);
    expect(p.onGround).toBe(true);
  });
  it('detecta interseções retangulares', () => {
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(intersects({ x: 0, y: 0, w: 2, h: 2 }, { x: 5, y: 5, w: 2, h: 2 })).toBe(false);
  });
});
