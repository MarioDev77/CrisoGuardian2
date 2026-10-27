import type { LevelConfig } from './levelTypes';
import { forestConfig } from './forestConfig';

/** Shared schema for the eight biomes. Later levels reuse the same engine and procedural generator. */
export const levelConfigs: LevelConfig[] = [
  forestConfig,
  { ...forestConfig, id:'river-02', name:'Rio Limpo', biome:'Margens de rio', worldWidth:4620, palette:{sky:'#83d9ed',canopy:'#287e87',ground:'#745b3d',accent:'#54e6d0'}, objective:'Limpe as margens e atravesse o rio até o portal.' },
  { ...forestConfig, id:'city-03', name:'Cidade Verde', biome:'Parque urbano', worldWidth:4620, palette:{sky:'#9bd8f3',canopy:'#4e9872',ground:'#656b64',accent:'#72e58b'}, objective:'Recupere os resíduos da cidade e restaure o parque.' },
  { ...forestConfig, id:'mountain-04', name:'Montanha', biome:'Montanhas rochosas', worldWidth:5040, groundY:470, palette:{sky:'#a6d6ed',canopy:'#6d9c91',ground:'#766d62',accent:'#c7ef83'}, objective:'Suba pelos caminhos rochosos e alcance o cume.' },
  { ...forestConfig, id:'beach-05', name:'Praia Limpa', biome:'Costa tropical', worldWidth:4620, palette:{sky:'#7bd8f3',canopy:'#319b83',ground:'#c7a66b',accent:'#8af2b1'}, objective:'Retire o lixo da praia e proteja a vida marinha.' },
  { ...forestConfig, id:'desert-06', name:'Deserto', biome:'Deserto sustentável', worldWidth:5040, palette:{sky:'#f5c47b',canopy:'#bd8b48',ground:'#a96d42',accent:'#e8ed78'}, objective:'Atravesse as dunas recolhendo materiais descartados.' },
  { ...forestConfig, id:'metro-07', name:'Metrópole Sustentável', biome:'Centro metropolitano', worldWidth:5040, palette:{sky:'#8cb7d8',canopy:'#526d79',ground:'#515b62',accent:'#7cf0a4'}, objective:'Recupere os materiais e reative o corredor verde.' },
  { ...forestConfig, id:'planet-08', name:'Planeta Crisoverde', biome:'Eco-mundo futurista', worldWidth:5460, palette:{sky:'#7b9ce7',canopy:'#4357a3',ground:'#514c79',accent:'#9cffb5'}, objective:'Conclua a missão ecológica e restaure o planeta.' },
  { ...forestConfig, id:'manguezal-09', name:'Manguezal Vivo', biome:'Manguezal e raízes filtrantes', worldWidth:5460, palette:{sky:'#a5e3df',canopy:'#257b69',ground:'#704f38',accent:'#c3f16c'}, objective:'Atravesse os canais entre raízes e recupere os materiais do mangue.' },
  { ...forestConfig, id:'geleira-10', name:'Geleira Azul', biome:'Geleiras e água doce', worldWidth:5880, palette:{sky:'#b7e6f2',canopy:'#4c91b5',ground:'#526d7d',accent:'#f2ffff'}, objective:'Cruze as placas de gelo e proteja a nascente congelada.' },
  { ...forestConfig, id:'vulcao-11', name:'Vulcão Verde', biome:'Vulcão de energia limpa', worldWidth:6300, palette:{sky:'#8b88ad',canopy:'#483b4a',ground:'#3a353c',accent:'#b5eb6d'}, objective:'Desvie das rochas quentes e estabilize o portal de energia renovável.' },
];
