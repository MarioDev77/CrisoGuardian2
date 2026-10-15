export interface Player { x:number; y:number; vx:number; vy:number; w:number; h:number; facing:1|-1; onGround:boolean; hp:number; invulnerable:number; score:number; materials:number; shotCooldown:number; animTime:number }
export function createPlayer(): Player { return {x:80,y:390,vx:0,vy:0,w:42,h:64,facing:1,onGround:false,hp:3,invulnerable:0,score:0,materials:0,shotCooldown:0,animTime:0}; }
