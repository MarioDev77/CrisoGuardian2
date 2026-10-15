import { SeededRandom } from './SeededRandom';
import { validateLevel } from './SegmentValidator';
import type { GeneratedLevel, LevelConfig, LevelSegment, Material } from '../levels/levelTypes';
export function generateLevel(config: LevelConfig, seed: number): GeneratedLevel {
  const rng = new SeededRandom(seed); const segments: LevelSegment[] = []; const count = Math.ceil(config.worldWidth/config.segmentWidth);
  for (let i=0;i<count;i++) {
    const x=i*config.segmentWidth, width=Math.min(config.segmentWidth,config.worldWidth-x);
    const kind = i===count-1 ? 'finish' : i===0 ? 'plain' : i===Math.floor(count*.58) ? 'checkpoint' : rng.pick(config.segments);
    const platforms = kind==='jump' || kind==='platform' ? [{x:x+110,y:config.groundY-rng.int(70,110),w:100,h:18}] : [];
    const collectibles = kind==='finish' ? [] : Array.from({length: rng.int(2,4)},(_,j)=>({id:`c-${seed}-${i}-${j}`,x:x+55+j*(width-105)/Math.max(1,3),y:config.groundY-rng.int(38,75),w:24,h:24,material:rng.pick(config.materials) as Material,collected:false}));
    const enemies = (kind==='combat' || (i>1 && i<count-1 && rng.next()<.48)) ? [{id:`e-${seed}-${i}`,x:x+width*rng.int(35,60)/100,y:config.groundY-38,w:34,h:38,kind:rng.pick(config.enemyKinds),hp:2,minX:x+25,maxX:x+width-40}] : [];
    const segment: LevelSegment={id:`s-${seed}-${i}`,kind,x,width,groundY:config.groundY,platforms,collectibles,enemies,checkpoint:kind==='checkpoint'};
    // Validate each segment; fallback is a safe, traversable stretch.
    if (!validateLevel({seed,width:config.worldWidth,groundY:config.groundY,segments:[segment],collectibles,enemies,finishX:config.worldWidth,checkpointX:x},config).errors.some(e=>e.includes('Segmento'))) segments.push(segment);
    else segments.push({...segment,kind:'plain',platforms:[],enemies:[]});
  }
  const level: GeneratedLevel={seed,width:config.worldWidth,groundY:config.groundY,segments,collectibles:segments.flatMap(s=>s.collectibles),enemies:segments.flatMap(s=>s.enemies),finishX:config.worldWidth-100,checkpointX:segments.find(s=>s.checkpoint)?.x ?? config.worldWidth*.58};
  const result=validateLevel(level,config); if(!result.valid) throw new Error(`Nível inválido: ${result.errors.join(', ')}`); return level;
}
