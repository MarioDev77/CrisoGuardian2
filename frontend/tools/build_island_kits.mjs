/**
 * Gera os kits das 8 ilhas do Mapa 2 (fases 9 a 16): fundos em 4 camadas contínuas, tiles modulares,
 * props, animais, lixeira e os layouts em partes A–D (src/game/levels/islandLayouts.ts).
 * Uso (dentro de frontend/):  node tools/build_island_kits.mjs
 * Tudo é vetorial (SVG com transparência real), então fica nítido em qualquer resolução.
 */
import fs from 'node:fs';
import path from 'node:path';

const PUB = 'public/assets/islands';
const emit = (rel, txt) => { const f = path.join(PUB, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const W = 1024, H = 600;
const INK = '#142a2e';

export const ISLANDS = [
  { id: 'manguezal-09', slug: 'manguezal', ownWalker: 'fiddler', ownFlyer: 'dragonfly', name: 'Manguezal Vivo', theme: 'manguezal', n: 9, p: 'p09', biome: 'Manguezal e raízes filtrantes', objective: 'Atravesse os canais entre raízes e recupere os materiais do mangue.', worldWidth: 5460,
    pal: { sky: '#bff0e6', sky2: '#7fcfc0', far: '#5aa896', mid: '#2f8068', near: '#14463f', water: '#2c9aa0', ground: '#6a4a34', cap: '#6fbf5a', accent: '#c3f16c' },
    walkers: ['crab', 'roach'], flyers: ['fly', 'fish'], materials: ['plastico', 'papel', 'vidro', 'metal', 'restos'], boss: false, pit: 'agua' },
  { id: 'geleira-10', slug: 'geleira', ownWalker: 'penguin', ownFlyer: 'snowowl', name: 'Geleira Azul', theme: 'geleira', n: 10, p: 'p10', biome: 'Geleiras, cavernas e água doce', objective: 'Cruze as placas de gelo e proteja a nascente congelada.', worldWidth: 5880,
    pal: { sky: '#d8f3ff', sky2: '#8fd0ea', far: '#a9d8ec', mid: '#6aa9cc', near: '#2e6a8f', water: '#58bed4', ground: '#6f90a8', cap: '#f2fbff', accent: '#bff3ff' },
    walkers: ['yeti', 'rat'], flyers: ['bat', 'fly'], materials: ['plastico', 'papel', 'vidro', 'metal', 'bateria'], boss: false, pit: 'agua' },
  { id: 'vulcao-11', slug: 'vulcao', ownWalker: 'salamander', ownFlyer: 'ember', name: 'Vulcão Verde', theme: 'vulcao', n: 11, p: 'p11', biome: 'Vulcão de energia geotérmica', objective: 'Desvie das rochas quentes e estabilize o portal de energia renovável.', worldWidth: 6300,
    pal: { sky: '#3d2a55', sky2: '#e07a52', far: '#5b3f63', mid: '#3d2a40', near: '#241c2c', water: '#ff7a2f', ground: '#3b3340', cap: '#6a5760', accent: '#b5eb6d' },
    walkers: ['lizard', 'mutant'], flyers: ['bat', 'drone'], materials: ['metal', 'vidro', 'bateria', 'eletronico', 'plastico'], boss: true, pit: 'lava' },
  { id: 'fabrica-12', slug: 'fabrica', ownWalker: 'sweeper', ownFlyer: 'cogdrone', name: 'Fábrica da Reciclagem', theme: 'fabrica', n: 12, p: 'p12', biome: 'Complexo industrial de reciclagem', objective: 'Cruze as esteiras e reative as máquinas de reciclagem.', worldWidth: 6300,
    pal: { sky: '#cfe3e0', sky2: '#9bb8b8', far: '#7f9a9c', mid: '#566f78', near: '#2f434d', water: '#6fe38a', ground: '#4a5560', cap: '#7e8b96', accent: '#ffcf4a' },
    walkers: ['robot', 'armor'], flyers: ['drone', 'bat'], materials: ['metal', 'eletronico', 'bateria', 'plastico', 'tinta'], boss: false, pit: 'acido' },
  { id: 'copas-13', slug: 'copas', ownWalker: 'monkey', ownFlyer: 'toucan', name: 'Floresta das Copas', theme: 'copas', n: 13, p: 'p13', biome: 'Dossel de árvores gigantes', objective: 'Suba pelos galhos gigantes e proteja as copas da floresta.', worldWidth: 6300,
    pal: { sky: '#f3ffc9', sky2: '#8fd96b', far: '#5fae56', mid: '#2f7d3a', near: '#14502c', water: '#3aa86a', ground: '#6b4a2e', cap: '#58b84a', accent: '#e5ff7a' },
    walkers: ['spider', 'lizard'], flyers: ['fly', 'bat'], materials: ['papel', 'folhas', 'fruta', 'plastico', 'vidro'], boss: false, pit: 'vazio' },
  { id: 'oceano-14', slug: 'oceano', ownWalker: 'urchin', ownFlyer: 'jelly', name: 'Oceano Cristalino', theme: 'oceano', n: 14, p: 'p14', biome: 'Recifes e fundo do mar', objective: 'Limpe os recifes e devolva a cor ao oceano.', worldWidth: 6720,
    pal: { sky: '#9fe6ff', sky2: '#0f7fb0', far: '#3da3c9', mid: '#1f7da8', near: '#0d4f78', water: '#4fd1e8', ground: '#b9a679', cap: '#f0dfae', accent: '#6cf2d6' },
    walkers: ['crab', 'lizard'], flyers: ['fish', 'cloud'], materials: ['plastico', 'vidro', 'metal', 'papel', 'restos'], boss: false, pit: 'abismo' },
  { id: 'cidade-15', slug: 'cidade', ownWalker: 'sentinel', ownFlyer: 'orbdrone', name: 'Cidade do Futuro', theme: 'cidade', n: 15, p: 'p15', biome: 'Metrópole de energia limpa', objective: 'Reative a rede de energia limpa da cidade tecnológica.', worldWidth: 6720,
    pal: { sky: '#6fd3e8', sky2: '#d8f6e8', far: '#7fb3c6', mid: '#4d8aa3', near: '#2b5a73', water: '#7cf0a4', ground: '#52606c', cap: '#8fa0ae', accent: '#7cf0a4' },
    walkers: ['robot', 'alien'], flyers: ['drone', 'cloud'], materials: ['eletronico', 'bateria', 'metal', 'plastico', 'vidro'], boss: false, pit: 'vazio' },
  { id: 'guardiao-16', slug: 'guardiao', ownWalker: 'golem', ownFlyer: 'wisp', name: 'Guardião do Planeta', theme: 'guardiao', n: 16, p: 'p16', biome: 'Santuário final do planeta', objective: 'Enfrente o chefe final e restaure o equilíbrio do planeta.', worldWidth: 7140,
    pal: { sky: '#171a4a', sky2: '#4d2f86', far: '#3b3d8f', mid: '#2a2f78', near: '#14183f', water: '#8bf0b4', ground: '#3a3f7a', cap: '#8bf0b4', accent: '#9cffb5' },
    walkers: ['armor', 'alien', 'mutant'], flyers: ['drone', 'bat'], materials: ['eletronico', 'bateria', 'metal', 'vidro', 'tinta'], boss: true, pit: 'vazio' },
];

// ------------------------------------------------------------------ helpers de desenho
const grad = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
/** repete `fn(x, i)` ao longo de 1024 px e a cópia deslocada, para a camada fechar sem emenda. */
const rep = (step, fn, off = 0) => { let o = ''; for (let i = 0; i < W / step; i++) { const x = i * step + off; o += fn(x, i); o += fn(x - W, i); } return o; };
const tri = (x, y, w, h, f) => `<path d="M${x} ${y}L${x + w / 2} ${y - h}L${x + w} ${y}Z" fill="${f}"/>`;
const circ = (x, y, r, f, o = 1) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${f}" opacity="${o}"/>`;
const svg = (w, h, body, vb) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb ?? `0 0 ${w} ${h}`}">${body}</svg>`;
const gear = (cx, cy, r, f, teeth = 10) => { let d = ''; for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2, b = ((i + 0.5) / teeth) * Math.PI * 2; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * 1.18).toFixed(1)} ${(cy + Math.sin(a) * r * 1.18).toFixed(1)}L${(cx + Math.cos(b) * r * 1.18).toFixed(1)} ${(cy + Math.sin(b) * r * 1.18).toFixed(1)}`; } return `<path d="${d}Z" fill="${f}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="${f}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="#0000004d"/>`; };

// ------------------------------------------------------------------ fundos (sky, far, mid, near)
function sky(I) {
  const p = I.pal, R = rng(I.n * 31);
  let s = `<defs>${grad('g', p.sky, p.sky2)}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
  if (I.theme === 'guardiao') { for (let i = 0; i < 90; i++) s += circ(R() * W, R() * 420, R() * 1.8 + 0.4, '#fff', 0.5 + R() * 0.5); s += `<circle cx="760" cy="170" r="120" fill="#6a46b8" opacity=".35"/>`; }
  else if (I.theme === 'vulcao') { s += `<circle cx="256" cy="150" r="70" fill="#ffd9a0" opacity=".85"/><circle cx="256" cy="150" r="130" fill="#ffb070" opacity=".22"/>`; for (let i = 0; i < 5; i++) s += `<ellipse cx="${i * 210 + 60}" cy="${70 + (i % 3) * 34}" rx="96" ry="22" fill="#2a1d3a" opacity=".35"/>`; }
  else if (I.theme === 'geleira') { s += `<path d="M0 150Q256 40 512 140T1024 120V0H0Z" fill="#7cf0c8" opacity=".22"/><path d="M0 190Q300 90 560 180T1024 160V70Q760 120 512 80T0 110Z" fill="#a89cff" opacity=".18"/>`; }
  else if (I.theme === 'oceano') { for (let i = 0; i < 7; i++) s += `<path d="M${i * 170 - 40} 0L${i * 170 + 40} 0L${i * 170 + 190} 520L${i * 170 + 60} 520Z" fill="#fff" opacity=".07"/>`; }
  else if (I.theme === 'copas') { for (let i = 0; i < 6; i++) s += `<path d="M${i * 180 + 20} 0L${i * 180 + 90} 0L${i * 180 + 230} 520L${i * 180 + 90} 520Z" fill="#fffbd0" opacity=".12"/>`; }
  else if (I.theme === 'cidade') { s += `<circle cx="720" cy="190" r="70" fill="#fff6c8" opacity=".9"/><circle cx="720" cy="190" r="120" fill="#fff6c8" opacity=".18"/>`; }
  else s += rep(205, (x, i) => circ(x + 110, 80 + (i % 3) * 36, 22 + (i % 2) * 10, '#fff', 0.16));
  return svg(W, H, s);
}
function far(I) {
  const p = I.pal, R = rng(I.n * 53); let s = '';
  switch (I.theme) {
    case 'manguezal': s += rep(128, (x, i) => `<path d="M${x} 470Q${x + 30} ${300 + (i % 3) * 25} ${x + 64} 470Q${x + 96} ${280 + (i % 2) * 30} ${x + 128} 470Z" fill="${p.far}" opacity=".85"/>`) + `<rect y="440" width="${W}" height="160" fill="${p.water}" opacity=".35"/>`; break;
    case 'geleira': s += rep(256, (x, i) => `<path d="M${x} 480L${x + 120} ${160 + (i % 3) * 30}L${x + 256} 480Z" fill="${p.far}"/><path d="M${x + 120} ${160 + (i % 3) * 30}l-40 120 36-22 34 30z" fill="#fff" opacity=".9"/>`); break;
    case 'vulcao': s += rep(512, (x, i) => `<path d="M${x} 490L${x + 190} 190Q${x + 256} 160 ${x + 322} 190L${x + 512} 490Z" fill="${p.far}"/><path d="M${x + 205} 196Q${x + 256} 172 ${x + 307} 196L${x + 285} 222Q${x + 256} 210 ${x + 227} 222Z" fill="${p.water}"/><path d="M${x + 256} 180q-30-60 12-110 30-40 -10-70" stroke="#d9c7d6" stroke-width="34" fill="none" opacity=".35" stroke-linecap="round"/>`); break;
    case 'fabrica': s += rep(256, (x, i) => `<rect x="${x + 14}" y="${300 - (i % 3) * 30}" width="110" height="${200 + (i % 3) * 30}" fill="${p.far}"/><rect x="${x + 150}" y="${250 - (i % 2) * 40}" width="46" height="${250 + (i % 2) * 40}" fill="${p.far}"/><rect x="${x + 142}" y="${240 - (i % 2) * 40}" width="62" height="14" fill="${p.mid}"/>` + `<path d="M${x + 172} ${236 - (i % 2) * 40}q-14-40 10-70 20-30-6-60" stroke="#fff" stroke-width="22" fill="none" opacity=".35" stroke-linecap="round"/>`); break;
    case 'copas': s += rep(128, (x, i) => `<rect x="${x + 30}" y="0" width="${50 + (i % 3) * 14}" height="560" fill="${p.far}" opacity=".7"/>`) + rep(256, (x, i) => circ(x + 60, 120 + (i % 2) * 70, 120, p.far, 0.55)); break;
    case 'oceano': s += rep(256, (x, i) => `<path d="M${x} 600V${420 - (i % 3) * 40}q60-90 128 0t128 0V600Z" fill="${p.far}" opacity=".75"/>`) + rep(512, (x, i) => `<path d="M${x + 80} ${190 + i * 24}q30-18 60 0-30 18-60 0zm10 0l-18-12v24z" fill="#fff" opacity=".28"/>`); break;
    case 'cidade': s += rep(128, (x, i) => { const h = 200 + ((i * 53) % 190); return `<rect x="${x + 8}" y="${480 - h}" width="${70 + (i % 2) * 20}" height="${h}" fill="${p.far}"/><path d="M${x + 43} ${480 - h}v-${30 + (i % 3) * 20}" stroke="${p.far}" stroke-width="4"/>`; }); break;
    default: s += rep(256, (x, i) => `<circle cx="${x + 100}" cy="${250 + (i % 2) * 60}" r="${46 + (i % 3) * 18}" fill="${p.far}" opacity=".7"/>`) + `<circle cx="760" cy="190" r="${150}" fill="#4ad9a0" opacity=".5"/><path d="M590 190Q760 130 930 190" stroke="#cfffe9" stroke-width="5" fill="none" opacity=".6"/>`;
  }
  return svg(W, H, s);
}
function mid(I) {
  const p = I.pal; let s = '';
  switch (I.theme) {
    case 'manguezal': s = rep(128, (x, i) => `<path d="M${x + 64} 600V${360 - (i % 3) * 20}" stroke="${p.near}" stroke-width="16"/>${circ(x + 64, 330 - (i % 3) * 20, 44, p.mid)}${circ(x + 30, 350 - (i % 3) * 20, 30, p.mid)}${circ(x + 100, 352 - (i % 3) * 20, 32, p.mid)}<path d="M${x + 64} 430q-46 10-62 80M${x + 64} 430q46 10 62 80M${x + 64} 410q-20 40-18 100" stroke="${p.near}" stroke-width="7" fill="none"/>`) + `<rect y="540" width="${W}" height="60" fill="${p.water}" opacity=".5"/>`; break;
    case 'geleira': s = rep(171.2, (x, i) => `<path d="M${x} 520L${x + 70} ${300 - (i % 3) * 36}L${x + 171} 520Z" fill="${p.mid}"/><path d="M${x + 70} ${300 - (i % 3) * 36}l-26 80 30-14 26 20z" fill="#fff"/>`) + rep(512, (x) => `<path d="M${x + 60} 600V420Q${x + 256} 300 ${x + 452} 420V600" stroke="#dff7ff" stroke-width="10" fill="none" opacity=".35"/>`); break;
    case 'vulcao': s = rep(128, (x, i) => `<path d="M${x} 540L${x + 40} ${330 - (i % 3) * 30}L${x + 70} ${360 - (i % 2) * 20}L${x + 100} 540Z" fill="${p.mid}"/><path d="M${x + 30} 540v-70l8 40 10-60 10 90" stroke="${p.water}" stroke-width="5" fill="none" opacity=".9"/>`) + `<rect y="560" width="${W}" height="40" fill="${p.water}" opacity=".85"/>`; break;
    case 'fabrica': s = rep(256, (x, i) => `<rect x="${x}" y="${380 - (i % 2) * 40}" width="200" height="${220 + (i % 2) * 40}" fill="${p.mid}"/>` + gear(x + 70, 360 - (i % 2) * 40, 46, p.near) + `<rect x="${x + 130}" y="${330 - (i % 2) * 40}" width="40" height="70" fill="${p.near}"/><rect x="${x}" y="500" width="256" height="14" fill="${p.accent}" opacity=".85"/>` + `<path d="M${x} 520h256" stroke="${INK}" stroke-width="3" stroke-dasharray="10 8"/>`); break;
    case 'copas': s = rep(256, (x, i) => `<rect x="${x + 90}" y="0" width="${70}" height="600" fill="${p.near}" opacity=".9"/><path d="M${x + 160} ${220 + (i % 2) * 40}q70-10 140-60M${x + 90} ${300 - (i % 2) * 30}q-70-10-130-70" stroke="${p.near}" stroke-width="22" fill="none" stroke-linecap="round"/>${circ(x + 280, 150 + (i % 2) * 40, 52, p.mid)}${circ(x - 50, 220, 48, p.mid)}<path d="M${x + 200} ${230 + (i % 2) * 40}v${120 + (i % 3) * 30}" stroke="${p.accent}" stroke-width="3" opacity=".7"/>`); break;
    case 'oceano': s = rep(128, (x, i) => `<path d="M${x + 64} 600V${430 - (i % 3) * 26}M${x + 64} ${470 - (i % 3) * 20}l-30-40M${x + 64} ${500 - (i % 3) * 20}l30-44M${x + 64} ${440 - (i % 3) * 20}l-18-34" stroke="${i % 2 ? '#ff7a8a' : '#ffb35a'}" stroke-width="12" stroke-linecap="round" fill="none"/>${circ(x + 64, 430 - (i % 3) * 26, 9, i % 2 ? '#ff9aa6' : '#ffd08a')}`) + rep(256, (x, i) => `<path d="M${x + 20} 600q-10-70 12-130 8 40 18 0 14 50 0 130z" fill="${p.mid}"/>`); break;
    case 'cidade': s = rep(128, (x, i) => { const h = 150 + ((i * 71) % 220); return `<rect x="${x + 6}" y="${520 - h}" width="${96 + (i % 3) * 8}" height="${h}" rx="6" fill="${p.mid}"/><path d="M${x + 14} ${540 - h}h${80 + (i % 3) * 8}" stroke="${p.accent}" stroke-width="3" opacity=".8"/>` + Array.from({ length: Math.floor(h / 36) }, (_, k) => `<rect x="${x + 16}" y="${530 - h + k * 36}" width="${70 + (i % 3) * 8}" height="10" fill="#d9ffee" opacity="${0.25 + ((i + k) % 3) * 0.2}"/>`).join(''); }) + `<path d="M0 410Q256 380 512 410T1024 410" stroke="${p.accent}" stroke-width="5" fill="none" opacity=".7"/>`; break;
    default: s = rep(256, (x, i) => `<path d="M${x + 20} 480q40-90 100-70 60-20 110 70z" fill="${p.mid}"/><path d="M${x + 125} 410V250" stroke="${p.accent}" stroke-width="6" opacity=".8"/><path d="M${x + 125} 250l-34-60 34-40 34 40z" fill="${p.accent}" opacity=".85"/>`) + rep(512, (x) => `<ellipse cx="${x + 256}" cy="520" rx="220" ry="26" fill="#8bf0b4" opacity=".25"/>`);
  }
  return svg(W, H, s);
}
function near(I) {
  const p = I.pal, R = rng(I.n * 97); let s = '';
  switch (I.theme) {
    case 'manguezal': s = rep(64, (x, i) => `<path d="M${x + 10} 600V${470 - (i % 3) * 18}q-4-50 12-60 16 10 12 60V600Z" fill="${i % 2 ? p.near : p.mid}" opacity=".7"/>`) + rep(256, (x) => `<path d="M${x + 60} 0v150q8 30-6 50M${x + 140} 0v110q-8 30 4 60" stroke="${p.mid}" stroke-width="7" fill="none" opacity=".8"/>`); break;
    case 'geleira': s = rep(128, (x, i) => `<path d="M${x + 20} 600V${480 - (i % 3) * 20}l12-60 14 60 12-40 12 40V600Z" fill="${i % 2 ? p.near : p.mid}" opacity=".8"/>`) + rep(128, (x, i) => `<path d="M${x + 30} 0l10 ${40 + (i % 3) * 22} 10-${40 + (i % 3) * 22}z" fill="#e8fbff" opacity=".85"/>`, 30); break;
    case 'vulcao': s = rep(256, (x, i) => `<rect x="${x + 30}" y="${430 - (i % 2) * 24}" width="22" height="${170 + (i % 2) * 24}" rx="6" fill="${p.near}"/><path d="M${x + 41} ${430 - (i % 2) * 24}q-22-50 6-90 22-34-4-80" stroke="#f0e6ee" stroke-width="26" fill="none" opacity=".4" stroke-linecap="round"/>` + `<rect x="${x + 22}" y="${480}" width="38" height="12" rx="3" fill="${p.accent}"/>`); break;
    case 'fabrica': s = rep(128, (x, i) => `<rect x="${x + 6}" y="0" width="8" height="${60 + (i % 3) * 40}" fill="${p.near}"/><rect x="${x + 0}" y="${60 + (i % 3) * 40}" width="20" height="26" rx="4" fill="${p.near}"/>`) + rep(128, (x, i) => `<rect x="${x + 10}" y="${500 - (i % 3) * 22}" width="${60}" height="${100 + (i % 3) * 22}" fill="${p.near}" opacity=".85"/><path d="M${x + 10} ${530 - (i % 3) * 22}h60" stroke="${p.accent}" stroke-width="3"/>`); break;
    case 'copas': s = rep(128, (x, i) => `<path d="M${x + 30} 0q-10 90 4 ${130 + (i % 3) * 40}" stroke="${p.mid}" stroke-width="5" fill="none"/>${circ(x + 34, 130 + (i % 3) * 40, 6, p.accent)}`) + rep(64, (x, i) => `<path d="M${x} 600q${10 + (i % 3) * 6}-${60 + (i % 4) * 20} 28 0z" fill="${p.near}" opacity=".85"/>`); break;
    case 'oceano': s = rep(64, (x, i) => `<path d="M${x + 12} 600q-14-60 4-${90 + (i % 3) * 30} 14 ${50} 18 ${90 + (i % 3) * 30}z" fill="${i % 2 ? '#1c9a7a' : '#2fb58e'}" opacity=".75"/>`) + rep(128, (x, i) => circ(x + 40, 120 + ((i * 97) % 380), 4 + (i % 3) * 2, '#fff', 0.4)); break;
    case 'cidade': s = rep(256, (x, i) => `<path d="M${x} 560H${x + 256}" stroke="${p.near}" stroke-width="12"/><rect x="${x + 30}" y="490" width="70" height="26" rx="8" fill="${p.accent}" opacity=".85"/>`) + rep(128, (x) => `<rect x="${x + 50}" y="480" width="8" height="120" fill="${p.near}"/><path d="M${x + 54} 480l26-18v-30" stroke="${p.near}" stroke-width="6" fill="none"/>`); break;
    default: s = rep(128, (x, i) => `<path d="M${x + 30} 600V${470 - (i % 3) * 30}l14-34 14 34V600Z" fill="${p.accent}" opacity=".45"/><path d="M${x + 44} ${436 - (i % 3) * 30}v-30" stroke="#fff" stroke-width="3" opacity=".7"/>`);
  }
  return svg(W, H, s);
}

// ------------------------------------------------------------------ tiles (nine-slice: topo = cobertura, corpo repetido)
function groundTile(I, kind) {
  const p = I.pal, w = 128, h = kind === 'ledge' ? 64 : 96; const lip = 0.1;
  let defs = `<defs>${grad('b', p.ground, shade(p.ground, -0.35))}${grad('c', shade(p.cap, 0.1), p.cap)}</defs>`;
  const top = Math.round(h * lip), capH = Math.round(h * (kind === 'ledge' ? 0.38 : 0.34));
  let s = `<rect x="0" y="${top}" width="${w}" height="${h - top}" fill="url(#b)"/>`;
  // texturas do corpo
  const R = rng(I.n * 7 + (kind === 'ledge' ? 3 : 0));
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${R() * w}" cy="${top + capH + R() * (h - top - capH - 8)}" rx="${5 + R() * 9}" ry="${3 + R() * 4}" fill="${shade(p.ground, R() > 0.5 ? 0.22 : -0.4)}" opacity=".55"/>`;
  s += `<path d="M0 ${h - 4}h${w}" stroke="${shade(p.ground, -0.55)}" stroke-width="4"/>`;
  // cobertura do tema
  s += `<rect x="0" y="${top}" width="${w}" height="${capH}" rx="5" fill="url(#c)"/>`;
  if (I.theme === 'manguezal' || I.theme === 'copas') s += Array.from({ length: 12 }, (_, i) => `<path d="M${i * 11 + 3} ${top + 4}l3-${8 + (i % 3) * 3} 3 ${8 + (i % 3) * 3}z" fill="${shade(p.cap, 0.2)}"/>`).join('');
  if (I.theme === 'manguezal') s += `<path d="M0 ${top + capH}q16 12 32 0t32 0 32 0 32 0" fill="${p.ground}"/>`;
  if (I.theme === 'geleira') s += `<path d="M0 ${top + capH - 3}h${w}" stroke="#bfeaff" stroke-width="3"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${i * 22 + 8} ${top + capH}l6 ${12 + (i % 3) * 6} 6-${12 + (i % 3) * 6}z" fill="#e6f8ff"/>`).join('');
  if (I.theme === 'vulcao') s += `<path d="M10 ${top + 6}l22 ${capH - 12}M70 ${top + 4}l20 ${capH - 10}" stroke="${p.water}" stroke-width="4" opacity=".9"/><path d="M0 ${h - 14}h${w}" stroke="${p.accent}" stroke-width="3" opacity=".6"/>`;
  if (I.theme === 'fabrica') s += `<rect x="0" y="${top}" width="${w}" height="${capH}" fill="url(#c)"/><path d="M0 ${top + capH / 2}h${w}" stroke="${INK}" stroke-width="2" stroke-dasharray="14 10" opacity=".55"/>` + Array.from({ length: 5 }, (_, i) => circ(i * 30 + 10, h - 18, 4, '#0006')).join('') + `<rect x="0" y="${top}" width="${w}" height="5" fill="${p.accent}"/>`;
  if (I.theme === 'oceano') s += Array.from({ length: 5 }, (_, i) => circ(14 + i * 26, top + capH + 12 + (i % 2) * 14, 3, '#fff', 0.5)).join('');
  if (I.theme === 'cidade') s += `<path d="M0 ${top + 5}h${w}" stroke="${p.accent}" stroke-width="4"/><path d="M0 ${h - 18}h${w}" stroke="${p.accent}" stroke-width="2" opacity=".6"/>` + Array.from({ length: 4 }, (_, i) => `<rect x="${i * 32 + 6}" y="${top + capH + 10}" width="20" height="8" fill="${p.accent}" opacity=".35"/>`).join('');
  if (I.theme === 'guardiao') s += `<path d="M0 ${top + 4}h${w}" stroke="#d6ffe6" stroke-width="3"/>` + Array.from({ length: 4 }, (_, i) => `<path d="M${i * 32 + 16} ${top + capH}v${h - top - capH - 8}" stroke="${p.accent}" stroke-width="2" opacity=".4"/>`).join('');
  s += `<rect x="0" y="${top}" width="${w}" height="${capH}" rx="5" fill="none" stroke="${INK}" stroke-width="3" opacity=".6"/><path d="M0 ${top + 3}h${w}" stroke="#fff" stroke-width="3" opacity=".35"/>`;
  return svg(w, h, defs + s);
}
function bridgeTile(I) {
  const p = I.pal, w = 128, h = 40; const wood = ['fabrica', 'cidade', 'guardiao'].includes(I.theme) ? false : true;
  const plank = I.theme === 'geleira' ? '#cfeeff' : I.theme === 'oceano' ? '#e8d6a0' : wood ? '#9a6a3c' : p.cap;
  let s = `<defs>${grad('p', shade(plank, 0.2), shade(plank, -0.25))}</defs><rect x="0" y="4" width="${w}" height="16" rx="4" fill="url(#p)" stroke="${INK}" stroke-width="3"/>`;
  s += Array.from({ length: 8 }, (_, i) => `<path d="M${i * 16 + 2} 5v14" stroke="${INK}" stroke-width="2" opacity=".5"/>`).join('');
  s += `<rect x="0" y="22" width="${w}" height="6" fill="${p.accent}" opacity=".85"/><path d="M12 28v10M52 28v10M92 28v10" stroke="${INK}" stroke-width="3" opacity=".7"/>`;
  return svg(w, h, s);
}
function blockTile(I) { const p = I.pal; return svg(64, 64, `<defs>${grad('k', shade(p.ground, 0.2), shade(p.ground, -0.35))}</defs><rect x="3" y="3" width="58" height="58" rx="6" fill="url(#k)" stroke="${INK}" stroke-width="4"/><path d="M8 20h48M8 44h48M32 20v24" stroke="${p.accent}" stroke-width="3" opacity=".7"/>`); }
function crateTile(I) { const p = I.pal; const c = I.theme === 'fabrica' ? '#c79a3a' : I.theme === 'oceano' ? '#7a8f9a' : '#a8743f'; return svg(64, 64, `<rect x="3" y="3" width="58" height="58" rx="4" fill="${c}" stroke="${INK}" stroke-width="4"/><path d="M3 3L61 61M61 3L3 61" stroke="${shade(c, -0.4)}" stroke-width="4"/><rect x="3" y="3" width="58" height="9" fill="${shade(c, 0.2)}"/><text x="32" y="38" text-anchor="middle" font-family="Arial" font-weight="700" font-size="16" fill="${p.accent}" stroke="${INK}" stroke-width="1">♻</text>`); }

// ------------------------------------------------------------------ props, animais, lixeira
function props(I, k) {
  const p = I.pal; let s = '';
  const t = I.theme;
  if (k === 1) { // elemento grande do tema
    if (t === 'manguezal') s = `<path d="M48 190V100M48 150q-34 6-44 42M48 150q34 6 44 42M48 125q-20 30-24 68" stroke="#4a3526" stroke-width="10" fill="none" stroke-linecap="round"/>${circ(30, 84, 30, p.mid)}${circ(62, 70, 36, '#3c9a64')}${circ(80, 92, 26, p.mid)}`;
    else if (t === 'geleira') s = `<path d="M18 190L40 40 62 120 78 70 98 190Z" fill="#bfe8f8" stroke="${INK}" stroke-width="3"/><path d="M40 40L30 120 50 100z" fill="#fff" opacity=".8"/>`;
    else if (t === 'vulcao') s = `<path d="M10 190L30 90 52 60 74 100 92 190Z" fill="#4b3d4a" stroke="${INK}" stroke-width="3"/><path d="M52 60l-6 60 12-30z" fill="${p.water}"/><path d="M60 190v-40" stroke="${p.accent}" stroke-width="5"/>`;
    else if (t === 'fabrica') s = `<rect x="14" y="90" width="68" height="100" rx="6" fill="#6b7b86" stroke="${INK}" stroke-width="3"/>${gear(48, 120, 18, '#9fb0bb')}<rect x="30" y="150" width="36" height="22" fill="${p.accent}" stroke="${INK}" stroke-width="2"/><rect x="62" y="60" width="14" height="40" fill="#556772"/>`;
    else if (t === 'copas') s = `<rect x="38" y="30" width="22" height="162" fill="#6b4a2e" stroke="${INK}" stroke-width="3"/>${circ(48, 40, 40, p.mid)}${circ(20, 70, 26, '#3d9a49')}${circ(78, 70, 26, '#3d9a49')}<path d="M60 110q30 0 34-30" stroke="#6b4a2e" stroke-width="8" fill="none"/>`;
    else if (t === 'oceano') s = `<path d="M48 190V110M48 150l-26-36M48 168l28-40M48 124l-14-30" stroke="#ff7a8a" stroke-width="12" stroke-linecap="round" fill="none"/>${circ(48, 108, 11, '#ffb0ba')}${circ(22, 112, 8, '#ffb0ba')}${circ(76, 126, 8, '#ffb0ba')}`;
    else if (t === 'cidade') s = `<rect x="38" y="30" width="20" height="160" fill="#b9c8d2" stroke="${INK}" stroke-width="3"/><path d="M48 40l-34-20M48 40l34-20M48 40V0" stroke="#e8f4f8" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="40" r="10" fill="${p.accent}"/>`;
    else s = `<path d="M20 190L48 60 76 190Z" fill="${p.mid}" stroke="${p.accent}" stroke-width="3"/><path d="M48 60V20" stroke="${p.accent}" stroke-width="5"/>${circ(48, 14, 10, '#fff', 0.9)}`;
  } else if (k === 2) { // elemento médio
    if (t === 'manguezal') s = `<ellipse cx="48" cy="180" rx="40" ry="10" fill="#4a3526"/><path d="M22 180q10-50 26-50 16 0 26 50z" fill="#5a4231" stroke="${INK}" stroke-width="3"/>${circ(48, 128, 14, p.cap)}`;
    else if (t === 'geleira') s = `<ellipse cx="48" cy="180" rx="38" ry="16" fill="#e8fbff" stroke="${INK}" stroke-width="3"/><path d="M30 170l18-50 22 50z" fill="#bfe8f8"/>`;
    else if (t === 'vulcao') s = `<rect x="40" y="110" width="16" height="80" fill="#5a5260" stroke="${INK}" stroke-width="3"/><rect x="30" y="100" width="36" height="14" rx="4" fill="${p.accent}" stroke="${INK}" stroke-width="2"/><path d="M48 96q-14-24 4-44" stroke="#f1e7f1" stroke-width="14" fill="none" opacity=".6" stroke-linecap="round"/>`;
    else if (t === 'fabrica') s = `<rect x="10" y="150" width="76" height="30" rx="14" fill="#444f58" stroke="${INK}" stroke-width="3"/>${circ(26, 165, 9, '#9fb0bb')}${circ(70, 165, 9, '#9fb0bb')}<path d="M14 158h68" stroke="${p.accent}" stroke-width="3" stroke-dasharray="6 5"/><rect x="38" y="100" width="22" height="50" fill="#6b7b86" stroke="${INK}" stroke-width="3"/>`;
    else if (t === 'copas') s = `<path d="M10 188q38-60 76 0z" fill="#3d9a49" stroke="${INK}" stroke-width="3"/><circle cx="36" cy="160" r="6" fill="#ff7a8a"/><circle cx="58" cy="168" r="6" fill="#ffd45a"/>`;
    else if (t === 'oceano') s = `<path d="M20 190q0-60 28-60t28 60z" fill="#8f7fe0" stroke="${INK}" stroke-width="3"/><path d="M30 150h36" stroke="#d9d0ff" stroke-width="4"/>`;
    else if (t === 'cidade') s = `<rect x="14" y="150" width="68" height="36" rx="6" fill="#3d5a68" stroke="${INK}" stroke-width="3"/><path d="M20 160h56M20 170h56" stroke="${p.accent}" stroke-width="4"/><rect x="40" y="120" width="16" height="30" fill="#8fa0ae"/>`;
    else s = `<path d="M48 190V80" stroke="${p.accent}" stroke-width="8"/><path d="M48 80l-24-30 24-26 24 26z" fill="${p.accent}" stroke="${INK}" stroke-width="3" opacity=".9"/>`;
  } else if (k === 3) { // detalhe pequeno
    if (t === 'manguezal') s = `<path d="M30 190v-40M48 190v-56M66 190v-36" stroke="#3c8a4a" stroke-width="7" stroke-linecap="round"/>${circ(30, 146, 7, '#c3f16c')}${circ(66, 150, 7, '#c3f16c')}`;
    else if (t === 'geleira') s = `<path d="M30 190l10-44 10 44zM52 190l12-60 12 60z" fill="#e8fbff" stroke="${INK}" stroke-width="3"/>`;
    else if (t === 'vulcao') s = `<ellipse cx="48" cy="184" rx="36" ry="12" fill="${p.water}" opacity=".9"/><path d="M26 184l8-24 8 24 8-34 8 34z" fill="#ffd28a"/>`;
    else if (t === 'fabrica') s = `<rect x="22" y="134" width="52" height="54" rx="4" fill="#c79a3a" stroke="${INK}" stroke-width="3"/><path d="M22 134l52 54M74 134l-52 54" stroke="#8a6620" stroke-width="3"/>`;
    else if (t === 'copas') s = `<path d="M48 190V120" stroke="#6b4a2e" stroke-width="10"/><path d="M48 130q-30-6-34-34 30-4 34 34zM48 130q30-6 34-34-30-4-34 34z" fill="#58b84a" stroke="${INK}" stroke-width="3"/>`;
    else if (t === 'oceano') s = `<path d="M30 190q-10-40 6-70 4 30 12 0 16 36 6 70M62 190q-6-30 4-52 4 22 10 0 10 26 4 52" fill="#2fb58e" stroke="${INK}" stroke-width="2"/>`;
    else if (t === 'cidade') s = `<rect x="38" y="120" width="20" height="68" fill="#b9c8d2" stroke="${INK}" stroke-width="3"/><circle cx="48" cy="112" r="14" fill="${p.accent}" stroke="${INK}" stroke-width="3"/>`;
    else s = `<path d="M24 190l14-50 10 50 12-70 14 70z" fill="${p.accent}" opacity=".85" stroke="#fff" stroke-width="2"/>`;
  }
  return svg(96, 192, s);
}
function animal(I) {
  const p = I.pal, t = I.theme; let s = '';
  if (t === 'manguezal') s = `<ellipse cx="48" cy="52" rx="26" ry="16" fill="#e0603c" stroke="${INK}" stroke-width="3"/><path d="M22 46l-14-20 14 8M74 46l14-20-14 8M30 66l-10 10M42 68l-4 12M54 68l4 12M66 66l10 10" stroke="#e0603c" stroke-width="5" stroke-linecap="round"/>${circ(40, 38, 5, '#fff')}${circ(56, 38, 5, '#fff')}${circ(40, 38, 2.4, INK)}${circ(56, 38, 2.4, INK)}`;
  else if (t === 'geleira') s = `<ellipse cx="48" cy="62" rx="22" ry="30" fill="#2a3a4a" stroke="${INK}" stroke-width="3"/><ellipse cx="48" cy="70" rx="14" ry="22" fill="#fff"/>${circ(41, 44, 4, '#fff')}${circ(55, 44, 4, '#fff')}${circ(41, 44, 2, INK)}${circ(55, 44, 2, INK)}<path d="M42 52l6 6 6-6z" fill="#ffb347"/><path d="M28 80l-8 10h14M68 80l8 10H62" fill="#ffb347"/>`;
  else if (t === 'vulcao') s = `<path d="M10 70q10-30 40-24 24 4 36 24-16-8-36-4-22-4-40 4z" fill="#ff7a2f" stroke="${INK}" stroke-width="3"/><path d="M86 70q8 0 6-12" stroke="#ff7a2f" stroke-width="6" fill="none"/>${circ(34, 54, 4, '#fff')}${circ(34, 54, 2, INK)}<path d="M26 74l-6 8M46 74l-2 8M66 74l4 8" stroke="#ff7a2f" stroke-width="5" stroke-linecap="round"/>`;
  else if (t === 'fabrica') s = `<rect x="22" y="38" width="52" height="38" rx="10" fill="#9fb0bb" stroke="${INK}" stroke-width="3"/><rect x="30" y="46" width="36" height="14" rx="6" fill="#142a2e"/>${circ(40, 53, 3.5, p.water)}${circ(56, 53, 3.5, p.water)}<rect x="30" y="76" width="36" height="10" rx="5" fill="#556772"/><path d="M48 38V22" stroke="#9fb0bb" stroke-width="4"/>${circ(48, 20, 5, p.accent)}`;
  else if (t === 'copas') s = `<ellipse cx="48" cy="56" rx="22" ry="26" fill="#a07a50" stroke="${INK}" stroke-width="3"/><ellipse cx="48" cy="40" rx="18" ry="16" fill="#d9b88a"/>${circ(41, 38, 4, '#fff')}${circ(55, 38, 4, '#fff')}${circ(41, 38, 2, INK)}${circ(55, 38, 2, INK)}<path d="M44 46q4 4 8 0" stroke="${INK}" stroke-width="2" fill="none"/><path d="M26 56q-14-4-16 12M70 56q14-4 16 12" stroke="#a07a50" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  else if (t === 'oceano') s = `<path d="M10 50q20-26 50-14 14 6 26 14-12 8-26 14-30 12-50-14z" fill="#ffb347" stroke="${INK}" stroke-width="3"/><path d="M86 50l10-14v28z" fill="#ff7a2f"/>${circ(28, 46, 4, '#fff')}${circ(28, 46, 2, INK)}<path d="M40 38v24M54 40v20" stroke="#fff" stroke-width="4" opacity=".8"/>`;
  else if (t === 'cidade') s = `<ellipse cx="48" cy="48" rx="26" ry="12" fill="#e8f4f8" stroke="${INK}" stroke-width="3"/><rect x="34" y="40" width="28" height="10" rx="5" fill="${p.accent}"/><path d="M14 40h20M62 40h20" stroke="#8fa0ae" stroke-width="5"/>${circ(14, 38, 8, '#8fa0ae')}${circ(82, 38, 8, '#8fa0ae')}`;
  else s = `<path d="M48 12l-14 30h28z" fill="${p.accent}" stroke="${INK}" stroke-width="3"/><path d="M26 42h44l8 40H18z" fill="#3a3f7a" stroke="${p.accent}" stroke-width="3"/>${circ(48, 62, 9, p.accent)}`;
  return svg(96, 96, s);
}
function binSvg(I) { const p = I.pal; return svg(48, 64, `<defs>${grad('m', shade(p.accent, -0.15), shade(p.accent, -0.55))}</defs><path d="M8 16h32l-3 42H11Z" fill="url(#m)" stroke="${INK}" stroke-width="3"/><rect x="5" y="11" width="38" height="9" rx="3" fill="${p.accent}" stroke="${INK}" stroke-width="3"/><path d="M18 7h12v5H18Z" fill="none" stroke="${INK}" stroke-width="3"/><text x="24" y="44" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="#fff" stroke="${INK}" stroke-width="1">♻</text>`); }

// cor: clareia/escurece um hex (-1..1)
function shade(hex, a) { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.max(0, Math.min(255, Math.round(a >= 0 ? c + (255 - c) * a : c * (1 + a)))); const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255); return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`; }


// ------------------------------------------------------------------ inimigos exclusivos de cada ilha (96x96, olhando para a direita)
const eye = (x, y, r = 5, look = 1.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="${x + look}" cy="${y + 0.5}" r="${r * 0.5}" fill="${INK}"/>`;
const brow = (x, y, w = 11, tilt = 4) => `<path d="M${x} ${y}l${w} ${tilt}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
const ENEMY_ART = {
  fiddler: `<g stroke="#b8442a" stroke-width="4" stroke-linecap="round" fill="none"><path d="M26 62l-10 12M34 66l-6 14M62 66l6 14M70 62l10 12"/></g><ellipse cx="48" cy="58" rx="26" ry="17" fill="#e0603c" stroke="${INK}" stroke-width="3"/><path d="M68 50q14-6 16-24-14 4-22 18z" fill="#f07a4c" stroke="${INK}" stroke-width="3"/><path d="M80 24q8 6 2 14" stroke="${INK}" stroke-width="3" fill="none"/><path d="M22 52q-12-2-12-12 10 2 14 8z" fill="#e0603c" stroke="${INK}" stroke-width="3"/><path d="M36 44v-10M54 44v-10" stroke="#b8442a" stroke-width="4"/>${eye(36, 31, 6)}${eye(54, 31, 6)}${brow(30, 24, 12, 4)}${brow(48, 28, 12, -4)}`,
  dragonfly: `<ellipse cx="34" cy="38" rx="26" ry="9" fill="#bff7f0" opacity=".65" stroke="#4fb8ae" stroke-width="2" transform="rotate(-14 34 38)"/><ellipse cx="58" cy="36" rx="26" ry="9" fill="#bff7f0" opacity=".65" stroke="#4fb8ae" stroke-width="2" transform="rotate(10 58 36)"/><ellipse cx="34" cy="52" rx="24" ry="7" fill="#bff7f0" opacity=".55" stroke="#4fb8ae" stroke-width="2" transform="rotate(14 34 52)"/><path d="M14 52Q34 50 60 46" stroke="#1f9a8e" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M60 46q8-2 14 2" stroke="#1f9a8e" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="76" cy="46" r="11" fill="#34c9b6" stroke="${INK}" stroke-width="3"/>${eye(79, 44, 5, 1.8)}${brow(72, 36, 10, 3)}`,
  penguin: `<ellipse cx="48" cy="86" rx="22" ry="5" fill="#0003"/><ellipse cx="48" cy="54" rx="24" ry="32" fill="#27425e" stroke="${INK}" stroke-width="3"/><ellipse cx="52" cy="62" rx="15" ry="23" fill="#f4fbff"/><path d="M24 50q-12 10-8 26 10-8 12-22zM72 50q12 10 8 26-10-8-12-22z" fill="#27425e" stroke="${INK}" stroke-width="3"/>${eye(44, 38, 6)}${eye(60, 38, 6)}${brow(36, 28, 13, 5)}${brow(56, 33, 13, -5)}<path d="M50 46l14 4-14 6z" fill="#ffb02e" stroke="${INK}" stroke-width="2"/><path d="M36 86h14M54 86h14" stroke="#ffb02e" stroke-width="6" stroke-linecap="round"/>`,
  snowowl: `<path d="M14 40q22-22 34-8-6 22-34 28z" fill="#9fd0ec" stroke="${INK}" stroke-width="3"/><path d="M82 40q-22-22-34-8 6 22 34 28z" fill="#9fd0ec" stroke="${INK}" stroke-width="3"/><ellipse cx="48" cy="52" rx="20" ry="26" fill="#f4fbff" stroke="${INK}" stroke-width="3"/><path d="M32 30l-4-12 12 6M64 30l4-12-12 6" fill="#f4fbff" stroke="${INK}" stroke-width="3"/><circle cx="40" cy="42" r="8" fill="#ffe14a" stroke="${INK}" stroke-width="2"/><circle cx="58" cy="42" r="8" fill="#ffe14a" stroke="${INK}" stroke-width="2"/><circle cx="42" cy="43" r="3.5" fill="${INK}"/><circle cx="60" cy="43" r="3.5" fill="${INK}"/>${brow(31, 32, 13, 5)}${brow(52, 37, 13, -5)}<path d="M45 52l3 8 3-8z" fill="#ff9b2e" stroke="${INK}" stroke-width="2"/><path d="M38 70q10 6 20 0" stroke="#9fd0ec" stroke-width="4" fill="none"/>`,
  salamander: `<path d="M8 70q-6-24 14-22 18 2 22 12" stroke="#ff7a2f" stroke-width="9" stroke-linecap="round" fill="none"/><ellipse cx="46" cy="62" rx="28" ry="14" fill="#ff7a2f" stroke="${INK}" stroke-width="3"/><circle cx="26" cy="60" r="4" fill="#ffd28a"/><circle cx="40" cy="55" r="4" fill="#ffd28a"/><circle cx="54" cy="59" r="4" fill="#ffd28a"/><path d="M26 72l-6 12M44 74l-3 12M60 72l6 12M72 66l12 8" stroke="#d9561a" stroke-width="6" stroke-linecap="round"/><path d="M68 54q18-8 24 8-10 10-26 4z" fill="#ff8a3a" stroke="${INK}" stroke-width="3"/>${eye(80, 56, 5, 1.6)}${brow(74, 47, 10, 3)}<path d="M84 66l10 2" stroke="${INK}" stroke-width="2.5"/>`,
  ember: `<path d="M48 8q8 22 22 32 14 12 8 30-8 18-30 18T18 70q-8-18 8-32 6 12 12 8-6-20 10-38z" fill="#ff8a2f" stroke="${INK}" stroke-width="3"/><path d="M48 34q6 14 16 22 8 12-2 22-8 8-18 8t-18-8q-8-10 2-22 6 8 10 4-4-14 10-26z" fill="#ffd45a"/>${eye(40, 62, 6)}${eye(58, 62, 6)}${brow(32, 52, 12, 5)}${brow(52, 57, 12, -5)}<path d="M42 78q8 5 16 0" stroke="${INK}" stroke-width="3" fill="none"/>`,
  sweeper: `<circle cx="26" cy="82" r="9" fill="#3a444c" stroke="${INK}" stroke-width="3"/><circle cx="70" cy="82" r="9" fill="#3a444c" stroke="${INK}" stroke-width="3"/><rect x="16" y="40" width="64" height="40" rx="12" fill="#9fb0bb" stroke="${INK}" stroke-width="3"/><rect x="24" y="48" width="38" height="20" rx="8" fill="#142a2e"/><circle cx="50" cy="58" r="7" fill="#ff4a3d"/><circle cx="52" cy="58" r="2.5" fill="#fff"/><rect x="64" y="52" width="10" height="20" rx="3" fill="#ffcf4a" stroke="${INK}" stroke-width="2"/><path d="M80 78l12-4M80 84l12 2M80 72l12-10" stroke="#ffcf4a" stroke-width="4" stroke-linecap="round"/><rect x="42" y="26" width="6" height="16" fill="#6b7b86"/><circle cx="45" cy="24" r="5" fill="#ff4a3d"/>`,
  cogdrone: `<path d="M48 30V18M36 18h24" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><ellipse cx="48" cy="16" rx="26" ry="3" fill="#9fb0bb" opacity=".8"/>${gear(48, 56, 24, '#9fb0bb', 12)}<circle cx="48" cy="56" r="13" fill="#142a2e"/><circle cx="52" cy="56" r="7" fill="#ff4a3d"/><circle cx="54" cy="54" r="2.5" fill="#fff"/><path d="M26 80l-8 10M70 80l8 10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  monkey: `<path d="M20 70q-18 4-12-20 2 8 12 10" stroke="#8a5a34" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="44" cy="68" rx="20" ry="18" fill="#8a5a34" stroke="${INK}" stroke-width="3"/><ellipse cx="46" cy="72" rx="11" ry="11" fill="#e8c9a0"/><circle cx="62" cy="40" r="19" fill="#8a5a34" stroke="${INK}" stroke-width="3"/><circle cx="46" cy="38" r="8" fill="#e8c9a0" stroke="${INK}" stroke-width="2.5"/><ellipse cx="66" cy="44" rx="13" ry="11" fill="#e8c9a0"/>${eye(60, 36, 5, 1.4)}${eye(72, 36, 5, 1.8)}${brow(54, 27, 11, 5)}${brow(68, 31, 11, -5)}<path d="M62 50q5 4 10 0" stroke="${INK}" stroke-width="3" fill="none"/><path d="M32 82l-6 8M58 82l6 8M30 62l-12 12M60 62l12 12" stroke="#8a5a34" stroke-width="6" stroke-linecap="round"/>`,
  toucan: `<path d="M10 52q18-14 36-10l-2 22q-22 4-34-12z" fill="#1f2a30" stroke="${INK}" stroke-width="3"/><ellipse cx="48" cy="54" rx="22" ry="20" fill="#1f2a30" stroke="${INK}" stroke-width="3"/><ellipse cx="54" cy="60" rx="11" ry="12" fill="#fff4cf"/><circle cx="62" cy="40" r="15" fill="#1f2a30" stroke="${INK}" stroke-width="3"/><path d="M68 34q24 0 26 16-18 4-30 0z" fill="#ff9b2e" stroke="${INK}" stroke-width="3"/><path d="M68 42h24" stroke="#d8641a" stroke-width="3"/><path d="M68 34q10 0 16 4" stroke="#ffd45a" stroke-width="4" fill="none"/>${eye(60, 36, 5, 1.4)}${brow(54, 28, 10, 4)}<path d="M30 66l-10 14M42 70l-6 16" stroke="#ffd45a" stroke-width="5" stroke-linecap="round"/>`,
  urchin: `<g stroke="#6a3fa8" stroke-width="5" stroke-linecap="round">${Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2 - Math.PI / 2; return `<path d="M${48 + Math.cos(a) * 18} ${56 + Math.sin(a) * 18}L${48 + Math.cos(a) * 36} ${56 + Math.sin(a) * 36}"/>`; }).join('')}</g><circle cx="48" cy="56" r="26" fill="#8a5acf" stroke="${INK}" stroke-width="3"/>${eye(40, 52, 6)}${eye(58, 52, 6)}${brow(32, 42, 12, 5)}${brow(52, 47, 12, -5)}<path d="M40 68q8 5 16 0" stroke="${INK}" stroke-width="3" fill="none"/>`,
  jelly: `<path d="M18 50q0-34 30-34t30 34z" fill="#c7a6ff" opacity=".85" stroke="${INK}" stroke-width="3"/><path d="M22 50q2-22 26-26" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/><path d="M26 50q-4 18 4 30M38 50q-2 20 4 36M50 50q2 20-4 36M62 50q4 18-4 32M72 50q4 14-2 26" stroke="#b08cf0" stroke-width="5" fill="none" stroke-linecap="round"/>${eye(38, 38, 5)}${eye(58, 38, 5)}${brow(30, 29, 11, 4)}${brow(52, 33, 11, -4)}`,
  sentinel: `<rect x="26" y="78" width="14" height="12" rx="3" fill="#3a444c" stroke="${INK}" stroke-width="3"/><rect x="54" y="78" width="14" height="12" rx="3" fill="#3a444c" stroke="${INK}" stroke-width="3"/><rect x="22" y="38" width="50" height="44" rx="10" fill="#b9c8d2" stroke="${INK}" stroke-width="3"/><path d="M28 62h38" stroke="#7cf0a4" stroke-width="4"/><rect x="28" y="12" width="38" height="28" rx="9" fill="#d3dfe6" stroke="${INK}" stroke-width="3"/><rect x="33" y="19" width="28" height="12" rx="5" fill="#142a2e"/><circle cx="52" cy="25" r="4" fill="#ff4a3d"/><path d="M72 46q16 2 18 18-12 6-20 0z" fill="#8fa0ae" stroke="${INK}" stroke-width="3"/><path d="M48 12V4" stroke="${INK}" stroke-width="3"/><circle cx="48" cy="4" r="3" fill="#7cf0a4"/>`,
  orbdrone: `<ellipse cx="48" cy="52" rx="38" ry="10" fill="none" stroke="#7cf0a4" stroke-width="4" opacity=".9"/><circle cx="48" cy="48" r="24" fill="#e8f4f8" stroke="${INK}" stroke-width="3"/><circle cx="48" cy="48" r="14" fill="#142a2e"/><circle cx="48" cy="48" r="8" fill="#7cf0a4"/><circle cx="51" cy="45" r="3" fill="#fff"/><path d="M48 24V12M40 12h16" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><ellipse cx="48" cy="52" rx="38" ry="10" fill="none" stroke="#7cf0a4" stroke-width="4" stroke-dasharray="40 200" stroke-dashoffset="-120"/>`,
  golem: `<rect x="20" y="76" width="22" height="14" rx="4" fill="#4a4f9a" stroke="${INK}" stroke-width="3"/><rect x="54" y="76" width="22" height="14" rx="4" fill="#4a4f9a" stroke="${INK}" stroke-width="3"/><path d="M16 40q-12 10-6 32 14-2 16-14zM80 40q12 10 6 32-14-2-16-14z" fill="#5a5fb0" stroke="${INK}" stroke-width="3"/><path d="M22 76L20 44 34 26h28l14 18-2 32z" fill="#6a70c8" stroke="${INK}" stroke-width="3"/><path d="M34 26L28 8l16 8zM62 26l6-18-16 8z" fill="#8bf0b4" stroke="${INK}" stroke-width="3"/><path d="M30 44h36L62 76H34z" fill="#4a4f9a"/><circle cx="48" cy="58" r="9" fill="#8bf0b4" stroke="${INK}" stroke-width="2"/><circle cx="48" cy="58" r="4" fill="#fff"/><rect x="34" y="34" width="10" height="7" rx="2" fill="#9cffb5"/><rect x="52" y="34" width="10" height="7" rx="2" fill="#9cffb5"/>`,
  wisp: `<path d="M48 6q10 24 24 34 12 14 4 32-10 18-32 14T18 70q-6-14 6-30 4 10 10 8-4-22 14-42z" fill="#8bf0b4" opacity=".92" stroke="#2fa070" stroke-width="3"/><path d="M48 30q6 16 16 24 8 12-2 22-8 8-16 6t-14-10q-6-10 4-22 4 6 8 2-2-12 4-22z" fill="#d6ffe6"/>${eye(40, 56, 6)}${eye(58, 56, 6)}${brow(32, 46, 12, 5)}${brow(52, 51, 12, -5)}<circle cx="20" cy="30" r="3" fill="#d6ffe6"/><circle cx="78" cy="22" r="2.5" fill="#d6ffe6"/>`,
};
const enemySvg = (kind) => svg(96, 96, ENEMY_ART[kind]);

// ------------------------------------------------------------------ layouts em partes (A, B, C, C2, D)
/**
 * Cada parte tem 357 px de largura de cena e termina com o chão em y=220, assim as emendas se encaixam.
 * Buracos (≤ 38 px de cena ≈ 95 px reais) e alturas (≤ 50 px de degrau ≈ 125 px reais) cabem no pulo.
 */
function partsFor(I) {
  const R = rng(I.n * 1009); const P = I.p; const g = `${P}_ground`, l = `${P}_ledge`, b = `${P}_bridge`, c = `${P}_crate`;
  const j = (v, a) => Math.round(v + (R() - 0.5) * a);
  const gr = (x, w) => ({ x, y: 220, w, kind: 'ground', tile: g });
  const pl = (x, y, w) => ({ x, y, w, kind: 'plat', tile: l });
  const br = (x, y, w) => ({ x, y, w, kind: 'bridge', tile: b });
  const crates = (x, w, rows = 1) => ({ x, y: 220, w, kind: 'crates', tile: c, rows });
  const dec = (x, n, sc = 1) => ({ x, y: 220, tile: n === 0 ? `${P}_prop` : n === 1 ? `${P}_prop2` : n === 2 ? `${P}_prop3` : `${P}_animal`, scale: sc });
  // jitter calculado uma única vez por ponto de emenda (assim o chão sempre fecha em 357)
  const e1 = j(140, 12), e2 = j(176, 10), f1 = j(96, 10), f2 = j(132, 8), f3 = j(268, 8), h1 = j(120, 10), h2 = j(158, 8);
  const A = { surfaces: [gr(0, 357), pl(j(86, 14), 176, 62), br(j(214, 14), 150, 68)], ladders: [], decor: [dec(52, 0, 1.05), dec(310, 2, 0.9), dec(190, 3, 0.55)] };
  const B = { surfaces: [gr(0, e1), gr(e2, 357 - e2), pl(j(112, 10), 172, 64), pl(j(228, 12), 150, 70), crates(j(262, 10), 40)], ladders: [], decor: [dec(40, 1, 1), dec(330, 0, 0.85), dec(120, 3, 0.55)] };
  const C = { surfaces: [gr(0, f1), gr(f2, 100), gr(f3, 357 - f3), br(j(88, 8), 160, 62), pl(j(196, 10), 142, 68), pl(j(24, 10), 174, 60)], ladders: [], decor: [dec(60, 2, 1), dec(212, 0, 0.9), dec(304, 3, 0.55)] };
  const C2 = { surfaces: [gr(0, h1), gr(h2, 357 - h2), pl(j(66, 12), 168, 62), pl(j(134, 10), 144, 60), br(j(230, 10), 160, 80), crates(j(296, 8), 38, 1)], ladders: [], decor: [dec(30, 0, 1), dec(190, 1, 0.9), dec(332, 3, 0.55)] };
  const D = { surfaces: [gr(0, 357), pl(j(40, 12), 172, 62), pl(j(126, 12), 150, 64), br(j(190, 10), 146, 62)], ladders: [], decor: [dec(82, 1, 1.05), dec(238, 0, 1), dec(330, 2, 0.9)] };
  return [A, B, C, C2, D];
}

// ------------------------------------------------------------------ escrita
const catalogEntries = []; const islandCatalog = [];
for (const I of ISLANDS) {
  const base = `${I.slug}`;
  emit(`${base}/background/sky.svg`, sky(I)); emit(`${base}/background/far.svg`, far(I)); emit(`${base}/background/mid.svg`, mid(I)); emit(`${base}/background/near.svg`, near(I));
  emit(`${base}/tiles/ground.svg`, groundTile(I, 'ground')); emit(`${base}/tiles/ledge.svg`, groundTile(I, 'ledge')); emit(`${base}/tiles/bridge.svg`, bridgeTile(I));
  emit(`${base}/tiles/block.svg`, blockTile(I)); emit(`${base}/tiles/crate.svg`, crateTile(I));
  emit(`${base}/props.svg`, props(I, 1)); emit(`${base}/prop2.svg`, props(I, 2)); emit(`${base}/prop3.svg`, props(I, 3)); emit(`${base}/animal.svg`, animal(I)); emit(`${base}/bin.svg`, binSvg(I));
  emit(`${base}/enemy_walker.svg`, enemySvg(I.ownWalker)); emit(`${base}/enemy_flyer.svg`, enemySvg(I.ownFlyer));
  const layers = ['sky', 'far', 'mid', 'near'].map((x) => `<image href="data:image/svg+xml;utf8,${encodeURIComponent(({ sky, far, mid, near }[x])(I))}" width="1024" height="600"/>`).join('');
  emit(`${base}/thumbnail.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 1024 576" preserveAspectRatio="xMidYMid slice">${layers}</svg>`);
  const T = (name, role, cat, src, w, h, extra = {}) => catalogEntries.push({ name: `${I.p}_${name}`, phase: I.n, category: cat, role, src: `/assets/islands/${base}/${src}`, w, h, hitbox: { x: 0, y: 0, w, h }, issues: [], modular: false, capPx: 0, surfaceInset: 0, lip: 0, ...extra });
  T('ground', 'ground', 'terrain', 'tiles/ground.svg', 128, 96, { modular: true, capPx: 26, lip: 0.1 });
  T('ledge', 'ledge', 'terrain', 'tiles/ledge.svg', 128, 64, { modular: true, capPx: 26, lip: 0.1 });
  T('bridge', 'bridge', 'terrain', 'tiles/bridge.svg', 128, 40, { modular: true, capPx: 24, lip: 0.1 });
  T('block', 'block', 'terrain', 'tiles/block.svg', 64, 64); T('crate', 'crate', 'props', 'tiles/crate.svg', 64, 64);
  T('prop', 'decoration', 'props', 'props.svg', 96, 192); T('prop2', 'decoration', 'props', 'prop2.svg', 96, 192); T('prop3', 'decoration', 'props', 'prop3.svg', 96, 192);
  T('animal', 'animal', 'props', 'animal.svg', 96, 96); T('walker', 'enemy', 'enemies', 'enemy_walker.svg', 96, 96); T('flyer', 'enemy', 'enemies', 'enemy_flyer.svg', 96, 96); T('bin', 'recycling-bin', 'props', 'bin.svg', 48, 64);
  islandCatalog.push({ id: I.id, name: I.name, slug: I.slug, palette: { sky: I.pal.sky, far: I.pal.far, mid: I.pal.mid, near: I.pal.near, water: I.pal.water, ground: I.pal.ground, accent: I.pal.accent }, theme: I.theme, index: I.n - 1,
    layers: Object.fromEntries(['sky', 'far', 'mid', 'near'].map((x) => [x, `/assets/islands/${base}/background/${x}.svg`])),
    tiles: Object.fromEntries(['ground', 'ledge', 'bridge', 'block', 'crate'].map((x) => [x, `/assets/islands/${base}/tiles/${x}.svg`])),
    props: [`/assets/islands/${base}/props.svg`, `/assets/islands/${base}/prop2.svg`, `/assets/islands/${base}/prop3.svg`], animal: `/assets/islands/${base}/animal.svg`, bin: `/assets/islands/${base}/bin.svg`, thumbnail: `/assets/islands/${base}/thumbnail.svg` });
}
emit('catalog.json', JSON.stringify(islandCatalog, null, 2));

// catálogo de sprites por fase: troca as entradas p09..p16 e mantém as p01..p08
const phCat = 'public/assets/phases/catalog.json';
const old = JSON.parse(fs.readFileSync(phCat, 'utf8')).filter((e) => !/^p(09|1[0-6])_/.test(e.name));
fs.writeFileSync(phCat, JSON.stringify([...old, ...catalogEntries], null, 2));

// catalog-data.json: lista das ilhas
const cd = 'src/app/catalog-data.json'; const cat = JSON.parse(fs.readFileSync(cd, 'utf8'));
cat.newIslands = ISLANDS.map((I) => ({ id: I.id, name: I.name, index: I.n - 1, theme: I.theme, difficulty: I.n, palette: islandCatalog.find((x) => x.id === I.id).palette }));
fs.writeFileSync(cd, JSON.stringify(cat, null, 2) + '\n');
fs.writeFileSync('../backend/catalog-data.json', JSON.stringify(cat, null, 2) + '\n'); // cópia usada quando só a pasta backend/ é publicada

// layouts (arquivo gerado) e configs de nível
const lay = ISLANDS.map((I) => { const parts = partsFor(I); return `  {\n    id: '${I.id}', name: '${I.name}', biome: '${I.biome}', objective: '${I.objective}', sceneH: 238, screens: 5, accent: '${I.pal.accent}',${I.boss ? ' boss: true,' : ''}\n    surfaces: [], ladders: [], decor: [],\n    parts: ${JSON.stringify(parts)},\n    walkers: ${JSON.stringify([I.ownWalker, I.walkers[0]])}, flyers: ${JSON.stringify([I.ownFlyer, I.flyers[0]])}, materials: ${JSON.stringify(I.materials)}, bin: '${I.p}_bin',\n  },`; }).join('\n');
fs.writeFileSync('src/game/levels/islandLayouts.ts', `// GERADO por tools/build_island_kits.mjs — não edite à mão.\nimport type { Layout } from './layouts';\nexport const islandLayouts: Layout[] = [\n${lay}\n];\n`);
const cfgs = ISLANDS.map((I) => `  { ...forestConfig, id:'${I.id}', name:'${I.name}', biome:'${I.biome}', worldWidth:${I.worldWidth}, palette:{sky:'${I.pal.sky}',canopy:'${I.pal.mid}',ground:'${I.pal.ground}',accent:'${I.pal.accent}'}, objective:'${I.objective}' },`).join('\n');
fs.writeFileSync('src/game/levels/islandConfigs.ts', `// GERADO por tools/build_island_kits.mjs — não edite à mão.\nimport type { LevelConfig } from './levelTypes';\nimport { forestConfig } from './forestConfig';\nexport const islandConfigs: LevelConfig[] = [\n${cfgs}\n];\n`);
console.log(`Gerados ${ISLANDS.length} kits, ${catalogEntries.length} entradas de catálogo.`);
