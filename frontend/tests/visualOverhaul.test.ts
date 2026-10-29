import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { levelConfigs } from '../src/game/levels/levelConfigs';
import catalog from '../src/app/catalog-data.json';
const root=resolve('public/assets');
const manifest=JSON.parse(readFileSync(resolve(root,'sprites/v2/actors.json'),'utf8')) as {frame:{w:number;h:number;pivot:{x:number;y:number}};atlas:{w:number;h:number};frames:Record<string,{w:number;h:number;x:number;y:number}>};
describe('visual overhaul assets',()=>{
 it('keeps a fixed frame size and pivot and includes all catalog character skins and pet animations',()=>{
  expect(manifest.frame).toEqual({w:96,h:96,pivot:{x:48,y:92}});
  expect(manifest.atlas.w%96).toBe(0);expect(manifest.atlas.h%96).toBe(0);
  const keys=new Set(Object.keys(manifest.frames));
  for(const skin of catalog.skins.filter(s=>s.character==='crisogirl')){const character=skin.character; for(const anim of ['idle','walk','run','jump','fall','collect','hurt','celebrate']) expect(keys.has(`${character}_${skin.id}_${anim}_00`),`${skin.id} ${anim}`).toBe(true);}
  for(const pet of catalog.pets) for(const anim of ['idle','follow','collect']) expect(keys.has(`${pet.id}_${anim}_00`),`${pet.id} ${anim}`).toBe(true);
  expect(existsSync(resolve(root,'sprites/v2/actors.svg'))).toBe(true);
  expect(Object.keys(manifest.frames).some(k=>k.startsWith('crisoman_'))).toBe(false);
  expect(existsSync(resolve(root,'sprites/crisoman/crisoman.png'))).toBe(true);
  expect(existsSync(resolve(root,'sprites/crisoman/frames/idle/idle_00.png'))).toBe(true);
 });
 it('has eight new island backgrounds and tiled assets wired to playable phases',()=>{
  expect(levelConfigs).toHaveLength(16);
  const phases=JSON.parse(readFileSync(resolve(root,'phases/catalog.json'),'utf8')) as {phase:number;src:string;name:string}[];
  for(const island of catalog.newIslands){const levelIndex=island.index;const phaseIndex=levelIndex+1;expect(levelConfigs[levelIndex]?.id).toBe(island.id);for(const role of ['ground','ledge','bridge','prop','bin']){const asset=phases.find(x=>x.phase===phaseIndex&&x.name===`p${String(phaseIndex).padStart(2,'0')}_${role}`);expect(asset,`${island.id} ${role}`).toBeTruthy();expect(existsSync(resolve(root,asset!.src.replace('/assets/','')))).toBe(true);}}
 });
});
