// GERADO por tools/build_island_kits.mjs — não edite à mão.
import type { LevelConfig } from './levelTypes';
import { forestConfig } from './forestConfig';
export const islandConfigs: LevelConfig[] = [
  { ...forestConfig, id:'manguezal-09', name:'Manguezal Vivo', biome:'Manguezal e raízes filtrantes', worldWidth:5460, palette:{sky:'#bff0e6',canopy:'#2f8068',ground:'#6a4a34',accent:'#c3f16c'}, objective:'Atravesse os canais entre raízes e recupere os materiais do mangue.' },
  { ...forestConfig, id:'geleira-10', name:'Geleira Azul', biome:'Geleiras, cavernas e água doce', worldWidth:5880, palette:{sky:'#d8f3ff',canopy:'#6aa9cc',ground:'#6f90a8',accent:'#bff3ff'}, objective:'Cruze as placas de gelo e proteja a nascente congelada.' },
  { ...forestConfig, id:'vulcao-11', name:'Vulcão Verde', biome:'Vulcão de energia geotérmica', worldWidth:6300, palette:{sky:'#3d2a55',canopy:'#3d2a40',ground:'#3b3340',accent:'#b5eb6d'}, objective:'Desvie das rochas quentes e estabilize o portal de energia renovável.' },
  { ...forestConfig, id:'fabrica-12', name:'Fábrica da Reciclagem', biome:'Complexo industrial de reciclagem', worldWidth:6300, palette:{sky:'#cfe3e0',canopy:'#566f78',ground:'#4a5560',accent:'#ffcf4a'}, objective:'Cruze as esteiras e reative as máquinas de reciclagem.' },
  { ...forestConfig, id:'copas-13', name:'Floresta das Copas', biome:'Dossel de árvores gigantes', worldWidth:6300, palette:{sky:'#f3ffc9',canopy:'#2f7d3a',ground:'#6b4a2e',accent:'#e5ff7a'}, objective:'Suba pelos galhos gigantes e proteja as copas da floresta.' },
  { ...forestConfig, id:'oceano-14', name:'Oceano Cristalino', biome:'Recifes e fundo do mar', worldWidth:6720, palette:{sky:'#9fe6ff',canopy:'#1f7da8',ground:'#b9a679',accent:'#6cf2d6'}, objective:'Limpe os recifes e devolva a cor ao oceano.' },
  { ...forestConfig, id:'cidade-15', name:'Cidade do Futuro', biome:'Metrópole de energia limpa', worldWidth:6720, palette:{sky:'#6fd3e8',canopy:'#4d8aa3',ground:'#52606c',accent:'#7cf0a4'}, objective:'Reative a rede de energia limpa da cidade tecnológica.' },
  { ...forestConfig, id:'guardiao-16', name:'Guardião do Planeta', biome:'Santuário final do planeta', worldWidth:7140, palette:{sky:'#171a4a',canopy:'#2a2f78',ground:'#3a3f7a',accent:'#9cffb5'}, objective:'Enfrente o chefe final e restaure o equilíbrio do planeta.' },
];
