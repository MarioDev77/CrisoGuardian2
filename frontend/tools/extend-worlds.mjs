import fs from 'node:fs';
const catPath='src/app/catalog-data.json'; const catalog=JSON.parse(fs.readFileSync(catPath,'utf8')); catalog.newIslands=[
 {id:'manguezal-09',name:'Manguezal Vivo',index:8,theme:'manguezal',difficulty:9,palette:{sky:'#a5e3df',far:'#4b9a88',mid:'#257b69',near:'#164c49',water:'#2e9d9b',ground:'#704f38',accent:'#c3f16c'}},
 {id:'geleira-10',name:'Geleira Azul',index:9,theme:'geleira',difficulty:10,palette:{sky:'#b7e6f2',far:'#8fc9e0',mid:'#4c91b5',near:'#235a77',water:'#58bed4',ground:'#526d7d',accent:'#f2ffff'}},
 {id:'vulcao-11',name:'Vulcão Verde',index:10,theme:'vulcao',difficulty:11,palette:{sky:'#8b88ad',far:'#625b7c',mid:'#483b4a',near:'#292c39',water:'#558b68',ground:'#3a353c',accent:'#b5eb6d'}}
]; fs.writeFileSync(catPath,JSON.stringify(catalog,null,2)+'\n');
const layoutsPath='src/game/levels/layouts.ts'; let layouts=fs.readFileSync(layoutsPath,'utf8'); const marker='\n];'; const at=layouts.lastIndexOf(marker); if(at<0) throw Error('layouts end not found'); const add=`
  {
    id:'manguezal-09', name:'Manguezal Vivo', biome:'Manguezal e raízes filtrantes', objective:'Atravesse os canais entre raízes e recupere os materiais do mangue.', sceneH:238, screens:5, accent:'#c3f16c',
    surfaces:[{x:0,y:220,w:357,kind:'ground',tile:'p09_ground'},{x:32,y:177,w:68,kind:'plat',tile:'p09_ledge'},{x:132,y:152,w:72,kind:'bridge',tile:'p09_bridge'},{x:246,y:174,w:80,kind:'plat',tile:'p09_ledge'}], ladders:[],
    decor:[{x:66,y:220,tile:'p09_prop',scale:1.1},{x:276,y:220,tile:'p09_prop',scale:.8}], walkers:['crab','roach'], flyers:['fly','fish'], materials:['plastico','papel','vidro','metal'], bin:'p09_bin',
  },
  {
    id:'geleira-10', name:'Geleira Azul', biome:'Geleiras e água doce', objective:'Cruze as placas de gelo e proteja a nascente congelada.', sceneH:238, screens:5, accent:'#f2ffff',
    surfaces:[{x:0,y:220,w:357,kind:'ground',tile:'p10_ground'},{x:18,y:170,w:74,kind:'plat',tile:'p10_ledge'},{x:132,y:142,w:70,kind:'bridge',tile:'p10_bridge'},{x:260,y:166,w:80,kind:'plat',tile:'p10_ledge'}], ladders:[],
    decor:[{x:93,y:220,tile:'p10_prop',scale:1},{x:224,y:220,tile:'p10_prop',scale:.85}], walkers:['yeti','rat'], flyers:['bat','fly'], materials:['plastico','papel','vidro','metal'], bin:'p10_bin',
  },
  {
    id:'vulcao-11', name:'Vulcão Verde', biome:'Vulcão de energia limpa', objective:'Desvie das rochas quentes e estabilize o portal de energia renovável.', sceneH:238, screens:5, accent:'#b5eb6d', boss:true,
    surfaces:[{x:0,y:220,w:357,kind:'ground',tile:'p11_ground'},{x:12,y:176,w:65,kind:'plat',tile:'p11_ledge'},{x:106,y:144,w:70,kind:'bridge',tile:'p11_bridge'},{x:217,y:166,w:68,kind:'plat',tile:'p11_ledge'},{x:296,y:180,w:61,kind:'plat',tile:'p11_ledge'}], ladders:[],
    decor:[{x:52,y:220,tile:'p11_prop',scale:1},{x:256,y:220,tile:'p11_prop',scale:.9}], walkers:['robot','mutant','alien'], flyers:['cloud','drone'], materials:['plastico','papel','vidro','metal'], bin:'p11_bin',
  },`;
layouts=layouts.slice(0,at)+add+layouts.slice(at); fs.writeFileSync(layoutsPath,layouts);
const cfgPath='src/game/levels/levelConfigs.ts'; let cfg=fs.readFileSync(cfgPath,'utf8'); const cfgMarker='\n];'; const ci=cfg.lastIndexOf(cfgMarker); if(ci<0)throw Error('config end not found'); const cfgAdd=`
  { ...forestConfig, id:'manguezal-09', name:'Manguezal Vivo', biome:'Manguezal e raízes filtrantes', worldWidth:5460, palette:{sky:'#a5e3df',canopy:'#257b69',ground:'#704f38',accent:'#c3f16c'}, objective:'Atravesse os canais entre raízes e recupere os materiais do mangue.' },
  { ...forestConfig, id:'geleira-10', name:'Geleira Azul', biome:'Geleiras e água doce', worldWidth:5880, palette:{sky:'#b7e6f2',canopy:'#4c91b5',ground:'#526d7d',accent:'#f2ffff'}, objective:'Cruze as placas de gelo e proteja a nascente congelada.' },
  { ...forestConfig, id:'vulcao-11', name:'Vulcão Verde', biome:'Vulcão de energia limpa', worldWidth:6300, palette:{sky:'#8b88ad',canopy:'#483b4a',ground:'#3a353c',accent:'#b5eb6d'}, objective:'Desvie das rochas quentes e estabilize o portal de energia renovável.' },`;
cfg=cfg.slice(0,ci)+cfgAdd+cfg.slice(ci);fs.writeFileSync(cfgPath,cfg);
const progressPath='src/app/progress.ts'; let progress=fs.readFileSync(progressPath,'utf8'); progress=progress.replace("export const LEVEL_COUNT = 8;","import { NEW_ISLANDS } from './catalog';\nexport const LEVEL_COUNT = 8 + NEW_ISLANDS.length;");fs.writeFileSync(progressPath,progress);
const ecoPath='src/app/economy.ts';let eco=fs.readFileSync(ecoPath,'utf8');eco=eco.replace("import { CATALOG, MATERIALS, RECYCLING, RUN_LIMITS, type CharacterId } from './catalog';","import { CATALOG, MATERIALS, RECYCLING, RUN_LIMITS, type CharacterId } from './catalog';\nimport { LEVEL_COUNT } from './progress';");eco=eco.replace('run.level >= 8','run.level >= LEVEL_COUNT');fs.writeFileSync(ecoPath,eco);
const catalogTs='src/app/catalog.ts';let ct=fs.readFileSync(catalogTs,'utf8');ct += `\nexport const NEW_ISLANDS = (rawCatalog as typeof rawCatalog & { newIslands: { id:string; name:string; index:number; theme:string; difficulty:number; palette:Record<string,string> }[] }).newIslands;\n`;fs.writeFileSync(catalogTs,ct);
const server='../backend/economy-api.mjs';let api=fs.readFileSync(server,'utf8');api=api.replace("const allItems = new Map([...skins, ...pets]);","const allItems = new Map([...skins, ...pets]);\nconst LEVEL_COUNT = 8 + catalog.newIslands.length;");api=api.replace('Array(8).fill(0)','Array(LEVEL_COUNT).fill(0)').replace('Math.min(8, pr.unlocked)','Math.min(LEVEL_COUNT, pr.unlocked)').replace('Array.from({ length: 8 }','Array.from({ length: LEVEL_COUNT }').replace('n < 8','n < LEVEL_COUNT').replace('level >= 8','level >= LEVEL_COUNT').replace('Math.min(8, Math.max(p.progress.unlocked','Math.min(LEVEL_COUNT, Math.max(p.progress.unlocked');fs.writeFileSync(server,api);
