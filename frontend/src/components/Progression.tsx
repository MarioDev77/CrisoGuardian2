import { useState } from 'react';
import type { EconomyState } from '../app/economy';
import type { ProgressionState } from '../app/api';
import type { Progress } from '../app/progress';
import { PETS } from '../app/catalog';
import HubHeader from './HubHeader';
import type { HubSection } from './HubHeader';
import s from './Hub.module.css';

type Props = { economy: EconomyState; progress: Progress; progression: ProgressionState; onUpgrade:(skill:string,expectedLevel:number)=>Promise<{ok:boolean;message:string}>; onClaim:(id:string)=>Promise<{ok:boolean;message:string}>; onNavigate:(section:HubSection)=>void; onMap:()=>void };
const skills = [
  { id:'jump', name:'Salto aprimorado', icon:'🪽', desc:'Melhora a capacidade de salto.' },
  { id:'speed', name:'Velocidade', icon:'⚡', desc:'Aumenta a agilidade do guardião.' },
  { id:'defense', name:'Defesa natural', icon:'🛡️', desc:'Melhora a resistência.' },
  { id:'magnet', name:'Coleta magnética', icon:'🧲', desc:'Facilita a coleta de itens.' },
];
const tasks = [
  { id:'win', title:'Vença 1 fase', target:1, reward:80, kind:'wins' as const },
  { id:'materials', title:'Colete 5 materiais', target:5, reward:100, kind:'materials' as const },
  { id:'recycle', title:'Recicle 1 lote', target:1, reward:60, kind:'recycles' as const },
];
export default function Progression({ economy, progress, progression, onUpgrade, onClaim, onNavigate, onMap }:Props) {
  const [busy,setBusy]=useState(''); const [notice,setNotice]=useState('');
  const ownedPets=PETS.filter(p=>economy.owned.includes(p.id));
  const petProgress=progression.pets;
  const action=async(key:string,fn:()=>Promise<{ok:boolean;message:string}>)=>{if(busy)return;setBusy(key);try{const r=await fn();setNotice(r.message)}finally{setBusy('')}};
  return <main className={s.screen}><div className={s.shell}><HubHeader active="lobby" economy={economy} unlocked={progress.unlocked} onNavigate={onNavigate} onMap={onMap}/>
    <div className={s.titleRow}><div><span className={s.kicker}>CENTRO DE EVOLUÇÃO</span><h1>Habilidades & missões</h1><p>Fortaleça seu guardião, cuide dos companheiros e conquiste recompensas diárias.</p></div></div>
    <section className={s.panel} style={{padding:20,marginBottom:16}}><div className={s.cardHead}><div><h3>Árvore de habilidades</h3><p>Cada habilidade pode chegar ao nível 3. Os custos são 100, 200 e 350 moedas.</p></div><b style={{color:'#ffe57b'}}>🪙 {economy.coins.toLocaleString('pt-BR')}</b></div>
      <div className={s.gearGrid}>{skills.map(skill=>{const level=progression.skills[skill.id as keyof ProgressionState['skills']]??0;const cost=[100,200,350][level];return <article key={skill.id} className={s.gearCard} style={{cursor:'default',textAlign:'left',padding:14}}><div style={{fontSize:30}}>{skill.icon}</div><b>{skill.name}</b><small>{skill.desc}</small><div className={s.bar} style={{margin:'8px 0'}}><i style={{width:`${level/3*100}%`}}/></div><small>Nível {level}/3</small><button className={s.recycleButton} disabled={busy!==''||level>=3||economy.coins<cost} onClick={()=>void action(skill.id,()=>onUpgrade(skill.id,level))}>{level>=3?'NÍVEL MÁXIMO':`Melhorar · ${cost} moedas`}</button></article>})}</div>
    </section>
    <section className={s.panel} style={{padding:20,marginBottom:16}}><div className={s.cardHead}><div><h3>Evolução dos pets</h3><p>Seu pet equipado recebe 25 XP por vitória. Cada nível amplia um pouco sua aura de coleta.</p></div></div>
      {ownedPets.length===0?<p>Você ainda não possui pets. Visite a Loja para desbloquear seu primeiro companheiro.</p>:<div className={s.gearGrid}>{ownedPets.map(pet=>{const data=petProgress[pet.id]??{xp:0,level:1};const needed=data.level*100;return <article className={s.gearCard} key={pet.id} style={{cursor:'default',padding:14}}><img src={pet.icon??pet.image} alt={pet.name} style={{height:90,objectFit:'contain'}}/><b>{pet.name}</b><small>{economy.equippedPet===pet.id?'EQUIPADO':'Companheiro'}</small><div className={s.bar} style={{width:'100%'}}><i style={{width:`${data.level>=10?100:Math.min(100,data.xp/needed*100)}%`}}/></div><small>{data.level>=10?'Nível 10/10 · NÍVEL MÁXIMO':`Nível ${data.level}/10 · ${data.xp}/${needed} XP`}</small></article>})}</div>}
    </section>
    <section className={s.panel} style={{padding:20}}><div className={s.cardHead}><div><h3>Missões diárias</h3><p>As missões reiniciam diariamente. Conclua os objetivos e resgate suas moedas.</p></div><span className={s.chip}>📅 {progression.daily.date}{progression.daily.resetsAt?` · renova às ${new Date(progression.daily.resetsAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:''}</span></div>
      <div className={s.recycleGrid}>{tasks.map(task=>{const count=progression.daily.counts[task.kind];const done=count>=task.target;const claimed=progression.daily.claimed.includes(task.id);return <article className={s.recycleCard} key={task.id}><div className={s.materialIcon}>🎯</div><div className={s.recycleInfo}><h3>{task.title}</h3><p>{Math.min(count,task.target)}/{task.target} · Recompensa: {task.reward} moedas</p><div className={s.bar} style={{marginTop:8}}><i style={{width:`${Math.min(100,count/task.target*100)}%`}}/></div></div><button className={s.recycleButton} disabled={!done||claimed||busy!==''} onClick={()=>void action(task.id,()=>onClaim(task.id))}>{claimed?'RESGATADA':done?'RESGATAR':'EM ANDAMENTO'}</button></article>})}</div>
    </section><p className={s.toast} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}
