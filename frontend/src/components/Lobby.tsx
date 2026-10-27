import { useEffect, useRef, useState } from 'react';
import { Assets } from '../game/assets';
import type { EconomyState } from '../app/economy';
import { CATALOG, MATERIALS, PETS, RECYCLING, SKINS, type CharacterId } from '../app/catalog';
import type { Progress } from '../app/progress';
import s from './Shop.module.css';

type Mode = 'lobby' | 'shop' | 'recycle';
type ActionResult = { ok: boolean; message: string };
interface Props {
  level: number; progress: Progress; economy: EconomyState;
  onEconomy: (next: EconomyState) => Promise<ActionResult>;
  onStart: () => Promise<ActionResult>; onMap: () => void;
  onPurchase: (id: string) => Promise<ActionResult>;
  onRecycle: (material: string, batches: number) => Promise<ActionResult>;
}

export default function Lobby({ level, progress, economy, onEconomy, onStart, onMap, onPurchase, onRecycle }: Props) {
  const [mode, setMode] = useState<Mode>('lobby');
  const [tab, setTab] = useState<'skins' | 'pets'>('skins');
  const [filter, setFilter] = useState<CharacterId>(economy.character);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState<Record<string, number>>({});
  const character = economy.character;
  const equipped = SKINS.find((item) => item.id === economy.equippedSkin[character]);
  const pet = PETS.find((item) => item.id === economy.equippedPet);

  const changeLoadout = async (next: EconomyState, success: string) => {
    setBusy(true);
    const result = await onEconomy(next);
    setNotice(result.ok ? success : result.message);
    setBusy(false);
  };
  const equip = async (id: string) => {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item || !economy.owned.includes(id)) { setNotice('Esse item ainda está bloqueado.'); return; }
    const next = item.character
      ? { ...economy, equippedSkin: { ...economy.equippedSkin, [item.character]: id } }
      : { ...economy, equippedPet: id };
    await changeLoadout(next, `${item.name} equipado.`);
  };
  const buy = async (id: string) => {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item || !window.confirm(`Comprar ${item.name} por ${item.price} moedas?`)) return;
    setBusy(true); const result = await onPurchase(id); setNotice(result.message); setBusy(false);
  };
  const exchange = async (material: string) => {
    setBusy(true); const result = await onRecycle(material, batches[material] ?? 1); setNotice(result.message); setBusy(false);
  };
  const start = async () => {
    setBusy(true); const result = await onStart(); setNotice(result.message); setBusy(false);
  };

  return <main className={s.wrap}><div className={s.panel}>
    <header className={s.header}><div><span className={s.eyebrow}>CRISOGUARDIAN · FASE {level + 1} · {progress.unlocked}/{progress.stars.length} liberadas</span>
      <h1>{mode === 'lobby' ? 'Preparar missão' : mode === 'shop' ? 'Loja do guardião' : 'Centro de reciclagem'}</h1></div><div className={s.balance}>🪙 {economy.coins}</div></header>
    {mode === 'lobby' && <>
      <section className={s.hero}><div className={s.avatar}><CharacterPreview character={character} skinId={equipped?.id ?? ''} petId={pet?.id ?? null}/><small>{character === 'crisoman' ? 'CRISOMAN' : 'CRISOGIRL'}</small></div>
        <div className={s.heroInfo}><h2>{character === 'crisoman' ? 'Crisoman' : 'Crisogirl'}</h2><p>Skin: <b>{equipped?.name}</b> · Pet: <b>{pet?.name ?? 'nenhum'}</b></p>
          <div className={s.characters}><button disabled={busy} aria-pressed={character === 'crisoman'} onClick={() => void changeLoadout({ ...economy, character: 'crisoman' }, 'Crisoman selecionado.')}>Crisoman</button>
            <button disabled={busy} aria-pressed={character === 'crisogirl'} onClick={() => void changeLoadout({ ...economy, character: 'crisogirl' }, 'Crisogirl selecionada.')}>Crisogirl</button></div>
          <p className={s.hint}>Escolha apenas skins e pets já desbloqueados.</p></div></section>
      <section className={s.loadout}><div><h3>Suas skins</h3><div className={s.items}>{SKINS.filter((item) => item.character === character && economy.owned.includes(item.id)).map((item) =>
        <button key={item.id} disabled={busy} className={item.id === economy.equippedSkin[character] ? s.selected : ''} onClick={() => void equip(item.id)}>{item.name} <i style={{ background: item.palette }}/></button>)}</div></div>
        <div><h3>Seus pets</h3><div className={s.items}><button disabled={busy} className={!pet ? s.selected : ''} onClick={() => void changeLoadout({ ...economy, equippedPet: null }, 'Pet removido.')}>Sem pet</button>
          {PETS.filter((item) => economy.owned.includes(item.id)).map((item) => <button key={item.id} disabled={busy} className={item.id === economy.equippedPet ? s.selected : ''} onClick={() => void equip(item.id)}>{item.name}</button>)}</div></div></section>
      <footer className={s.actions}><button disabled={busy} onClick={() => void start()}>Jogar fase {level + 1} ▶</button><button className={s.secondary} onClick={() => setMode('shop')}>Loja</button>
        <button className={s.secondary} onClick={() => setMode('recycle')}>Reciclagem</button><button className={s.ghost} onClick={onMap}>Voltar ao mapa</button></footer>
    </>}
    {mode === 'shop' && <><div className={s.tabs}><button aria-pressed={tab === 'skins'} onClick={() => setTab('skins')}>Skins</button><button aria-pressed={tab === 'pets'} onClick={() => setTab('pets')}>Pets</button>
      {tab === 'skins' && <select aria-label="Filtrar personagem" value={filter} onChange={(event) => setFilter(event.target.value as CharacterId)}><option value="crisoman">Crisoman</option><option value="crisogirl">Crisogirl</option></select>}</div>
      <section className={s.grid}>{(tab === 'skins' ? SKINS.filter((item) => item.character === filter) : PETS).map((item) => {
        const owned = economy.owned.includes(item.id); const active = item.character ? economy.equippedSkin[item.character] === item.id : economy.equippedPet === item.id;
        return <article key={item.id} className={s.card}><div className={s.swatch} style={{ '--hero-color': item.palette } as React.CSSProperties}>{item.character ? '♻' : '✦'}</div><h3>{item.name}</h3>
          <p>{item.rarity} · {item.price === 0 ? 'Grátis' : `🪙 ${item.price}`}</p>
          {owned ? <button className={s.secondary} disabled={busy} onClick={() => void equip(item.id)}>{active ? 'Equipado' : 'Equipar'}</button>
            : <button disabled={busy || economy.coins < item.price} onClick={() => void buy(item.id)}>Comprar · 🪙 {item.price}</button>}</article>;
      })}</section><button className={s.ghost} onClick={() => setMode('lobby')}>← Voltar ao lobby</button></>}
    {mode === 'recycle' && <><p className={s.hint}>Troque {RECYCLING.materialsPerExchange} unidades do mesmo material por {RECYCLING.coinsPerExchange} moedas. Não há conversão de moedas de volta para materiais.</p>
      <section className={s.recycle}>{MATERIALS.map((material) => <article key={material}><div><b>{material[0]!.toUpperCase() + material.slice(1)}</b><span>Inventário: {economy.materials[material] ?? 0}</span></div>
        <label>Pacotes <input type="number" min="1" max="100" value={batches[material] ?? 1} onChange={(event) => setBatches({ ...batches, [material]: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })}/></label>
        <button disabled={busy} onClick={() => void exchange(material)}>Trocar por moedas</button></article>)}</section><button className={s.ghost} onClick={() => setMode('lobby')}>← Voltar ao lobby</button></>}
    <p className={s.notice} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}

function CharacterPreview({ character, skinId, petId }: { character: CharacterId; skinId: string; petId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dead = false;
    void Assets.get().then((assets) => {
      if (dead || !ref.current) return;
      const canvas = ref.current; const ctx = canvas.getContext('2d'); if (!ctx) return;
      canvas.width = 200; canvas.height = 220; assets.setLevel(0);
      const hue = character === 'crisogirl' ? 'hue-rotate(205deg) ' : '';
      const palette = skinId.includes('urbana') || skinId.includes('urbano') ? 'grayscale(.72) '
        : skinId.includes('natureza') || skinId.includes('floresta') ? 'sepia(.55) saturate(1.25) '
          : skinId.includes('agua') ? 'hue-rotate(100deg) saturate(1.2) ' : skinId.includes('fogo') ? 'hue-rotate(250deg) saturate(1.35) ' : '';
      ctx.filter = hue + palette; assets.draw(ctx, 'p_idle_0', 112, 194, { scale: 2.25 }); ctx.filter = 'none';
      if (petId) {
        const colors: Record<string, string> = { 'pet-turtix': '#60c980', 'pet-foxy': '#f29a4a', 'pet-folhinha': '#a5df55', 'pet-pipoca': '#64d8dc', 'pet-brasa': '#ff744e' };
        const color = colors[petId] ?? '#8ee99f'; ctx.fillStyle = color; ctx.fillRect(34, 155, 36, 27); ctx.fillRect(45, 142, 27, 25);
        ctx.fillStyle = '#122318'; ctx.fillRect(60, 151, 3, 3); ctx.fillRect(70, 151, 3, 3);
        if (petId === 'pet-turtix') { ctx.fillStyle = '#277c4b'; ctx.fillRect(34, 148, 34, 19); }
        else if (petId === 'pet-foxy' || petId === 'pet-brasa') { ctx.fillStyle = color; ctx.fillRect(47, 135, 9, 16); ctx.fillRect(66, 135, 9, 16); }
      }
    });
    return () => { dead = true; };
  }, [character, skinId, petId]);
  return <canvas ref={ref} className={s.preview} role="img" aria-label={`Prévia ${character === 'crisoman' ? 'Crisoman' : 'Crisogirl'} com ${skinId} e pet ${petId ?? 'nenhum'}`}/>;
}
