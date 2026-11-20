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
  /** Pivô normalizado do sprite (0–1): ponto de apoio para alinhar desenho e hitbox. */
  pivot?: { x: number; y: number };
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
  // inimigos exclusivos das ilhas 9 a 16 (SVG em public/assets/islands/*/enemy_*.svg, animados por código)
  fiddler: { w: 58, h: 44, hp: 3, speed: 95, scale: 0.77, fly: false, score: 150, frames: ['p09_walker'], motion: 'scuttle', noFlip: true, pivot: { x: 0.5, y: 0.9583 }},
  dragonfly: { w: 56, h: 38, hp: 2, speed: 125, scale: 0.72, fly: true, score: 160, frames: ['p09_flyer'], motion: 'hover', pivot: { x: 0.5, y: 0.4948 }},
  penguin: { w: 50, h: 62, hp: 4, speed: 60, scale: 0.56, fly: false, score: 220, frames: ['p10_walker'], motion: 'stomp', noFlip: true, pivot: { x: 0.5, y: 0.9583 }},
  snowowl: { w: 56, h: 52, hp: 3, speed: 100, scale: 0.60, fly: true, score: 200, frames: ['p10_flyer'], motion: 'hover', noFlip: true, pivot: { x: 0.5, y: 0.5052 }},
  salamander: { w: 66, h: 40, hp: 3, speed: 115, scale: 0.72, fly: false, score: 190, frames: ['p11_walker'], motion: 'slither', pivot: { x: 0.4948, y: 0.9583 }},
  ember: { w: 48, h: 56, hp: 3, speed: 110, scale: 0.60, fly: true, score: 210, frames: ['p11_flyer'], motion: 'hover', noFlip: true, pivot: { x: 0.4948, y: 0.5 }},
  sweeper: { w: 62, h: 50, hp: 5, speed: 70, scale: 0.48, fly: false, score: 230, frames: ['p12_walker'], motion: 'stomp', pivot: { x: 0.5, y: 0.9583 }},
  cogdrone: { w: 52, h: 52, hp: 3, speed: 120, scale: 0.90, fly: true, score: 210, frames: ['p12_flyer'], motion: 'hover', noFlip: true, pivot: { x: 0.5, y: 0.5 }},
  monkey: { w: 52, h: 56, hp: 3, speed: 100, scale: 0.88, fly: false, score: 190, frames: ['p13_walker'], motion: 'hop', pivot: { x: 0.5, y: 0.9583 }},
  toucan: { w: 60, h: 46, hp: 2, speed: 125, scale: 0.75, fly: true, score: 180, frames: ['p13_flyer'], motion: 'swim', pivot: { x: 0.5, y: 0.4948 }},
  urchin: { w: 56, h: 56, hp: 4, speed: 60, scale: 0.72, fly: false, score: 210, frames: ['p14_walker'], motion: 'hop', noFlip: true, pivot: { x: 0.4948, y: 0.9583 }},
  jelly: { w: 52, h: 58, hp: 3, speed: 70, scale: 0.78, fly: true, score: 200, frames: ['p14_flyer'], motion: 'swim', noFlip: true, pivot: { x: 0.4948, y: 0.5 }},
  sentinel: { w: 50, h: 70, hp: 6, speed: 65, scale: 0.54, fly: false, score: 260, frames: ['p15_walker'], motion: 'stomp', pivot: { x: 0.4948, y: 0.9583 }},
  orbdrone: { w: 56, h: 52, hp: 3, speed: 125, scale: 0.90, fly: true, score: 230, frames: ['p15_flyer'], motion: 'hover', noFlip: true, pivot: { x: 0.5, y: 0.5 }},
  golem: { w: 62, h: 66, hp: 7, speed: 55, scale: 0.54, fly: false, score: 300, frames: ['p16_walker'], motion: 'stomp', noFlip: true, pivot: { x: 0.5, y: 0.9583 }},
  wisp: { w: 52, h: 58, hp: 4, speed: 105, scale: 0.78, fly: true, score: 260, frames: ['p16_flyer'], motion: 'swim', noFlip: true, pivot: { x: 0.4948, y: 0.5 }},
  // quadros reais de animação (recortes das folhas de sprites enviadas pelo jm)
  wolf: { w: 68, h: 46, hp: 4, speed: 88, scale: 0.9, fly: false, score: 240, frames: ['p10_wolf0', 'p10_wolf1', 'p10_wolf2', 'p10_wolf3'], pivot: { x: 0.4948, y: 0.9583 }},
  eagle: { w: 64, h: 46, hp: 3, speed: 118, scale: 0.85, fly: true, score: 220, frames: ['p10_eagle0', 'p10_eagle1', 'p10_eagle2', 'p10_eagle3'], pivot: { x: 0.5, y: 0.5 }},
  boar: { w: 70, h: 48, hp: 5, speed: 82, scale: 0.9, fly: false, score: 260, frames: ['p11_boar0', 'p11_boar1', 'p11_boar2', 'p11_boar3'], pivot: { x: 0.4948, y: 0.9583 }},
  firebird: { w: 56, h: 44, hp: 2, speed: 130, scale: 0.8, fly: true, score: 190, frames: ['p11_firebird0', 'p11_firebird1', 'p11_firebird2'], pivot: { x: 0.4948, y: 0.4948 }},
  slime: { w: 56, h: 46, hp: 3, speed: 60, scale: 0.8, fly: false, score: 170, frames: ['p12_slime0', 'p12_slime1', 'p12_slime2'], motion: 'hop', noFlip: true, pivot: { x: 0.5, y: 0.9583 }},
  wasp: { w: 50, h: 46, hp: 2, speed: 135, scale: 0.8, fly: true, score: 190, frames: ['p12_wasp0', 'p12_wasp1'], pivot: { x: 0.4948, y: 0.5 }},
  // animais complementares do atlas original das ilhas 9–16 (public/assets/islands/animals), registrados como `an<fase>_m<i>`.
  an_crab: { w: 58, h: 42, hp: 2, speed: 90, scale: 0.46, fly: false, score: 140, frames: ['an9_m0', 'an9_m1', 'an9_m2'], noFlip: false },
  an_seal: { w: 58, h: 38, hp: 3, speed: 60, scale: 0.46, fly: false, score: 190, frames: ['an10_m0', 'an10_m1'] },
  an_salamander: { w: 62, h: 34, hp: 3, speed: 110, scale: 0.5, fly: false, score: 200, frames: ['an11_m0', 'an11_m1'] },
  an_bird: { w: 50, h: 42, hp: 2, speed: 120, scale: 0.42, fly: true, score: 200, frames: ['an12_m0', 'an12_m1'] },
  an_sloth: { w: 54, h: 48, hp: 4, speed: 45, scale: 0.46, fly: false, score: 210, frames: ['an13_m0', 'an13_m1', 'an13_m2', 'an13_m3'] },
  an_turtle: { w: 56, h: 36, hp: 4, speed: 50, scale: 0.46, fly: false, score: 220, frames: ['an14_m0', 'an14_m1', 'an14_m2', 'an14_m3'] },
  an_cat: { w: 54, h: 42, hp: 3, speed: 100, scale: 0.46, fly: false, score: 230, frames: ['an15_m0', 'an15_m1'] },
  an_owl: { w: 50, h: 46, hp: 3, speed: 105, scale: 0.42, fly: true, score: 250, frames: ['an16_m0', 'an16_m1', 'an16_m2', 'an16_m3'] },
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
  id: number; type: 'waste' | 'coin' | 'power'; sprite: string; value: string; taken: boolean; phase: number; spawnKey?: string;
}

export interface Bin extends Rect { id: number; sprite: string; used: boolean; pulse: number }
export interface Shot { x: number; y: number; vx: number; life: number }
export interface Sludge { x: number; y: number; vx: number; life: number; /** quadro do projétil do Grande Lixo (0–3 lixo girando, 4 bola de lodo) */ fx?: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
export interface FloatText { x: number; y: number; life: number; text: string; color: string }

export type WasteMaterial = Material;
export const WASTE_VALUE: Record<Material, number> = {
  papel: 50, plastico: 50, metal: 60, vidro: 60, fruta: 40, restos: 40, folhas: 40, bateria: 90, tinta: 90, eletronico: 100,
};

