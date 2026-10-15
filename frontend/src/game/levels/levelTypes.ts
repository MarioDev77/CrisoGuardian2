export type Rect = { x: number; y: number; w: number; h: number };
export type Material = 'papel' | 'plastico' | 'metal' | 'vidro';
export type SegmentKind = 'plain' | 'jump' | 'platform' | 'combat' | 'rest' | 'checkpoint' | 'finish';
export interface Collectible extends Rect { id: string; material: Material; collected: boolean }
export interface EnemySpawn extends Rect { id: string; kind: 'rat' | 'roach'; hp: number; minX: number; maxX: number }
export interface LevelSegment { id: string; kind: SegmentKind; x: number; width: number; groundY: number; platforms: Rect[]; collectibles: Collectible[]; enemies: EnemySpawn[]; checkpoint?: boolean }
export interface LevelConfig { id: string; name: string; biome: string; worldWidth: number; viewportHeight: number; groundY: number; segmentWidth: number; maxJumpHeight: number; maxJumpDistance: number; segments: SegmentKind[]; enemyKinds: EnemySpawn['kind'][]; materials: Material[]; palette: { sky: string; canopy: string; ground: string; accent: string }; objective: string }
export interface GeneratedLevel { seed: number; width: number; groundY: number; segments: LevelSegment[]; collectibles: Collectible[]; enemies: EnemySpawn[]; finishX: number; checkpointX: number }
