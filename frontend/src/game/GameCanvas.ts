import { Camera } from './Camera';
import { AssetLoader } from './AssetLoader';
import { createPlayer, type Player } from './entities/Player';
import { createEnemy, type Enemy } from './entities/Enemy';
import { stepPlayer, intersects } from './Physics';
import { forestConfig } from './levels/forestConfig';
import type { LevelConfig } from './levels/levelTypes';
import { generateLevel } from './procedural/LevelGenerator';
import type { GeneratedLevel } from './levels/levelTypes';
export type GameSnapshot={hp:number;score:number;materials:number;total:number;seed:number;paused:boolean;won:boolean;lost:boolean};
export type GameCallbacks={onUpdate:(snapshot:GameSnapshot)=>void;onVictory:()=>void;onDefeat:()=>void};
type Controls={left:boolean;right:boolean;jump:boolean;shoot:boolean};
export class GameCanvas {
 private ctx:CanvasRenderingContext2D; private raf=0; private last=0; private running=false; private paused=false; private won=false; private lost=false; private player:Player=createPlayer(); private camera=new Camera(); private assets=new AssetLoader(); private level:GeneratedLevel; private enemies:Enemy[]=[]; private shots:{x:number;y:number;vx:number;life:number}[]=[]; private particles:{x:number;y:number;life:number;color:string}[]=[]; private controls:Controls={left:false,right:false,jump:false,shoot:false}; private jumpWasDown=false; private callbacks:GameCallbacks; private seed:number; private viewportWidth=960; private viewportHeight=600; private lastUi=0;
 constructor(private canvas:HTMLCanvasElement,callbacks:GameCallbacks,seed=Math.floor(Math.random()*999999)+1, private config:LevelConfig=forestConfig){const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D indisponível');this.ctx=ctx;this.callbacks=callbacks;this.seed=seed;this.level=generateLevel(this.config,seed);this.enemies=this.level.enemies.map(createEnemy);this.resize();this.assets.preload(['/assets/characters/crisoman/crisoman-cutout.png','/assets/backgrounds/11_cenarios_fundo.png','/assets/collectibles/07_lixo_coletaveis_powerups.png']);}
 start():void{if(this.running)return;this.running=true;this.last=performance.now();this.raf=requestAnimationFrame(this.frame);}
 destroy():void{this.running=false;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resize);}
 attachResize():void{window.addEventListener('resize',this.resize);}
 setControl(key:keyof Controls,value:boolean):void{this.controls[key]=value;}
 setPaused(value:boolean):void{this.paused=value;this.emit();}
 getSnapshot():GameSnapshot{return {hp:this.player.hp,score:this.player.score,materials:this.player.materials,total:this.level.collectibles.length,seed:this.seed,paused:this.paused,won:this.won,lost:this.lost};}
 restart(sameSeed=true):void{this.seed=sameSeed?this.seed:Math.floor(Math.random()*999999)+1;this.level=generateLevel(this.config,this.seed);this.player=createPlayer();this.enemies=this.level.enemies.map(createEnemy);this.shots=[];this.particles=[];this.paused=false;this.won=false;this.lost=false;this.jumpWasDown=false;this.emit();}
 private resize=():void=>{const rect=this.canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));const scale=Math.min(rect.width/960,rect.height/600);const offsetX=(rect.width-960*scale)/2;const offsetY=(rect.height-600*scale)/2;this.viewportWidth=960;this.viewportHeight=600;this.ctx.setTransform(dpr*scale,0,0,dpr*scale,offsetX*dpr,offsetY*dpr);};
 private frame=(now:number):void=>{if(!this.running)return;const dt=Math.min((now-this.last)/1000,.033);this.last=now;if(!this.paused&&!this.won&&!this.lost)this.update(dt);this.render();this.raf=requestAnimationFrame(this.frame);};
 private update(dt:number):void{
  this.player.animTime+=dt;if(this.player.invulnerable>0)this.player.invulnerable-=dt;if(this.player.shotCooldown>0)this.player.shotCooldown-=dt;
  const axis=Number(this.controls.right)-Number(this.controls.left),jump=this.controls.jump&&!this.jumpWasDown;this.jumpWasDown=this.controls.jump;
  const visiblePlatforms=this.level.segments.flatMap(s=>s.platforms).filter(p=>p.x<this.camera.x+this.viewportWidth+100&&p.x+p.w>this.camera.x-100);
  stepPlayer(this.player,dt,axis,jump,this.level.groundY,visiblePlatforms);
  if(this.controls.shoot&&this.player.shotCooldown<=0){this.shots.push({x:this.player.x+(this.player.facing===1?this.player.w:0),y:this.player.y+this.player.h*.48,vx:this.player.facing*520,life:1.4});this.player.shotCooldown=.28;}
  for(const shot of this.shots){shot.x+=shot.vx*dt;shot.life-=dt;for(const e of this.enemies){if(e.alive&&intersects({x:shot.x-5,y:shot.y-4,w:10,h:8},e)){e.hp--;e.hurt=.12;shot.life=0;this.burst(e.x+e.w/2,e.y+e.h/2,'#b8ff70');if(e.hp<=0){e.alive=false;this.player.score+=100;}}}}
  this.shots=this.shots.filter(s=>s.life>0&&s.x>this.camera.x-100&&s.x<this.camera.x+this.viewportWidth+100);
  for(const e of this.enemies){if(!e.alive)continue;if(e.hurt>0)e.hurt-=dt;e.x+=e.vx*dt;if(e.x<e.minX||e.x+e.w>e.maxX)e.vx*=-1;
   if(this.player.invulnerable<=0&&intersects(this.player,e)){this.player.hp--;this.player.invulnerable=1.15;this.player.vx=this.player.x<e.x?-210:210;this.player.vy=-220;this.burst(this.player.x+20,this.player.y+20,'#ffb347');if(this.player.hp<=0){this.lost=true;this.callbacks.onDefeat();}}
  }
  for(const c of this.level.collectibles){if(!c.collected&&intersects(this.player,c)){c.collected=true;this.player.materials++;this.player.score+=25;this.burst(c.x,c.y,'#d8ff8c');}}
  this.particles.forEach(p=>p.life-=dt);this.particles=this.particles.filter(p=>p.life>0);
  if(this.player.x>=this.level.finishX){this.won=true;this.callbacks.onVictory();}
  this.camera.update(this.player.x,this.viewportWidth,this.level.width);
  if(performance.now()-this.lastUi>100){this.emit();this.lastUi=performance.now();}
 }
 private burst(x:number,y:number,color:string):void{for(let i=0;i<5;i++)this.particles.push({x:x+(Math.random()-.5)*24,y:y+(Math.random()-.5)*20,life:.35+Math.random()*.25,color});if(this.particles.length>100)this.particles.splice(0,this.particles.length-100);}
 private emit():void{this.callbacks.onUpdate(this.getSnapshot());}
 private render():void{const c=this.ctx,w=this.viewportWidth,h=this.viewportHeight,camera=this.camera.x;c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#7bcf9a');sky.addColorStop(.65,'#b8e6a1');sky.addColorStop(1,'#d7e9a4');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // Distant forest layers with parallax.
  for(let layer=0;layer<3;layer++){const spacing=130+layer*36,parallax=.12+layer*.12;for(let x=-spacing;x<w+spacing;x+=spacing){const worldX=x-(camera*parallax%spacing);const y=160+layer*50+Math.sin((x+layer*13)*.035)*18;c.fillStyle=[this.config.palette.canopy,this.config.palette.accent,this.config.palette.ground][layer]!;c.beginPath();c.arc(worldX,y,52+layer*9,0,Math.PI*2);c.fill();c.fillRect(worldX-12,y,24,h-y);}}
  // Ground and grassy edge.
  c.fillStyle=this.config.palette.ground;c.fillRect(0,this.level.groundY,w,h-this.level.groundY);c.fillStyle=this.config.palette.accent;c.fillRect(0,this.level.groundY,w,14);c.fillStyle='#a4d75a';for(let x=0;x<w;x+=18){const xx=x-(camera%18);c.fillRect(xx,this.level.groundY-4,9,4);}
  for(const seg of this.level.segments){if(seg.x+seg.width<camera-50||seg.x>camera+w+50)continue;for(const p of seg.platforms){c.fillStyle=this.config.palette.ground;c.fillRect(p.x-camera,p.y,p.w,p.h);c.fillStyle=this.config.palette.accent;c.fillRect(p.x-camera,p.y,p.w,6);}if(seg.checkpoint){c.fillStyle='#f1d26d';c.fillRect(seg.x-camera+180,this.level.groundY-76,5,76);c.fillStyle='#76e05d';c.fillRect(seg.x-camera+185,this.level.groundY-76,36,22);}}
  // Trees and trunks add depth to the playable terrain.
  for(let x=Math.floor(camera/310)*310;x<camera+w+310;x+=310){const sx=x-camera+45;c.fillStyle='#62432b';c.fillRect(sx,this.level.groundY-95,22,95);c.fillStyle=this.config.palette.canopy;c.beginPath();c.arc(sx+11,this.level.groundY-112,53,0,Math.PI*2);c.fill();c.fillStyle=this.config.palette.accent;c.beginPath();c.arc(sx-15,this.level.groundY-132,29,0,Math.PI*2);c.fill();}
  // Collectibles.
  for(const item of this.level.collectibles){if(item.collected||item.x<camera-40||item.x>camera+w+40)continue;const x=item.x-camera;c.fillStyle=({papel:'#e8e8c8',plastico:'#65c9ef',metal:'#d7dce1',vidro:'#72df9d'} as const)[item.material];c.strokeStyle='#16452e';c.lineWidth=2;c.beginPath();c.roundRect(x,item.y,item.w,item.h,4);c.fill();c.stroke();c.fillStyle='#24563b';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(({papel:'P',plastico:'P',metal:'M',vidro:'V'} as const)[item.material],x+12,item.y+16);}
  // Enemies.
  for(const e of this.enemies){if(!e.alive||e.x<camera-60||e.x>camera+w+60)continue;const x=e.x-camera;c.fillStyle=e.hurt>0?'#fff':e.kind==='rat'?'#7b6b69':'#6b3e26';c.beginPath();c.ellipse(x+e.w/2,e.y+e.h*.65,e.w*.48,e.h*.34,0,0,Math.PI*2);c.fill();c.fillStyle='#f5f0d5';c.fillRect(x+8,e.y+11,5,5);c.fillRect(x+21,e.y+11,5,5);c.fillStyle='#18241a';c.fillRect(x+10,e.y+12,2,3);c.fillRect(x+23,e.y+12,2,3);c.fillStyle='#b7ff77';c.fillRect(x,e.y-7,e.w*(e.hp/2),4);}
  // Player uses a cut-out from the supplied official Crisoman reference.
  const sprite=this.assets.get('/assets/characters/crisoman/crisoman-cutout.png');const px=this.player.x-camera,py=this.player.y;if(sprite){c.save();if(this.player.facing<0){c.translate(px+this.player.w,0);c.scale(-1,1);c.drawImage(sprite,0,0,sprite.width,sprite.height,0,py,this.player.w,this.player.h);}else c.drawImage(sprite,px,py,this.player.w,this.player.h);c.restore();}else{c.fillStyle='#31c85a';c.fillRect(px,py,this.player.w,this.player.h);}
  if(this.player.invulnerable>0&&Math.floor(this.player.invulnerable*14)%2===0){c.strokeStyle='#e9ffb8';c.lineWidth=3;c.strokeRect(px-3,py-3,this.player.w+6,this.player.h+6);}
  for(const shot of this.shots){c.fillStyle='#c4ff63';c.beginPath();c.ellipse(shot.x-camera,shot.y,8,4,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.fillRect(shot.x-camera-3,shot.y-1,6,2);}
  for(const p of this.particles){c.globalAlpha=Math.max(0,p.life*2);c.fillStyle=p.color;c.fillRect(p.x-camera,p.y,4,4);c.globalAlpha=1;}
  // Exit portal is always clearly identifiable.
  const fx=this.level.finishX-camera;if(fx>-80&&fx<w+80){c.fillStyle='#0b5133';c.fillRect(fx,this.level.groundY-100,12,100);c.strokeStyle='#a5ff6a';c.lineWidth=5;c.beginPath();c.ellipse(fx+28,this.level.groundY-45,28,46,0,0,Math.PI*2);c.stroke();c.fillStyle='#d7ff9d';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('FIM',fx+28,this.level.groundY-103);}
  // Seed and key hints.
  c.fillStyle='rgba(5,35,22,.62)';c.fillRect(12,h-35,Math.min(w-24,450),24);c.fillStyle='#efffe7';c.font='12px system-ui';c.textAlign='left';c.fillText(`${this.config.name.toUpperCase()} · SEED ${this.seed}  •  A/D mover  •  Espaço pular  •  J atirar`,22,h-19);
 }
}
