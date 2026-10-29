import { useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio';
import TitleScreen from '../components/TitleScreen';
import WorldMap from '../components/WorldMap';
import WorldMap2 from '../components/WorldMap2';
import GameView from '../components/GameView';
import Lobby from '../components/Lobby';
import Shop from '../components/Shop';
import Recycling from '../components/Recycling';
import { enterGameMode } from './pwa';
import { freshEconomy, type EconomyState } from './economy';
import { CATALOG } from './catalog';
import { api, getServerSnapshot, type ServerSnapshot } from './api';
import { LEVEL_COUNT, loadProgress, type Progress } from './progress';

type Screen = { name: 'title' } | { name: 'map' } | { name: 'map2' } | { name: 'lobby' } | { name: 'shop' } | { name: 'recycle' } | { name: 'play'; level: number; runId: string };
type ApiSnapshot = ServerSnapshot & { message?: string; payout?: { coins: number; materials: number; discarded: number } };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [economy, setEconomy] = useState<EconomyState>(() => freshEconomy());
  const economyRef = useRef(economy);
  const [serverReady, setServerReady] = useState(false);
  const [serverError, setServerError] = useState('');
  /** true logo após concluir a fase 8 pela primeira vez: destaca o Mapa 2 recém-liberado. */
  const [map2Fresh, setMap2Fresh] = useState(false);

  const applySnapshot = (snapshot: ServerSnapshot) => {
    economyRef.current = snapshot.economy;
    setEconomy(snapshot.economy);
    setProgress({ ...snapshot.progress, coins: snapshot.economy.coins });
    setServerError('');
    setServerReady(true);
  };
  const startLevel = async (level:number) => { setServerError(''); try { const result=await api<{runId:string}>('/api/run/start',{level}); setScreen({name:'play',level,runId:result.runId}); } catch(err) { setServerError(err instanceof Error?err.message:'Não foi possível iniciar a fase.'); } };
  const reloadState = async () => {
    try { applySnapshot(await getServerSnapshot()); }
    catch (err) { setServerError(err instanceof Error ? err.message : 'Servidor de economia indisponível.'); }
  };
  useEffect(() => { void reloadState(); }, []);
  useEffect(() => {
    const go = () => audio.unlock();
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);
  const track = screen.name === 'play' ? screen.level : 'menu';
  useEffect(() => { audio.setTrack(track); }, [track]);
  const navigateHub = (name: 'lobby' | 'shop' | 'recycle') => {
    if (name === 'lobby') setScreen({ name: 'lobby' });
    else if (name === 'shop') setScreen({ name: 'shop' });
    else setScreen({ name: 'recycle' });
  };

  if (!serverReady) return <div role="status" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', gap: 12, alignContent: 'center', background: '#03140d', color: '#d8ffd0', fontFamily: 'system-ui' }}>
    {serverError ? <><span>Não foi possível carregar o progresso seguro. {serverError}</span><button onClick={() => { setServerError(''); void reloadState(); }}>Tentar novamente</button></> : 'Conectando ao servidor de economia…'}
  </div>;

  if (screen.name === 'title') return <TitleScreen onPlay={() => { void enterGameMode(); setScreen({ name: 'map' }); }} />;
  if (screen.name === 'map') return <WorldMap progress={{ ...progress, coins: economy.coins }} statusMessage={serverError} map2Fresh={map2Fresh} onOpenMap2={() => { setMap2Fresh(false); setScreen({ name: 'map2' }); }} onPlay={(level) => { void startLevel(level); }} onOpenLobby={() => setScreen({name:'lobby'})} onOpenShop={() => setScreen({name:'shop'})} onOpenRecycle={() => setScreen({name:'recycle'})} onBack={() => setScreen({ name: 'title' })} />;
  if (screen.name === 'map2') return <WorldMap2 progress={{ ...progress, coins: economy.coins }} justUnlocked={map2Fresh} onPlay={(level) => { void startLevel(level); }} onBack={() => setScreen({ name: 'map' })} onOpenLobby={() => setScreen({ name: 'lobby' })} onOpenShop={() => setScreen({ name: 'shop' })} onOpenRecycle={() => setScreen({ name: 'recycle' })} />;
  if (screen.name === 'lobby') return <Lobby economy={economy} progress={progress} onMap={() => setScreen({name:'map'})} onPlay={() => { void startLevel(Math.min(progress.unlocked, LEVEL_COUNT) - 1); }} onNavigate={navigateHub} onEconomy={async(next)=>{
    const current=economyRef.current;
    const body=next.character!==current.character?{character:next.character}:next.equippedPet!==current.equippedPet?{petId:next.equippedPet}:next.equippedSkin.crisoman!==current.equippedSkin.crisoman?{skinId:next.equippedSkin.crisoman}:next.equippedSkin.crisogirl!==current.equippedSkin.crisogirl?{skinId:next.equippedSkin.crisogirl}:null;
    if(!body)return {ok:true,message:''};try{applySnapshot(await api<ApiSnapshot>('/api/economy/loadout',body));return {ok:true,message:'Seleção salva.'}}catch(err){return {ok:false,message:err instanceof Error?err.message:'Falha ao salvar a seleção.'}}
  }} />;
  if (screen.name === 'shop') return <Shop economy={economy} unlocked={progress.unlocked} onMap={()=>setScreen({name:'map'})} onNavigate={navigateHub} onPurchase={async(id)=>{try{const result=await api<ApiSnapshot>('/api/economy/purchase',{itemId:id});applySnapshot(result);return {ok:true,message:result.message??'Compra concluída.'}}catch(err){return {ok:false,message:err instanceof Error?err.message:'Falha ao comprar.'}}}} onEquip={async(id)=>{try{const item=id?CATALOG.find((entry)=>entry.id===id):undefined;const body=id===null?{petId:null}:item?.character?{skinId:id}:item?{petId:id}:null;if(!body)return {ok:false,message:'Item inválido.'};const result=await api<ApiSnapshot>('/api/economy/loadout',body);applySnapshot(result);return {ok:true,message:'Equipamento atualizado.'}}catch(err){return {ok:false,message:err instanceof Error?err.message:'Falha ao equipar.'}}}} />;
  if (screen.name === 'recycle') return <Recycling economy={economy} unlocked={progress.unlocked} onMap={()=>setScreen({name:'map'})} onNavigate={navigateHub} onRecycle={async(material,batches)=>{try{const result=await api<ApiSnapshot>('/api/economy/recycle',{material,batches});applySnapshot(result);return {ok:true,message:result.message??'Troca concluída.'}}catch(err){return {ok:false,message:err instanceof Error?err.message:'Falha ao reciclar.'}}}} />;
  return <GameView key={`${screen.level}-${screen.runId}`} level={screen.level} runId={screen.runId}
    character={economy.character} skinId={economy.equippedSkin[economy.character]} petId={economy.equippedPet}
    onExit={() => setScreen(screen.level >= 8 ? { name: 'map2' } : { name: 'map' })}
    onWin={async (level, result, stars, runId) => {
      const settled = await api<ApiSnapshot>('/api/run/settle', { runId, level, won: true, collectibles: result.collectibles, stars, score: result.score });
      // concluir a fase 8 pela primeira vez libera o Mapa 2
      if (level === 7 && progress.unlocked < 9 && settled.progress.unlocked >= 9) setMap2Fresh(true);
      applySnapshot(settled);
      return settled.payout ?? { coins: 0, materials: 0, discarded: 0 };
    }}
    onNext={(level) => { void startLevel(level); }} />;
}

