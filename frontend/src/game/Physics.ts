import type { Player } from './entities/Player';
import type { Rect } from './levels/levelTypes';
export const GRAVITY=1500, MOVE_SPEED=250, JUMP_SPEED=590;
export function intersects(a:Rect,b:Rect):boolean{return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
export function stepPlayer(p:Player,dt:number,axis:number,jump:boolean,groundY:number,platforms:Rect[]):void{
 p.vx=axis*MOVE_SPEED;if(axis!==0)p.facing=axis>0?1:-1;if(jump&&p.onGround){p.vy=-JUMP_SPEED;p.onGround=false;}
 p.vy+=GRAVITY*dt;p.x=Math.max(0,p.x+p.vx*dt);const oldBottom=p.y+p.h;p.y+=p.vy*dt;p.onGround=false;
 if(p.vy>=0){if(oldBottom<=groundY&&p.y+p.h>=groundY){p.y=groundY-p.h;p.vy=0;p.onGround=true;}for(const plat of platforms){if(oldBottom<=plat.y+5&&p.y+p.h>=plat.y&&p.x+p.w>plat.x&&p.x<plat.x+plat.w){p.y=plat.y-p.h;p.vy=0;p.onGround=true;}}}
}
