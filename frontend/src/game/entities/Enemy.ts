import type { EnemySpawn } from '../levels/levelTypes';
export interface Enemy extends EnemySpawn { vx:number; alive:boolean; hurt:number }
export function createEnemy(spawn:EnemySpawn):Enemy{return {...spawn,vx:spawn.kind==='rat'?42:-34,alive:true,hurt:0};}
