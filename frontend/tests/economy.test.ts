import { describe, expect, it } from 'vitest';
import { equip, freshEconomy, purchase, recycle, sanitizeEconomy, settleRun } from '../src/app/economy';

const items=(n:number,type:'coin'|'material'='coin',material='papel')=>Array.from({length:n},(_,i)=>({id:`${type}-${material}-${i}`,type,...(type==='material'?{material}:{})})) as {id:string;type:'coin'|'material';material?:string}[];
describe('economia offline',()=>{
 it('bloqueia saldo insuficiente, ids desconhecidos, decimais e valores negativos',()=>{const s=freshEconomy();expect(purchase(s,'pet-brasa').ok).toBe(false);expect(purchase({...s,coins:1000},'admin').ok).toBe(false);expect(recycle({...s,materials:{...s.materials,papel:100}},'papel',-1).ok).toBe(false);expect(recycle({...s,materials:{...s.materials,papel:100}},'papel',1.5).ok).toBe(false);});
 it('compra em commit único e bloqueia segundo clique no mesmo item',()=>{const s={...freshEconomy(),coins:300};const a=purchase(s,'pet-foxy');expect(a.ok).toBe(true);const b=purchase(a.state,'pet-foxy');expect(b.ok).toBe(false);expect(b.state.coins).toBe(0);expect(b.state.owned.filter(x=>x==='pet-foxy')).toHaveLength(1);});
 it('recicla material uma vez, com taxa fixa e sem saldo negativo',()=>{const s={...freshEconomy(),materials:{...freshEconomy().materials,papel:10}};const a=recycle(s,'papel',1);expect(a).toMatchObject({ok:true,state:{coins:15,materials:{papel:0}}});expect(recycle(a.state,'papel',1).ok).toBe(false);});
 it('rejeita repetição do mesmo spawn na partida e entre reinícios',()=>{const s=freshEconomy();const run={level:0,time:120,won:true,collectibles:[items(1)[0]!,items(1)[0]!]};const a=settleRun(s,run);expect(a.rewardCoins).toBe(1);const b=settleRun(a.state,run);expect(b.rewardCoins).toBe(0);expect(b.state.coins).toBe(1);});
 it('limita moedas e materiais por duração e por partida; descarta excesso',()=>{const s=freshEconomy();const collect=[...items(100),...items(100,'material','vidro')];const a=settleRun(s,{level:0,time:1800,won:true,collectibles:collect});expect(a.rewardCoins).toBe(60);expect(a.rewardMaterials).toBe(80);expect(a.discarded).toBe(60);expect(a.state.materials.vidro).toBe(80);});
 it('não recompensa derrota, tempo impossível ou run sem duração mínima',()=>{const s=freshEconomy();for(const run of [{level:0,time:120,won:false,collectibles:items(10)},{level:0,time:9999,won:true,collectibles:items(10)},{level:0,time:3,won:true,collectibles:items(10)}])expect(settleRun(s,run).state).toBe(s);});
 it('descarta campos adulterados na sanitização e não concede itens',()=>{const s=sanitizeEconomy({coins:-1,materials:{papel:1.2,vidro:20},owned:['pet-brasa','skin-admin'],equippedPet:'pet-brasa'});expect(s.coins).toBe(0);expect(s.materials.papel).toBe(0);expect(s.owned).toEqual(['pet-brasa','skin-crisoman-verde','skin-crisogirl-rosa']);expect(s.equippedPet).toBe('pet-brasa');});
});


describe('fluxo econômico completo',()=>{
 it('jogar, coletar, reciclar, comprar, equipar e jogar de novo sem repetir spawn',()=>{
  let state=freshEconomy();
  const coins=(prefix:string,n:number)=>Array.from({length:n},(_,i)=>({id:`${prefix}-coin-${i}`,type:'coin' as const}));
  const paper=Array.from({length:10},(_,i)=>({id:`paper-${i}`,type:'material' as const,material:'papel'}));
  let a=settleRun(state,{level:0,time:480,won:true,collectibles:[...coins('run1',90),...paper]});state=a.state;expect(a.rewardCoins).toBe(60);expect(a.rewardMaterials).toBe(10);
  const b=settleRun(state,{level:1,time:480,won:true,collectibles:coins('run2',90)});state=b.state;expect(state.coins).toBe(120);
  const trade=recycle(state,'papel',1);expect(trade.ok).toBe(true);state=trade.state;const buy=purchase(state,'skin-crisoman-urbano');expect(buy.ok).toBe(true);state=buy.state;state=equip(state,'skin-crisoman-urbano');expect(state.equippedSkin.crisoman).toBe('skin-crisoman-urbano');
  const replay=settleRun(state,{level:0,time:480,won:true,collectibles:[...coins('run1',90),...paper]});expect(replay.rewardCoins).toBe(0);expect(replay.rewardMaterials).toBe(0);expect(replay.state.coins).toBe(15);expect(replay.state.materials.papel).toBe(0);
 });
});
