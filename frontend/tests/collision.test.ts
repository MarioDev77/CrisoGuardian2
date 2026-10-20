import { describe, it, expect } from 'vitest';
import { moveBody, moveX, settle, sweptBox, nearestAlong, playerHurtbox, type Mover, type Surface } from '../src/game/collision';

const body = (o: Partial<Mover> = {}): Mover => ({ x: 100, y: 100, w: 40, h: 92, vx: 0, vy: 0, onGround: false, ...o });
const ground = (top = 400): Surface => ({ x: -1000, w: 5000, h: 800, solid: true, top });
const ledge = (x: number, top: number, w = 200, h = 8): Surface => ({ x, w, h, solid: false, top });
const wall = (x: number, top: number, w: number, h: number): Surface => ({ x, w, h, solid: true, top });

describe('colisão: nada atravessa, mesmo com quadros longos', () => {
  it('queda muito rápida pousa em plataforma fina (8 px) em vez de atravessá-la', () => {
    const b = body({ y: 150, vy: 4000 }); // 4000 px/s * 0,1 s = 400 px em um quadro
    moveBody(b, 0.1, [ledge(0, 300), ground(900)]);
    expect(b.onGround).toBe(true); expect(b.y + b.h).toBe(300);
  });

  it('corrida muito rápida contra parede fina (6 px) para na parede', () => {
    const b = body({ x: 0, y: 308, vx: 6000 }); // 600 px em um quadro
    moveBody(b, 0.1, [ground(400), wall(300, 100, 6, 300)]);
    expect(b.x + b.w).toBeLessThanOrEqual(300 + 0.001); expect(b.vx).toBe(0);
  });

  it('degrau baixo (12 px) é subido; muro alto (40 px) bloqueia', () => {
    const lo = body({ x: 100, y: 308, vx: 200, onGround: true });
    moveBody(lo, 0.5, [ground(400), wall(150, 388, 200, 12)]);
    expect(lo.y + lo.h).toBe(388);
    const hi = body({ x: 100, y: 308, vx: 200, onGround: true });
    moveBody(hi, 0.5, [ground(400), wall(150, 360, 200, 40)]);
    expect(hi.x + hi.w).toBeLessThanOrEqual(150 + 0.001);
  });

  it('bate a cabeça no teto e perde a velocidade vertical', () => {
    const b = body({ y: 200, vy: -2000 });
    moveBody(b, 0.1, [ground(600), wall(0, 20, 400, 60)]);
    expect(b.y).toBeGreaterThanOrEqual(80); expect(b.vy).toBe(0);
  });

  it('plataforma de mão única: sobe atravessando por baixo, mas segura quem cai; "drop" desce através', () => {
    const up = body({ y: 340, vy: -900 }); moveBody(up, 1 / 60, [ledge(0, 300), ground(900)]);
    expect(up.y).toBeLessThan(340);
    const down = body({ y: 200, vy: 200 }); moveBody(down, 1 / 60, [ledge(0, 300), ground(900)], { drop: true });
    expect(down.onGround).toBe(false);
  });

  it('pouso em quina de caixa (só 6 px de apoio) funciona', () => {
    const b = body({ x: 144, y: 300, vy: 600 }); // 40 de largura, só 6 px sobre a caixa (x 100..150); pé em 392, caixa em 400
    moveBody(b, 1 / 60, [wall(100, 400, 50, 60), ground(900)]);
    expect(b.y + b.h).toBe(400); expect(b.onGround).toBe(true); expect(b.x).toBe(144);
  });

  it('limites do mapa: não sai pela esquerda nem pela direita', () => {
    const l = body({ x: 5, vx: -5000, y: 308 }); moveBody(l, 0.1, [ground(400)], { minX: 0, maxX: 1000 }); expect(l.x).toBe(0);
    const r = body({ x: 900, vx: 5000, y: 308 }); moveBody(r, 0.1, [ground(400)], { minX: 0, maxX: 1000 }); expect(r.x + r.w).toBe(1000);
  });
});

describe('colisão: rede de segurança e empurrões', () => {
  it('settle expulsa corpo enterrado pelo lado de menor penetração', () => {
    const b = body({ x: 100, y: 330, vy: 10 }); // 22 px enterrado no chão (topo em 400)
    settle(b, [ground(400)]); expect(b.y + b.h).toBe(400); expect(b.onGround).toBe(true);
    const side = body({ x: 296, y: 308 }); settle(side, [wall(300, 100, 100, 300)]); expect(side.x + side.w).toBeLessThanOrEqual(300.001);
  });

  it('empurrão (escudo) não joga o corpo para dentro da parede', () => {
    const b = body({ x: 100, y: 308, onGround: true }); const w = wall(150, 100, 100, 300);
    moveX(b, 30, [ground(400), w]); // empurrão de 30 px, parede a 10 px de distância
    expect(b.x + b.w).toBeLessThanOrEqual(150 + 0.001);
  });
});

describe('projéteis: varredura do trajeto', () => {
  it('um tiro rápido não pula um alvo fino e acerta o mais próximo primeiro', () => {
    const sw = sweptBox(0, 400, 50, 20, 10); expect(sw.x).toBe(-20); expect(sw.w).toBe(440);
    const a = { box: { x: 300, y: 40, w: 10, h: 20 }, id: 'longe' }, b = { box: { x: 100, y: 40, w: 10, h: 20 }, id: 'perto' };
    expect(nearestAlong(0, 400, [a, b])?.id).toBe('perto');
    expect(nearestAlong(400, 0, [a, b])?.id).toBe('longe'); // tiro para a esquerda: o mais próximo é o da direita
  });
  it('hurtbox do herói fica dentro da caixa de física', () => {
    const p = { x: 10, y: 20, w: 40, h: 92 }; const h = playerHurtbox(p);
    expect(h.x).toBeGreaterThan(p.x); expect(h.x + h.w).toBeLessThan(p.x + p.w); expect(h.y + h.h).toBeLessThan(p.y + p.h);
  });
});
