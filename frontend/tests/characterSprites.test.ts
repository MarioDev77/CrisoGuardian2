import { describe, expect, it } from 'vitest';
import { playerSpriteName } from '../src/game/engine';

describe('identidade visual dos personagens',()=>{
  it('mantém Crisoman no atlas original em todas as poses, mesmo se houver frame moderno',()=>{
    expect(playerSpriteName('crisoman','p_idle_0','crisoman_skin-crisoman-verde_idle_00')).toBe('p_idle_0');
    expect(playerSpriteName('crisoman','p_shoot_1',null)).toBe('p_shoot_1');
    expect(playerSpriteName('crisoman','p_jump_3','crisoman_skin-crisoman-verde_jump_00')).toBe('p_jump_3');
  });
  it('usa o sprite próprio de Crisogirl quando existe',()=>{
    expect(playerSpriteName('crisogirl','p_idle_0','crisogirl_skin-crisogirl-rosa_idle_00')).toBe('crisogirl_skin-crisogirl-rosa_idle_00');
    expect(playerSpriteName('crisogirl','p_hurt_0',null)).toBe('p_hurt_0');
  });
});
