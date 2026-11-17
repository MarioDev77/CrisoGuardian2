#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const catalog = JSON.parse(read('public/assets/phases/catalog.json'));
const names = new Set(catalog.map(x=>x.name));
const entities = read('src/game/entities.ts');
const engine = read('src/game/engine.ts');
const assets = read('src/game/assets.ts');
const layouts = read('src/game/levels/layouts.ts');
const islandLayouts = read('src/game/levels/islandLayouts.ts');
const gameView = read('src/components/GameView.tsx');
const phases = [9,10,11,12,13,14,15,16];
const pivotData = JSON.parse(read('public/assets/islands/creature-pivots.json'));
const errors=[];
const enemyMap={9:['p09_walker','p09_flyer'],10:['p10_walker','p10_flyer'],11:['p11_walker','p11_flyer'],12:['p12_walker','p12_flyer'],13:['p13_walker','p13_flyer'],14:['p14_walker','p14_flyer'],15:['p15_walker','p15_flyer'],16:['p16_walker','p16_flyer']};
for(const [phase,frames] of Object.entries(enemyMap)) for(const f of frames) if(!names.has(f)) errors.push(`fase ${phase}: asset ${f} ausente no catálogo`);
for(const slug of ['vulcao','guardiao']) if(!fs.existsSync(`public/assets/islands/${slug}/boss_custom.png`)) errors.push(`chefe customizado ausente: ${slug}`);
for(const phase of phases){ const pfx=`p${String(phase).padStart(2,'0')}_`; const body=entities.slice(entities.indexOf(`// inimigos exclusivos das ilhas`)); if(!body.includes(`'${pfx}walker'`)||!body.includes(`'${pfx}flyer'`)) errors.push(`fase ${phase}: mapeamento de sprites de inimigo incompleto`); }
for(const [kind,meta] of Object.entries(pivotData)){ if(!(meta.pivot.x>=0&&meta.pivot.x<=1&&meta.pivot.y>=0&&meta.pivot.y<=1)) errors.push(`${kind}: pivô fora do intervalo 0–1`); if(!entities.includes(`${kind}:`) || !entities.includes(`pivot: { x: ${meta.pivot.x}, y: ${meta.pivot.y} }`)) errors.push(`${kind}: pivô não aplicado ao personagem`); }
if(!layouts.includes("import { islandLayouts } from './islandLayouts'") || !layouts.includes('...islandLayouts')) errors.push('layouts 09–16 não estão conectados ao array principal');
if(!islandLayouts.includes("id: 'vulcao-11'") || !islandLayouts.includes("id: 'guardiao-16'") || !islandLayouts.includes('boss: true')) errors.push('configuração dos chefes 11/16 incompleta');
if(!gameView.includes('onNext(level + 1)') || !gameView.includes('level < layouts.length - 1')) errors.push('botão de avanço entre fases não está conectado');
if(!assets.includes('pivot?: { x: number; y: number }')) errors.push('DrawOpts não declara pivô normalizado');
if(!engine.includes('this.drawTransition()')||!engine.includes('private drawTransition()')) errors.push('rotina de transição de fase ausente');
if(!engine.includes("w.phase === 'burst' || w.phase === 'iris'")) errors.push('sequência de vitória/transição incompleta');
for(const phase of ['walk','suck','burst','iris']) if(!engine.includes(`phase === '${phase}'`)) errors.push(`transição sem etapa ${phase}`);
if(!engine.includes('this.levelIndex + 1')) errors.push('rótulo/índice de fase não avança');
if(errors.length){ console.error('FALHAS:\n'+errors.join('\n')); process.exit(1); }
console.log('OK: 8 layouts 09–16 conectados; 16 sprites de inimigos resolvidos com animação procedural; pivôs medidos pela caixa alfa e aplicados; chefes 11/16 carregáveis; 4 etapas de transição e botão Próxima fase conectados.');
