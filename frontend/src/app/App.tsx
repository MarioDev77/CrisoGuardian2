import { useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio';
import TitleScreen from '../components/TitleScreen';
import WorldMap from '../components/WorldMap';
import GameView from '../components/GameView';
import Lobby from '../components/Lobby';
import { enterGameMode } from './pwa';
import { freshEconomy, type EconomyState } from './economy';
import { api, getServerSnapshot, type ServerSnapshot } from './api';
import { loadProgress, type Progress } from './progress';

type Screen = { name: 'title' } | { name: 'map' } | { name: 'lobby'; level: number } | { name: 'play'; level: number; runId: string };
type ApiSnapshot = ServerSnapshot & { message?: string; payout?: { coins: number; materials: number; discarded: number } };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [economy, setEconomy] = useState<EconomyState>(() => freshEconomy());
  const economyRef = useRef(economy);
  const [serverReady, setServerReady] = useState(false);
  const [serverError, setServerError] = useState('');

  const applySnapshot = (snapshot: ServerSnapshot) => {
    economyRef.current = snapshot.economy;
    setEconomy(snapshot.economy);
    setProgress({ ...snapshot.progress, coins: snapshot.economy.coins });
    setServerError('');
    setServerReady(true);
  };
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

  if (!serverReady) return <div role="status" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', gap: 12, alignContent: 'center', background: '#03140d', color: '#d8ffd0', fontFamily: 'system-ui' }}>
    {serverError ? <><span>Não foi possível carregar o progresso seguro. {serverError}</span><button onClick={() => { setServerError(''); void reloadState(); }}>Tentar novamente</button></> : 'Conectando ao servidor de economia…'}
  </div>;

  if (screen.name === 'title') return <TitleScreen onPlay={() => { void enterGameMode(); setScreen({ name: 'map' }); }} />;
  if (screen.name === 'map') return <WorldMap progress={{ ...progress, coins: economy.coins }} onPlay={(level) => setScreen({ name: 'lobby', level })} onBack={() => setScreen({ name: 'title' })} />;
  if (screen.name === 'lobby') return <Lobby level={screen.level} progress={progress} economy={economy}
    onEconomy={async (next) => {
      const current = economyRef.current;
      const body = next.character !== current.character ? { character: next.character }
        : next.equippedPet !== current.equippedPet ? { petId: next.equippedPet }
        : next.equippedSkin.crisoman !== current.equippedSkin.crisoman ? { skinId: next.equippedSkin.crisoman }
        : next.equippedSkin.crisogirl !== current.equippedSkin.crisogirl ? { skinId: next.equippedSkin.crisogirl } : null;
      if (!body) return { ok: true, message: '' };
      try { applySnapshot(await api<ApiSnapshot>('/api/economy/loadout', body)); return { ok: true, message: 'Seleção salva.' }; }
      catch (err) { return { ok: false, message: err instanceof Error ? err.message : 'Falha ao salvar seleção.' }; }
    }}
    onMap={() => setScreen({ name: 'map' })}
    onStart={async () => {
      try { const result = await api<{ runId: string }>('/api/run/start', { level: screen.level }); setScreen({ name: 'play', level: screen.level, runId: result.runId }); return { ok: true, message: '' }; }
      catch (err) { return { ok: false, message: err instanceof Error ? err.message : 'Falha ao iniciar a partida.' }; }
    }}
    onPurchase={async (id) => {
      try { const result = await api<ApiSnapshot>('/api/economy/purchase', { itemId: id }); applySnapshot(result); return { ok: true, message: result.message ?? 'Compra concluída.' }; }
      catch (err) { return { ok: false, message: err instanceof Error ? err.message : 'Falha ao comprar.' }; }
    }}
    onRecycle={async (material, batches) => {
      try { const result = await api<ApiSnapshot>('/api/economy/recycle', { material, batches }); applySnapshot(result); return { ok: true, message: result.message ?? 'Troca concluída.' }; }
      catch (err) { return { ok: false, message: err instanceof Error ? err.message : 'Falha ao reciclar.' }; }
    }} />;

  return <GameView key={`${screen.level}-${screen.runId}`} level={screen.level} runId={screen.runId}
    character={economy.character} skinId={economy.equippedSkin[economy.character]} petId={economy.equippedPet}
    onExit={() => setScreen({ name: 'map' })}
    onWin={async (level, result, stars, runId) => {
      const settled = await api<ApiSnapshot>('/api/run/settle', { runId, level, won: true, collectibles: result.collectibles, stars, score: result.score });
      applySnapshot(settled);
      return settled.payout ?? { coins: 0, materials: 0, discarded: 0 };
    }}
    onNext={(level) => setScreen({ name: 'lobby', level })} />;
}

