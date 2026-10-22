import type { EnemyState } from './enemyAI';
import type { BossAttack, BossPhase, BossState } from './bossAI';
import type { EnemyKind, Material } from './levels/layouts';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Body extends Rect { vx: number; vy: number; onGround: boolean }

export interface Player extends Body {
  hp: number; maxHp: number; facing: 1 | -1; inv: number; shield: number; speed: number;
  shootT: number; shootCd: number; specialCd: number; hurtT: number; landT: number; dieT: number;
  animT: number; climbing: boolean; dropT: number; coyote: number; jumpBuf: number; specialT: number;
}

export interface EnemySpec {
  w: number; h: number; hp: number; speed: number; scale: number; fly: boolean; score: number;
  frames: string[]; chase?: string; attack?: string; die?: string; nativeLeft?: boolean;
  /** Sprite estático (sem quadros): a animação é feita por código no engine. `noFlip` = sprite de frente, nunca espelha. */
  motion?: EnemyMotion; noFlip?: boolean;
}
export type EnemyMotion = 'swim' | 'stomp' | 'sway' | 'scuttle' | 'slither' | 'hover' | 'hop';

export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  rat: { w: 60, h: 46, hp: 2, speed: 70, scale: 0.95, fly: false, score: 100, frames: ['rat_walk', 'rat_idle'], chase: 'rat_run', attack: 'rat_attack', die: 'rat_die' },
  mutant: { w: 56, h: 46, hp: 3, speed: 90, scale: 1.0, fly: false, score: 150, frames: ['rat_mutant'], die: 'rat_die' },
  armor: { w: 58, h: 50, hp: 5, speed: 60, scale: 1.0, fly: false, score: 220, frames: ['rat_armor'] },
  bat: { w: 66, h: 44, hp: 2, speed: 120, scale: 0.8, fly: true, score: 150, frames: ['rat_bat'] },
  roach: { w: 62, h: 34, hp: 2, speed: 115, scale: 0.9, fly: false, score: 120, frames: ['roach_0', 'roach_1'], die: 'roach_2' },
  fly: { w: 44, h: 38, hp: 1, speed: 90, scale: 0.85, fly: true, score: 90, frames: ['fly_0', 'fly_1'], chase: 'fly_2', die: 'fly_4' },
  spider: { w: 74, h: 44, hp: 3, speed: 85, scale: 0.85, fly: false, score: 160, frames: ['spider_0', 'spider_1'], die: 'spider_2', nativeLeft: true },
  cloud: { w: 64, h: 52, hp: 3, speed: 55, scale: 0.8, fly: true, score: 200, frames: ['cloud_0', 'cloud_1'], die: 'cloud_2' },
  // bichos de bioma: sprites estáticos do catálogo de fases (public/assets/phases/catalog.json), animados por código
  fish: { w: 62, h: 50, hp: 2, speed: 105, scale: 0.72, fly: true, score: 140, frames: ['p02_fish'], motion: 'swim', nativeLeft: true },
  robot: { w: 46, h: 62, hp: 4, speed: 65, scale: 0.72, fly: false, score: 200, frames: ['p03_robot'], motion: 'stomp', noFlip: true },
  yeti: { w: 58, h: 60, hp: 5, speed: 50, scale: 0.62, fly: false, score: 240, frames: ['p04_yeti'], motion: 'sway', nativeLeft: true },
  crab: { w: 58, h: 42, hp: 2, speed: 95, scale: 0.7, fly: false, score: 130, frames: ['p05_crab'], motion: 'scuttle', noFlip: true },
  lizard: { w: 64, h: 40, hp: 3, speed: 110, scale: 0.62, fly: false, score: 170, frames: ['p06_lizard'], motion: 'slither', nativeLeft: true },
  drone: { w: 56, h: 42, hp: 3, speed: 115, scale: 0.8, fly: true, score: 190, frames: ['p07_drone'], motion: 'hover', noFlip: true },
  alien: { w: 50, h: 54, hp: 4, speed: 80, scale: 0.85, fly: false, score: 210, frames: ['p08_alien'], motion: 'hop', noFlip: true },
};

export interface Enemy extends Body {
  id: number; kind: EnemyKind; hp: number; maxHp: number; dir: 1 | -1; minX: number; maxX: number; baseY: number;
  t: number; hurt: number; dying: number; chasing: boolean; attacking: number;
  /** Máquina de estados da IA (ver enemyAI.ts): estado atual, tempo nele, espera entre ataques, pausa e arrancada. */
  state: EnemyState; stateT: number; atkCd: number; idleT: number; dartT: number;
  /** Tempo (s) em que o bicho não persegue depois de bater num objeto ou na borda: evita ficar tremendo/virando a cada quadro. */
  turnCd: number;
}

export interface Boss extends Body {
  hp: number; maxHp: number; dir: 1 | -1; hurt: number; dying: number; active: boolean;
  /** Máquina de estados e fases (ver bossAI.ts). */
  state: BossState; stateT: number; cd: number; phase: BossPhase;
  atk: BossAttack | null; lastAtk: BossAttack | null; streak: number; aimX: number; spitLeft: number; spitT: number; combo: boolean;
}

export interface Pickup extends Rect {
  id: number; type: 'waste' | 'coin' | 'power'; sprite: string; value: string; taken: boolean; phase: number;
}

export interface Bin extends Rect { id: number; sprite: string; used: boolean; pulse: number }
export interface Shot { x: number; y: number; vx: number; life: number }
export interface Sludge { x: number; y: number; vx: number; life: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export interface FloatText { x: number; y: number; life: number; text: string; color: string }

export type WasteMaterial = Material;
export const WASTE_VALUE: Record<Material, number> = {
  papel: 50, plastico: 50, metal: 60, vidro: 60, fruta: 40, restos: 40, folhas: 40, bateria: 90, tinta: 90, eletronico: 100,
};
