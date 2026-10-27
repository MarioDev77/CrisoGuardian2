import { useEffect, useRef, useState } from 'react';
import { Assets } from '../game/assets';
import type { EconomyState } from '../app/economy';
import type { Progress } from '../app/progress';
import { CATALOG, PETS, SKINS, type CharacterId } from '../app/catalog';
import HubHeader, { type HubSection } from './HubHeader';
import { MaterialIcon } from './MaterialIcon';
import s from './Hub.module.css';

type ActionResult = { ok: boolean; message: string };
type Props = { economy: EconomyState; progress: Progress; onEconomy: (next: EconomyState) => Promise<ActionResult>; onNavigate: (section: HubSection) => void; onMap: () => void; onPlay: () => void };

export default function Lobby({ economy, progress, onEconomy, onNavigate, onMap, onPlay }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const character = economy.character;
  const skin = SKINS.find((item) => item.id === economy.equippedSkin[character]);
  const pet = PETS.find((item) => item.id === economy.equippedPet);
  const totalStars = progress.stars.reduce((sum, stars) => sum + stars, 0);
  const materials = Object.values(economy.materials).reduce((sum, amount) => sum + amount, 0);

  const update = async (next: EconomyState, label: string) => {
    if (busy) return;
    setBusy(true);
    try { const result = await onEconomy(next); setNotice(result.ok ? label : result.message); }
    finally { setBusy(false); }
  };
  const equip = async (id: string) => {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item || !economy.owned.includes(id)) { setNotice('Esse item ainda está bloqueado.'); return; }
    if (item.character) await update({ ...economy, character: item.character, equippedSkin: { ...economy.equippedSkin, [item.character]: id } }, `${item.name} equipada.`);
    else await update({ ...economy, equippedPet: id }, `${item.name} equipado.`);
  };

  return <main className={s.screen}><div className={s.shell}>
    <HubHeader active="lobby" economy={economy} unlocked={progress.unlocked} onNavigate={onNavigate} onMap={onMap}/>
    <div className={s.titleRow}><div><span className={s.kicker}>CENTRAL DO GUARDIÃO</span><h1>Lobby</h1><p>Prepare seu equipamento e continue protegendo o planeta.</p></div><button type="button" className={s.quietButton} onClick={onMap}>Escolher fase <span aria-hidden="true">↗</span></button></div>
    <div className={s.mainGrid}>
      <section className={`${s.panel} ${s.hero}`} aria-label="Personagem selecionado">
        <div className={s.characterStage}><div className={s.previewFrame}><CharacterPreview character={character} skinId={skin?.id ?? ''} petId={pet?.id ?? null}/>{pet?.icon && <span className={s.petBadge}><img src={pet.icon} alt={`Pet equipado: ${pet.name}`} /></span>}</div></div>
        <div className={s.heroCopy}><span className={s.eyebrow}>SEU GUARDIÃO · {skin?.name ?? 'VISUAL PADRÃO'}</span><h2>{character === 'crisoman' ? 'Crisoman' : 'Crisogirl'}</h2><p>{pet ? `${pet.name} está pronto para acompanhar você.` : 'Escolha seu personagem, skin e companheiro antes de partir.'}</p>
          <div className={s.characterPicker}><button type="button" disabled={busy} aria-pressed={character === 'crisoman'} onClick={() => void update({ ...economy, character: 'crisoman' }, 'Crisoman selecionado.')}>Crisoman</button><button type="button" disabled={busy} aria-pressed={character === 'crisogirl'} onClick={() => void update({ ...economy, character: 'crisogirl' }, 'Crisogirl selecionada.')}>Crisogirl</button></div>
          <button type="button" className={s.primaryButton} onClick={onPlay}><span aria-hidden="true">▶</span> JOGAR</button>
        </div>
      </section>
      <aside className={s.sideColumn}>
        <section className={`${s.panel} ${s.sideCard}`}><span className={s.eyebrow}>SUA JORNADA</span><h3>Progresso da aventura</h3><div className={s.progressLine}><span>Fase liberada</span><b>{progress.unlocked}</b></div><div className={s.progressLine}><span>Estrelas conquistadas</span><b>{totalStars}</b></div><div className={s.bar} aria-label={`${Math.round((progress.unlocked / progress.stars.length) * 100)}% das fases liberadas`}><i style={{ width: `${Math.min(100, (progress.unlocked / progress.stars.length) * 100)}%` }}/></div></section>
        <section className={`${s.panel} ${s.sideCard}`}><span className={s.eyebrow}>MATERIAIS GUARDADOS</span><h3>Inventário reciclável <small>· {materials} itens</small></h3><div className={s.materialGrid}>{Object.entries(economy.materials).map(([name, amount]) => <div className={s.materialStat} key={name}><span className={s.materialIcon}><MaterialIcon material={name}/></span><span><b>{amount}</b><small>{name}</small></span></div>)}</div><div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={() => onNavigate('recycle')}><span className={s.materialIcon}><MaterialIcon material="reciclagem"/></span><span><b>Reciclar materiais</b><small>Ver inventário e trocas</small></span></button></div></section>
      </aside>
    </div>
    <div className={s.lowerGrid}>
      <section className={`${s.panel} ${s.lowerCard}`}><h3>Skins desbloqueadas</h3><p>Equipe aqui os visuais comprados para {character === 'crisoman' ? 'Crisoman' : 'Crisogirl'}.</p><div className={s.optionList}>{SKINS.filter((item) => item.character === character && economy.owned.includes(item.id)).map((item) => <button type="button" key={item.id} className={s.option} disabled={busy} aria-pressed={item.id === skin?.id} onClick={() => void equip(item.id)}>{item.name}</button>)}</div><div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={() => onNavigate('shop')}><span className={s.materialIcon}><MaterialIcon material="loja"/></span><span><b>Ver todas as skins</b><small>Abrir Loja</small></span></button></div></section>
      <section className={`${s.panel} ${s.lowerCard}`}><h3>Pets desbloqueados</h3><p>{pet ? `${pet.name} está equipado.` : 'Escolha um companheiro que já tenha desbloqueado.'}</p><div className={s.optionList}><button type="button" className={s.option} disabled={busy} aria-pressed={!pet} onClick={() => void update({ ...economy, equippedPet: null }, 'Pet removido.')}>Sem pet</button>{PETS.filter((item) => economy.owned.includes(item.id)).map((item) => <button type="button" key={item.id} className={s.option} disabled={busy} aria-pressed={item.id === pet?.id} onClick={() => void equip(item.id)}>{item.name}</button>)}</div><div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={() => onNavigate('shop')}><span className={s.materialIcon}><MaterialIcon material="loja"/></span><span><b>Ver todos os pets</b><small>Abrir Loja</small></span></button></div></section>
      <section className={`${s.panel} ${s.lowerCard}`}><h3>Fases e recordes</h3><p>Seu progresso salvo mostra {progress.unlocked} fase(s) liberada(s) e {totalStars} estrela(s) conquistada(s).</p><div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={onMap}><span className={s.materialIcon}><MaterialIcon material="mapa"/></span><span><b>Escolher uma fase</b><small>Continuar jornada</small></span></button></div></section>
    </div>
    <p className={s.toast} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}

function legacySkinFilter(skinId: string) { if (skinId.includes('urbano')) return 'grayscale(.72)'; if (skinId.includes('natureza') || skinId.includes('floresta')) return 'sepia(.55) saturate(1.25)'; if (skinId.includes('agua')) return 'hue-rotate(100deg) saturate(1.2)'; if (skinId.includes('fogo')) return 'hue-rotate(250deg) saturate(1.35)'; if (skinId.includes('rosa')) return 'hue-rotate(280deg) saturate(1.4)'; return 'none'; }
function CharacterPreview({ character, skinId, petId }: { character: CharacterId; skinId: string; petId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let dead = false; void Assets.get().then((assets) => { if (dead || !ref.current) return; const canvas = ref.current, ctx = canvas.getContext('2d'); if (!ctx) return; canvas.width = 220; canvas.height = 250; if (character === 'crisoman') { ctx.save(); ctx.filter = legacySkinFilter(skinId); assets.draw(ctx, 'p_idle_0', 110, 233, { scale: 2.3 }); ctx.restore(); } else { const hero = assets.actorFrame(character, skinId, 'idle', 0); if (hero) assets.draw(ctx, hero, 110, 233, { scale: 2.2 }); } if (petId) { const frame = assets.petFrame(petId, 'idle', 0); if (frame) assets.draw(ctx, frame, 48, 222, { scale: .9, anchor: 'center' }); } }); return () => { dead = true; }; }, [character, skinId, petId]);
  return <canvas ref={ref} role="img" aria-label={`Prévia de ${character === 'crisoman' ? 'Crisoman' : 'Crisogirl'}, skin ${skinId || 'padrão'}, pet ${petId ?? 'nenhum'}`}/>;
}
