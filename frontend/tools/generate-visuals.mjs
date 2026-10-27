import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('../public/assets/', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const emit = async (path, content) => { const file = join(root, path); await mkdir(dirname(file), { recursive: true }); await writeFile(file, content, 'utf8'); };
const palettes = {
  'skin-crisoman-verde': ['#27a83b','#6aee67','#12552b','#f6c94d'],
  'skin-crisoman-urbano': ['#627582','#b8d0d3','#344650','#e9b95d'],
  'skin-crisoman-natureza': ['#9c6339','#dca65e','#583c2e','#7ed15d'],
  'skin-crisoman-agua': ['#168dc6','#62d8f1','#15577f','#eaffff'],
  'skin-crisoman-fogo': ['#d9432c','#ff9751','#7d2828','#ffe06b'],
  'skin-crisogirl-rosa': ['#dd368c','#ff85c4','#792653','#f9dc69'],
  'skin-crisogirl-urbana': ['#627582','#b8d0d3','#344650','#e9b95d'],
  'skin-crisogirl-floresta': ['#239b55','#7cdb70','#155e3b','#f1cd62'],
  'skin-crisogirl-agua': ['#168dc6','#62d8f1','#15577f','#fff1b2'],
  'skin-crisogirl-fogo': ['#df642d','#ffb75e','#853b29','#ffea73'],
};
// Crisoman's original in-game spritesheet remains authoritative; generate only Crisogirl here.
const heroes = ['crisogirl'];
const anims = { idle:[4,4,true], walk:[5,8,true], run:[6,12,true], jump:[4,11,false], fall:[4,8,true], collect:[4,9,false], hurt:[3,12,false], celebrate:[5,8,false] };
const pets = [
  ['pet-turtix','#39b867','#b9ed78','turtle'], ['pet-foxy','#ef8f3f','#fff0ca','fox'],
  ['pet-folhinha','#a1ce45','#e6f5a3','leaf'], ['pet-pipoca','#53c5cd','#e1ffff','bird'], ['pet-brasa','#ef6044','#ffd467','fox']
];
const rect=(x,y,w,h,fill,rx=0,stroke='#152d32',sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const path=(d,fill,stroke='#152d32',sw=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
function heroArt(character, pal, anim, frame) {
  const [main, light, shade, accent] = pal; const step = frame % 4;
  const airborne = anim==='jump' || anim==='fall' || anim==='celebrate';
  const crouch = anim==='collect'; const lean = anim==='hurt' ? 5 : anim==='run' ? 2 : 0;
  const bob = anim==='idle' ? [0,-1,-2,-1][frame%4] : 0;
  const legA = anim==='run' ? [-5,0,5,3,-2,-5][frame%6] : anim==='walk' ? [-2,0,2,1,-1][frame%5] : anim==='jump' ? -5 : anim==='fall' ? -2 : crouch ? 3 : 0;
  const legB = anim==='run' ? [5,3,-4,0,4,5][frame%6] : anim==='walk' ? [2,1,-2,0,2][frame%5] : anim==='jump' ? 3 : anim==='fall' ? 6 : crouch ? 3 : 0;
  let armL='M33 40 L23 50 L19 61 L24 65 L32 54 L39 49 Z', armR='M62 40 L72 50 L76 61 L71 65 L63 54 L57 49 Z';
  if(anim==='run'||anim==='walk'){ armL=`M33 40 L24 ${42+step%2*5} L19 ${54+step%2*5} L25 58 L35 48 Z`; armR=`M62 40 L72 ${45-step%2*5} L78 ${57-step%2*5} L72 61 L61 51 Z`; }
  if(anim==='jump'||anim==='celebrate'){ armL='M33 40 L26 34 L19 24 L24 20 L35 30 L41 40 Z'; armR='M62 40 L69 34 L76 24 L71 20 L60 30 L55 40 Z'; }
  if(anim==='fall'){ armL='M33 40 L22 35 L13 30 L10 36 L22 44 L37 48 Z'; armR='M62 40 L73 35 L82 30 L85 36 L73 44 L58 48 Z'; }
  if(anim==='collect'){ armL='M33 42 L25 54 L30 63 L36 59 L39 51 Z'; armR='M62 42 L68 55 L77 61 L80 56 L70 47 Z'; }
  if(anim==='hurt'){ armL='M34 42 L24 39 L18 47 L23 52 L34 50 Z'; armR='M62 42 L73 37 L80 43 L76 49 L64 51 Z'; }
  const face = character==='crisogirl' ? '#f2b58d' : '#eeb58a';
  const hair = '#272b39';
  const hairBack = character==='crisogirl' ? path('M32 18 Q24 27 27 43 L21 56 Q24 66 34 61 L40 40 Z',hair,'#18232c',2) : '';
  const pony = character==='crisogirl' ? path('M64 17 Q80 19 77 35 L88 44 Q87 58 77 61 L68 43 Z','#242839','#18232c',2)+`<path d="M75 36l8-4m-8 7 9-4" stroke="${pal[3]}" stroke-width="3" stroke-linecap="round"/>` : '';
  const strideY1=68+Math.max(-4,legA), strideY2=68+Math.max(-4,legB);
  const bodyY=crouch?34:30+bob; const headY=10+bob;
  let eyes=anim==='hurt' ? '<path d="M40 27l5 5m0-5l-5 5M54 27l5 5m0-5l-5 5" stroke="#17242a" stroke-width="2"/>' : '<ellipse cx="44" cy="29" rx="2.5" ry="3.4" fill="#17242a"/><ellipse cx="57" cy="29" rx="2.5" ry="3.4" fill="#17242a"/>';
  if(anim==='idle'&&frame===2) eyes='<path d="M41 29q3-3 6 0M54 29q3-3 6 0" fill="none" stroke="#17242a" stroke-width="2"/>';
  const emblem=character==='crisoman'?'♻':'✿';
  const badge=character==='crisogirl'?`<path d="M50 42c-5-6-11 1 0 9 11-8 5-15 0-9Z" fill="${accent}" stroke="#fff2dc" stroke-width="1"/>`:`<circle cx="50" cy="47" r="5" fill="${accent}" stroke="#eaffdc" stroke-width="1"/><text x="50" y="49.5" text-anchor="middle" font-family="Arial" font-size="6" font-weight="700" fill="#183b28">${emblem}</text>`;
  const waist=character==='crisogirl'?path('M39 56 L61 56 L69 71 L50 77 L31 71 Z',main,'#152d32',2)+path('M37 62 L63 62 L66 69 L50 73 L34 69 Z',light,'#152d32',1):'';
  return `<g shape-rendering="crispEdges" transform="translate(${lean} ${bob})">
    ${hairBack}${pony}
    ${path(`M38 65 L${34+legA} 79 L${30+legA} 87 L${33+legA} 91 L${47+legA} 91 L${49+legA} 87 L${45+legA} 78 L50 66 Z`,shade)}
    ${path(`M51 66 L${54+legB} 78 L${61+legB} 86 L${59+legB} 91 L${46+legB} 91 L${43+legB} 87 L${46+legB} 78 L45 65 Z`,main)}
    ${rect(29+legA,86,18,7,shade,2)}${rect(46+legB,86,18,7,shade,2)}
    ${rect(31+legA,86,12,2,light,1,'none',0)}${rect(48+legB,86,12,2,light,1,'none',0)}
    ${path(armL,main)}${path(armR,main)}${rect(17,60,9,8,shade,3)}${rect(71,60,9,8,shade,3)}
    ${path(`M34 ${bodyY} Q49 ${bodyY-4} 64 ${bodyY} L67 61 Q50 68 31 61 Z`,main)}
    ${path(`M39 ${bodyY+2} L60 ${bodyY+2} L62 58 L38 58 Z`,shade,'#152d32',1)}${path(`M39 ${bodyY} Q50 ${bodyY-2} 62 ${bodyY} L61 52 Q50 56 38 52 Z`,light,'#152d32',1)}${waist}${badge}
    ${path(`M33 ${headY+10} Q31 ${headY-1} 42 ${headY-3} L58 ${headY-3} Q69 ${headY} 66 ${headY+13} L63 ${headY+23} L38 ${headY+23} Z`,face,'#57352d',2)}
    ${character==='crisogirl'?path(`M35 ${headY+10} Q34 ${headY-3} 48 ${headY-5} Q64 ${headY-4} 65 ${headY+10} L61 ${headY+4} Q49 ${headY} 38 ${headY+7} Z`,hair,'#18232c',2):path(`M36 ${headY+8} Q35 ${headY-3} 49 ${headY-5} Q64 ${headY-4} 64 ${headY+8} L59 ${headY+4} Q49 ${headY+1} 39 ${headY+6} Z`,hair,'#18232c',2)}
    ${rect(29,headY+3,7,16,main,3)}${rect(64,headY+3,7,16,main,3)}
    ${path(`M31 ${headY+7} Q29 ${headY-7} 48 ${headY-10} Q67 ${headY-8} 68 ${headY+7} L64 ${headY+3} L63 ${headY} L58 ${headY+3} L42 ${headY+2} L36 ${headY+7} Z`,main)}
    ${path(`M39 ${headY-2} Q50 ${headY-8} 61 ${headY-2} L58 ${headY+1} L42 ${headY+1} Z`,light,'#152d32',1)}
    <circle cx="50" cy="${headY-2}" r="3.5" fill="${accent}" stroke="#eaffdc" stroke-width="1"/><path d="M47 ${headY-2}h6m-3-3v6" stroke="#1d5733" stroke-width="1.4"/>
    ${character==='crisogirl'?`<path d="M71 ${headY+4}q7-8 12 0-5 8-12 0Zm0 0-6-5v10Z" fill="${pal[3]}" stroke="#55304a" stroke-width="1"/>`:''}${eyes}<path d="M48 35q2 2 4 0" fill="none" stroke="#9a4e46" stroke-width="1.5"/>
    ${anim==='celebrate'?`<path d="M12 17l2 4 4 1-4 2-2 4-2-4-4-2 4-1zM84 18l2 4 4 1-4 2-2 4-2-4-4-2 4-1z" fill="${accent}"/>`:''}
  </g>`;
}
function petArt(type, main, light, anim, frame){
 const bob=anim==='idle'?[0,-1,-2,-1][frame%4]:0, hop=anim==='collect'&&frame===2?-4:0, leg=anim==='follow'?(frame%2?2:-2):0;
 if(type==='turtle') return `${rect(29,45+bob+hop,40,27,main,12)}${path('M35 49q14-15 29 0v13H35Z','#276f4a')}${rect(67,53+bob+hop,14,12,light,7)}${rect(37,68+bob+hop,8,8,main,3)}${rect(58,68+bob+hop,8,8,main,3)}<circle cx="76" cy="57" r="2" fill="#142b26"/>`;
 if(type==='fox') return `${path('M32 44l4-18 15 12 15-12 3 19q-2 25-20 26-19-2-17-27Z',main)}${path('M39 45l1-10 8 7M62 43l7-8 1 12',light,'#152d32',1)}${path('M38 57q13-16 28 0v12H38Z',light,'#152d32',1)}<circle cx="45" cy="51" r="2" fill="#18282a"/><circle cx="59" cy="51" r="2" fill="#18282a"/><ellipse cx="52" cy="61" rx="4" ry="2.5" fill="#3a2830"/>${path(`M65 67q20 ${58+leg} 16 5q-4 10-14 3`,main)}`;
 if(type==='leaf') return `${path('M51 74Q23 57 35 30Q60 27 70 45Q69 66 51 74Z',main)}${path('M51 72Q54 49 66 38M52 57l-13-9m14 15 12-8',light,'#255336',2)}<circle cx="46" cy="50" r="2" fill="#183525"/><circle cx="59" cy="49" r="2" fill="#183525"/>`;
 return `${path('M35 40L40 27 50 37 61 26 69 42 68 64Q54 78 37 65Z',main)}${path('M40 60q11-13 24 0v9H40Z',light,'#183943',1)}<circle cx="46" cy="51" r="2" fill="#17313a"/><circle cx="59" cy="51" r="2" fill="#17313a"/><path d="M47 57q5 4 10 0" stroke="#17313a" fill="none" stroke-width="2"/>${path(`M39 68l-6 8m25-8 6 8M34 53l-8 ${leg}m42-2 8 ${-leg}`,main)}`;
}
let frames=[];
for(const character of heroes) for(const [skinId,pal] of Object.entries(palettes)) if(skinId.includes(character)) for(const [anim,[count,fps,loop]] of Object.entries(anims)) for(let i=0;i<count;i++) frames.push({name:`${character}_${skinId}_${anim}_${String(i).padStart(2,'0')}`,character,skinId,anim,index:i,fps,loop,art:heroArt(character,pal,anim,i)});
for(const [petId,main,light,type] of pets) for(const [anim,count,fps,loop] of [['idle',4,5,true],['follow',6,9,true],['collect',3,10,false]]) for(let i=0;i<count;i++) frames.push({name:`${petId}_${anim}_${String(i).padStart(2,'0')}`,petId,anim,index:i,fps,loop,art:petArt(type,main,light,anim,i)});
const cols=8, cell=96, rows=Math.ceil(frames.length/cols), atlasWidth=cols*cell, atlasHeight=rows*cell;
const frameMeta={}; const body=[];
frames.forEach((f,i)=>{const x=i%cols*cell,y=Math.floor(i/cols)*cell;frameMeta[f.name]={x,y,w:cell,h:cell,pivot:{x:48,y:92},animation:f.anim,index:f.index,fps:f.fps,loop:f.loop,character:f.character??null,skinId:f.skinId??null,petId:f.petId??null};body.push(`<g transform="translate(${x} ${y})">${f.art}</g>`);});
await emit('sprites/v2/actors.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${atlasWidth}" height="${atlasHeight}" viewBox="0 0 ${atlasWidth} ${atlasHeight}" shape-rendering="crispEdges">${body.join('')}</svg>`);
await emit('sprites/v2/actors.json',JSON.stringify({version:2,image:'/assets/sprites/v2/actors.svg',frame:{w:96,h:96,pivot:{x:48,y:92}},atlas:{w:atlasWidth,h:atlasHeight,columns:cols,rows},animations:anims,frames:frameMeta},null,2));
await emit('sprites/v2/palettes.json',JSON.stringify(Object.fromEntries(Object.entries(palettes).filter(([id])=>id.includes('crisogirl'))),null,2));

const islands=[
 {id:'manguezal-09',name:'Manguezal Vivo',slug:'manguezal',palette:{sky:'#a5e3df',far:'#4b9a88',mid:'#257b69',near:'#164c49',water:'#2e9d9b',ground:'#704f38',accent:'#c3f16c'},theme:'mangrove'},
 {id:'geleira-10',name:'Geleira Azul',slug:'geleira',palette:{sky:'#b7e6f2',far:'#8fc9e0',mid:'#4c91b5',near:'#235a77',water:'#58bed4',ground:'#526d7d',accent:'#f2ffff'},theme:'glacier'},
 {id:'vulcao-11',name:'Vulcão Verde',slug:'vulcao',palette:{sky:'#8b88ad',far:'#625b7c',mid:'#483b4a',near:'#292c39',water:'#558b68',ground:'#3a353c',accent:'#b5eb6d'},theme:'volcano'},
];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function bgLayer(island,layer){const p=island.palette;let shapes='';
 if(layer==='sky'){
   shapes=`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${p.sky}"/><stop offset="1" stop-color="${p.far}"/></linearGradient></defs><rect width="1024" height="600" fill="url(#sky)"/>`;
   for(let i=0;i<6;i++){const x=i*210+35;shapes+=`<circle cx="${x}" cy="${70+(i%3)*30}" r="${20+i%2*9}" fill="#ffffff" opacity=".16"/>`;}
 } else if(island.theme==='mangrove'){
  if(layer==='far') for(let i=-1;i<8;i++){const x=i*165+30; shapes+=`<path d="M${x} 440 Q${x+28} 270 ${x+62} 435Q${x+100} 250 ${x+142} 440Z" fill="${p.far}"/><path d="M${x+62} 440V260M${x+62} 315q-52-5-70-68m71 95q53-10 75-76" stroke="${p.near}" stroke-width="11" fill="none"/>`;}
  if(layer==='mid') for(let i=-1;i<12;i++){const x=i*105+30; shapes+=`<path d="M${x} 600V380q-12-120 34-125 45 10 33 125V600Z" fill="${p.mid}"/><path d="M${x+18} 405q-70-8-74-84m84 61q64-12 75-76" stroke="${p.near}" stroke-width="8" fill="none"/>`;}
  if(layer==='near') for(let i=-1;i<18;i++){const x=i*62;shapes+=`<path d="M${x} 600V465q-8-60 18-65 24 7 17 65v135Z" fill="${i%2?p.near:p.accent}" opacity="${i%2?.65:.4}"/>`;}
 } else if(island.theme==='glacier'){
  if(layer==='far') for(let i=-1;i<7;i++){const x=i*190-20;shapes+=`<path d="M${x} 455L${x+85} ${130+(i%3)*25} ${x+190} 455Z" fill="${p.far}"/><path d="M${x+85} ${130+(i%3)*25}l-37 145 42-32 31 38Z" fill="#f0ffff" opacity=".8"/>`;}
  if(layer==='mid') for(let i=-1;i<10;i++){const x=i*120+20;shapes+=`<path d="M${x} 500L${x+55} 280 ${x+108} 500Z" fill="${p.mid}"/><path d="M${x+55} 280l-23 92 26-14 25 17Z" fill="#efffff"/>`;}
  if(layer==='near') for(let i=-1;i<8;i++){const x=i*145+25;shapes+=`<path d="M${x+40} 600V430L${x} 500l40-96 48 96-40-70v170Z" fill="${i%2?p.near:p.mid}"/><rect x="${x+32}" y="490" width="17" height="12" fill="#d6f5f2"/>`;}
 } else {
  if(layer==='far') for(let i=-1;i<6;i++){const x=i*210;shapes+=`<path d="M${x} 470L${x+110} 170 ${x+240} 470Z" fill="${p.far}"/><path d="M${x+80} 250l30-80 35 83Z" fill="#9d6872" opacity=".8"/>`;}
  if(layer==='mid') for(let i=-1;i<9;i++){const x=i*130;shapes+=`<path d="M${x} 520L${x+70} 280 ${x+140} 520Z" fill="${p.mid}"/><path d="M${x+30} 435h82" stroke="${p.accent}" stroke-width="7"/><path d="M${x+98} 280q38-35 10-78" stroke="#e2d7d0" stroke-width="12" opacity=".55" fill="none"/>`;}
  if(layer==='near') for(let i=-1;i<8;i++){const x=i*145; shapes+=`<path d="M${x} 600l28-95 21 95m30 0 22-130 24 130" stroke="${p.near}" stroke-width="18" fill="none"/><circle cx="${x+90}" cy="460" r="10" fill="#f37752" opacity=".8"/>`;}
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="600" viewBox="0 0 1024 600">${shapes}</svg>`;
}
function tile(island,kind){const p=island.palette;let art='';
 if(kind==='ground') art=`<rect width="32" height="32" fill="${p.ground}"/><rect width="32" height="7" fill="${p.accent}"/><path d="M0 12h32M0 24h32" stroke="#172c31" opacity=".25"/><path d="M4 10h5m11 7h8M3 28h9" stroke="#ffffff" opacity=".28" stroke-width="2"/>`;
 if(kind==='ledge') art=`<rect width="32" height="32" fill="${p.ground}"/><path d="M0 5h32v8H0Z" fill="${p.accent}"/><path d="M3 19h8m6 5h12" stroke="#ffffff" opacity=".3" stroke-width="2"/><path d="M0 31h32" stroke="#172c31" stroke-width="2"/>`;
 if(kind==='bridge') art=`<rect width="32" height="32" fill="${p.mid}"/><path d="M0 3h32v6H0Z" fill="${p.accent}"/><path d="M4 9v18m8-18v18m8-18v18m8-18v18" stroke="#172c31" stroke-width="2"/><path d="M0 29h32" stroke="#e5e6cd" stroke-width="2"/>`;
 if(kind==='block') art=`<rect x="2" y="2" width="28" height="28" rx="2" fill="${p.mid}" stroke="#172c31" stroke-width="3"/><path d="M5 9h22M5 23h22" stroke="${p.accent}" stroke-width="3"/><path d="M9 5v22m14-22v22" stroke="#ffffff" opacity=".22" stroke-width="2"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">${art}</svg>`;
}
const islandCatalog=[];
for(const island of islands){const base=`islands/${island.slug}`; for(const layer of ['sky','far','mid','near']) await emit(`${base}/background/${layer}.svg`,bgLayer(island,layer));
 for(const kind of ['ground','ledge','bridge','block']) await emit(`${base}/tiles/${kind}.svg`,tile(island,kind));
 const props=island.theme==='mangrove'?`<path d="M40 120v-64q-10-30 8-36 18 7 8 36v64m-8-68q-24-3-32-26m34 38q25-8 34-30" stroke="#423529" stroke-width="9" fill="none"/><circle cx="28" cy="31" r="19" fill="${island.palette.accent}"/><circle cx="58" cy="24" r="23" fill="${island.palette.mid}"/>`:island.theme==='glacier'?`<path d="M22 120V52L5 80l17-45 20 45-18-26v66Z" fill="${island.palette.mid}"/><path d="M16 61l6-26 8 26Z" fill="#f5ffff"/>`:`<path d="M20 120V76m0-8l-13-18 14 10 14-16-7 25 8 13Z" stroke="#32483d" stroke-width="5" fill="${island.palette.mid}"/><circle cx="20" cy="20" r="9" fill="${island.palette.accent}"/><path d="M20 20V80m0-60-18 50m18-50 18 50" stroke="#eaffdf" stroke-width="3"/>`;
 await emit(`${base}/props.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="128" viewBox="0 0 96 128">${props}</svg>`);
 await emit(`${base}/bin.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64"><path d="M8 16h32l-3 40H11Z" fill="${island.palette.mid}" stroke="#172d32" stroke-width="3"/><path d="M6 12h36v8H6Z" fill="${island.palette.accent}" stroke="#172d32" stroke-width="3"/><path d="M17 7h14v5H17Z" fill="none" stroke="#172d32" stroke-width="3"/><text x="24" y="43" text-anchor="middle" font-size="18" font-family="Arial" font-weight="700" fill="#f2ffe7">♻</text></svg>`);
 await emit(`${base}/thumbnail.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 1024 576">${bgLayer(island,'sky').replace(/<\/?svg[^>]*>/g,'')}${bgLayer(island,'far').replace(/<\/?svg[^>]*>/g,'')}${bgLayer(island,'mid').replace(/<\/?svg[^>]*>/g,'')}${bgLayer(island,'near').replace(/<\/?svg[^>]*>/g,'')}</svg>`);
 islandCatalog.push({...island,index:8+islandCatalog.length,layers:Object.fromEntries(['sky','far','mid','near'].map(x=>[x,`/assets/${base}/background/${x}.svg`])),tiles:Object.fromEntries(['ground','ledge','bridge','block'].map(x=>[x,`/assets/${base}/tiles/${x}.svg`])),props:`/assets/${base}/props.svg`,bin:`/assets/${base}/bin.svg`,thumbnail:`/assets/${base}/thumbnail.svg`});
}
await emit('islands/catalog.json',JSON.stringify(islandCatalog,null,2));
const outRoot=new URL('../../../../../../../outputs/',import.meta.url); // previews are also copied by the user-facing delivery step
console.log(`Generated ${frames.length} fixed-pivot frames (${atlasWidth}x${atlasHeight}) and ${islands.length} island kits.`);
