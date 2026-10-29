/**
 * Hand-built layouts for the 8 missions. All coordinates are in "scene pixels" of the official
 * phase sprite (357 px wide, y measured from the top of the scene art). The engine scales them
 * and mirrors every second screen so the painted backdrop and the playable pieces stay aligned.
 */
export type SurfaceKind = 'ground' | 'plat' | 'bridge' | 'crates';
export interface Surface { x: number; y: number; w: number; kind: SurfaceKind; tile: string; rows?: number }
export interface Ladder { x: number; top: number; bottom: number }
export interface Decor { x: number; y: number; tile: string; scale?: number; hazard?: boolean }
export type EnemyKind = 'rat' | 'mutant' | 'armor' | 'bat' | 'roach' | 'fly' | 'spider' | 'cloud'
  | 'fish' | 'robot' | 'yeti' | 'crab' | 'lizard' | 'drone' | 'alien';
export type Material = 'papel' | 'plastico' | 'metal' | 'vidro' | 'fruta' | 'restos' | 'folhas' | 'bateria' | 'tinta' | 'eletronico';

export interface LayoutPart { surfaces: Surface[]; ladders: Ladder[]; decor: Decor[] }
export interface Layout {
  id: string;
  name: string;
  biome: string;
  objective: string;
  sceneH: number;
  screens: number;
  surfaces: Surface[];
  ladders: Ladder[];
  decor: Decor[];
  walkers: EnemyKind[];
  flyers: EnemyKind[];
  materials: Material[];
  bin: string;
  boss?: boolean;
  /** Trechos A, B, C… do cenário contínuo (um por tela, sem espelhar). Se existir, substitui surfaces/ladders/decor. */
  parts?: LayoutPart[];
  /** Painted pieces drawn above ground to hide transitions, optional */
  accent: string;
}

import { islandLayouts } from './islandLayouts';
export const SCENE_W = 357;

export const layouts: Layout[] = [
  {
    id: 'forest-01', name: 'Floresta Viva', biome: 'Floresta com cachoeiras',
    objective: 'Limpe a floresta e alcance o portal de reciclagem.', sceneH: 254, screens: 5, accent: '#59e06a',
    surfaces: [
      { x: 0, y: 200, w: 142, kind: 'ground', tile: 'p01_ground' },
      { x: 142, y: 190, w: 66, kind: 'ground', tile: 'p01_ground' },
      { x: 208, y: 222, w: 149, kind: 'ground', tile: 'p01_ground' },
      { x: 70, y: 150, w: 72, kind: 'bridge', tile: 'p01_bridge' },
      { x: 198, y: 160, w: 64, kind: 'plat', tile: 'p01_ledge' },
      { x: 262, y: 174, w: 95, kind: 'plat', tile: 'p01_ledge' },
    ],
    ladders: [{ x: 338, top: 174, bottom: 222 }],
    decor: [{ x: 128, y: 200, tile: 'f01_rocks' }],
    walkers: ['rat'], flyers: [], materials: ['papel', 'plastico', 'metal', 'vidro', 'fruta', 'folhas'], bin: 'p01_bin',
  },
  {
    id: 'river-02', name: 'Rio Limpo', biome: 'Margens e cachoeiras',
    objective: 'Atravesse o rio pulando entre as plataformas e limpe a água.', sceneH: 254, screens: 5, accent: '#54e6d0',
    surfaces: [
      { x: 0, y: 178, w: 58, kind: 'ground', tile: 'p02_ground' },
      { x: 55, y: 200, w: 54, kind: 'plat', tile: 'p02_ledge' },
      { x: 133, y: 200, w: 52, kind: 'plat', tile: 'p02_ledge' },
      { x: 216, y: 200, w: 54, kind: 'plat', tile: 'p02_ledge' },
      { x: 92, y: 244, w: 52, kind: 'plat', tile: 'p02_ledge' },
      { x: 205, y: 232, w: 88, kind: 'bridge', tile: 'p02_bridge' },
      { x: 290, y: 228, w: 67, kind: 'ground', tile: 'p02_ground' },
    ],
    ladders: [],
    decor: [],
    walkers: ['mutant'], flyers: ['fly', 'fish'], materials: ['plastico', 'vidro', 'metal', 'papel', 'restos'], bin: 'p02_bin',
  },
  {
    id: 'city-03', name: 'Cidade Verde', biome: 'Parque urbano',
    objective: 'Recolha os resíduos da cidade e restaure o parque.', sceneH: 254, screens: 5, accent: '#72e58b',
    surfaces: [
      { x: 0, y: 226, w: 357, kind: 'ground', tile: 'p03_ground' },
      { x: 8, y: 178, w: 66, kind: 'plat', tile: 'p03_ledge' },
      { x: 106, y: 182, w: 104, kind: 'plat', tile: 'p03_ledge' },
      { x: 232, y: 150, w: 84, kind: 'plat', tile: 'p03_ledge' },
      { x: 150, y: 226, w: 26, kind: 'crates', tile: 'p03_crate', rows: 1 },
      { x: 288, y: 226, w: 28, kind: 'crates', tile: 'p03_crate', rows: 2 },
    ],
    ladders: [{ x: 322, top: 150, bottom: 226 }],
    decor: [{ x: 90, y: 226, tile: 'p03_cone', scale: 1 }, { x: 250, y: 226, tile: 'f03_totem' }],
    walkers: ['rat', 'roach', 'robot'], flyers: [], materials: ['papel', 'plastico', 'metal', 'vidro', 'bateria', 'tinta'], bin: 'p03_bin',
  },
  {
    id: 'mountain-04', name: 'Montanha', biome: 'Cume nevado',
    objective: 'Cruze a ponte de corda, suba as torres e alcance o cume.', sceneH: 254, screens: 5, accent: '#aee8ff',
    surfaces: [
      { x: 0, y: 190, w: 90, kind: 'ground', tile: 'p04_ground' },
      { x: 90, y: 226, w: 120, kind: 'ground', tile: 'p04_ground' },
      { x: 210, y: 230, w: 147, kind: 'ground', tile: 'p04_ground' },
      { x: 98, y: 148, w: 156, kind: 'bridge', tile: 'p04_bridge' },
      { x: 290, y: 168, w: 67, kind: 'plat', tile: 'p04_ledge' },
    ],
    ladders: [{ x: 222, top: 148, bottom: 228 }, { x: 304, top: 168, bottom: 230 }],
    decor: [],
    walkers: ['spider', 'rat', 'yeti'], flyers: ['bat'], materials: ['plastico', 'metal', 'vidro', 'papel', 'bateria'], bin: 'p04_bin',
  },
  {
    id: 'beach-05', name: 'Praia Limpa', biome: 'Costa tropical',
    objective: 'Retire o lixo da areia e proteja a vida marinha.', sceneH: 238, screens: 5, accent: '#ffd36b',
    surfaces: [
      { x: 0, y: 205, w: 130, kind: 'ground', tile: 'p05_ground' },
      { x: 92, y: 172, w: 48, kind: 'plat', tile: 'p05_ledge' },
      { x: 36, y: 140, w: 104, kind: 'plat', tile: 'p05_ledge' },
      { x: 150, y: 190, w: 48, kind: 'plat', tile: 'p05_ledge' },
      { x: 205, y: 222, w: 52, kind: 'bridge', tile: 'p05_bridge' },
      { x: 262, y: 222, w: 40, kind: 'bridge', tile: 'p05_bridge' },
      { x: 300, y: 205, w: 57, kind: 'ground', tile: 'p05_ground' },
    ],
    ladders: [],
    decor: [{ x: 70, y: 140, tile: 'f05_hut' }, { x: 24, y: 205, tile: 'p05_ring' }],
    walkers: ['roach', 'crab'], flyers: ['fly'], materials: ['plastico', 'vidro', 'metal', 'papel', 'restos'], bin: 'p05_bin',
  },
  {
    id: 'desert-06', name: 'Deserto', biome: 'Cânions e cactos',
    objective: 'Atravesse os cânions, cuidado com os cactos e recolha o lixo.', sceneH: 238, screens: 5, accent: '#ffb05a',
    surfaces: [
      { x: 0, y: 212, w: 120, kind: 'ground', tile: 'p06_ground' },
      { x: 120, y: 204, w: 100, kind: 'ground', tile: 'p06_ground' },
      { x: 220, y: 210, w: 137, kind: 'ground', tile: 'p06_ground' },
      { x: 72, y: 168, w: 96, kind: 'plat', tile: 'p06_ledge' },
      { x: 190, y: 158, w: 82, kind: 'plat', tile: 'p06_ledge' },
      { x: 282, y: 184, w: 60, kind: 'plat', tile: 'p06_ledge' },
      { x: 14, y: 126, w: 62, kind: 'plat', tile: 'p06_ledge' },
      { x: 300, y: 210, w: 30, kind: 'crates', tile: 'p06_crate', rows: 1 },
    ],
    ladders: [],
    decor: [{ x: 178, y: 204, tile: 'p06_cactus', hazard: true }],
    walkers: ['spider', 'roach', 'lizard'], flyers: [], materials: ['plastico', 'metal', 'vidro', 'papel', 'tinta'], bin: 'p06_bin',
  },
  {
    id: 'metro-07', name: 'Metrópole Sustentável', biome: 'Centro metropolitano',
    objective: 'Reative o corredor verde recuperando os materiais da cidade.', sceneH: 238, screens: 5, accent: '#7cf0a4',
    surfaces: [
      { x: 0, y: 222, w: 357, kind: 'ground', tile: 'p07_ground' },
      { x: 15, y: 186, w: 95, kind: 'plat', tile: 'p07_ledge' },
      { x: 140, y: 168, w: 62, kind: 'plat', tile: 'p07_ledge' },
      { x: 228, y: 148, w: 72, kind: 'plat', tile: 'p07_ledge' },
      { x: 304, y: 186, w: 53, kind: 'plat', tile: 'p07_ledge' },
      { x: 0, y: 132, w: 66, kind: 'plat', tile: 'p07_ledge' },
    ],
    ladders: [{ x: 124, top: 168, bottom: 222 }],
    decor: [],
    walkers: ['armor', 'rat'], flyers: ['cloud', 'drone'], materials: ['plastico', 'metal', 'vidro', 'eletronico', 'bateria'], bin: 'p07_bin',
  },
  {
    id: 'planet-08', name: 'Planeta Crisoverde', biome: 'Eco-mundo futurista',
    objective: 'Derrote o Monstro do Lixão e restaure o planeta!', sceneH: 238, screens: 5, accent: '#9cffb5', boss: true,
    surfaces: [
      { x: 0, y: 192, w: 357, kind: 'ground', tile: 'p08_ground' },
      { x: 14, y: 148, w: 62, kind: 'plat', tile: 'p08_ledge' },
      { x: 84, y: 116, w: 62, kind: 'plat', tile: 'p08_ledge' },
      { x: 12, y: 84, w: 74, kind: 'plat', tile: 'p08_ledge' },
      { x: 250, y: 152, w: 62, kind: 'plat', tile: 'p08_ledge' },
      { x: 256, y: 100, w: 82, kind: 'plat', tile: 'p08_ledge' },
    ],
    ladders: [],
    decor: [],
    walkers: ['mutant', 'armor', 'alien'], flyers: ['cloud', 'bat'], materials: ['plastico', 'metal', 'vidro', 'eletronico', 'bateria', 'tinta'], bin: 'p08_bin',
  },
  ...islandLayouts,
];
