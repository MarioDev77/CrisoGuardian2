import { useState } from 'react';
import type { EconomyState } from '../app/economy';
import type { Progress } from '../app/progress';
import { CATALOG, PETS, SKINS, type CharacterId, type Cosmetic } from '../app/catalog';
import HubHeader, { type HubSection } from './HubHeader';
import { MaterialIcon } from './MaterialIcon';
import s from './Hub.module.css';

type ActionResult = { ok: boolean; message: string };
type Props = { economy: EconomyState; progress: Progress; onEconomy: (next: EconomyState) => Promise<ActionResult>; onNavigate: (section: HubSection) => void; onMap: () => void; onPlay: () => void; onProgression: () => void };

export default function Lobby({ economy, progress, onEconomy, onNavigate, onMap, onPlay, onProgression }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const character = economy.character;
  const skin = SKINS.find((item) => item.id === economy.equippedSkin[character]);
  const pet = PETS.find((item) => item.id === economy.equippedPet);
  const totalStars = progress.stars.reduce((sum, stars) => sum + stars, 0);
  const nextLevel = Math.min(progress.unlocked, progress.stars.length);
  const name = CHARACTER_NAME[character];
  const mySkins = SKINS.filter((item) => item.character === character);
  const ownedPets = PETS.filter((item) => economy.owned.includes(item.id));
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
        <div className={s.characterStage}>
          <div className={s.previewFrame} key={`${character}-${skin?.id}`}>
            <div className={s.stageGlow} aria-hidden="true"/>
            <CharacterPortrait character={character} skin={skin}/>
            <div className={s.stagePad} aria-hidden="true"/>
            {pet?.icon && <span className={s.petBadge}><img src={pet.icon} alt={`Pet equipado: ${pet.name}`}/></span>}
          </div>
        </div>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>SEU GUARDIÃO</span>
          <h2>{name}</h2>
          <div className={s.chips}><span className={s.chip}>🎽 {skin?.name ?? 'Visual padrão'}</span>{skin && <span className={`${s.chip} ${s.rarityChip}`} data-rarity={skin.rarity}>{skin.rarity}</span>}<span className={s.chip}>🐾 {pet ? pet.name : 'Sem pet'}</span></div>
          <div className={s.pickerLabel}>Escolha seu personagem</div>
          <div className={s.characterPicker} role="group" aria-label="Personagem">
            {(['crisoman', 'crisogirl'] as CharacterId[]).map((id) => <button type="button" key={id} disabled={busy} aria-pressed={character === id} onClick={() => void update({ ...economy, character: id }, `${CHARACTER_NAME[id]} selecionado.`)}>
              <img src={portraitFor(id, SKINS.find((x) => x.id === economy.equippedSkin[id]))} alt="" /><span>{CHARACTER_NAME[id]}</span>
            </button>)}
          </div>
          <button type="button" className={s.primaryButton} onClick={onPlay}><span aria-hidden="true">▶</span> JOGAR <small>Fase {String(nextLevel).padStart(2, '0')}</small></button>
        </div>
      </section>

      <aside className={s.sideColumn}>
        <section className={`${s.panel} ${s.sideCard}`}><span className={s.eyebrow}>SUA JORNADA</span><h3>Progresso da aventura</h3>
          <div className={s.statRow}><div className={s.statBox}><b>{progress.unlocked}<small>/{progress.stars.length}</small></b><span>Fases liberadas</span></div><div className={s.statBox}><b>⭐ {totalStars}</b><span>Estrelas</span></div><div className={s.statBox}><b>{economy.coins.toLocaleString('pt-BR')}</b><span>Moedas</span></div></div>
          <div className={s.bar} aria-label={`${Math.round((progress.unlocked / progress.stars.length) * 100)}% das fases liberadas`}><i style={{ width: `${Math.min(100, (progress.unlocked / progress.stars.length) * 100)}%` }}/></div>
        </section>
        <section className={`${s.panel} ${s.sideCard}`}><span className={s.eyebrow}>MATERIAIS GUARDADOS</span><h3>Inventário reciclável <small>· {materials} itens</small></h3>
          <div className={s.materialGrid}>{Object.entries(economy.materials).map(([mat, amount]) => <div className={s.materialStat} key={mat}><span className={s.materialIcon}><MaterialIcon material={mat}/></span><span><b>{amount}</b><small>{mat}</small></span></div>)}</div>
          <div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={onProgression}><span className={s.materialIcon}>✦</span><span><b>Habilidades e missões</b><small>Melhorias e evolução dos pets</small></span></button><button type="button" className={s.shortcut} onClick={() => onNavigate('recycle')}><span className={s.materialIcon}><MaterialIcon material="reciclagem"/></span><span><b>Reciclar materiais</b><small>Ver inventário e trocas</small></span></button></div>
        </section>
      </aside>
    </div>

    <div className={s.lowerGrid}>
      <section className={`${s.panel} ${s.lowerCard} ${s.wide}`}><div className={s.cardHead}><div><h3>Skins de {name}</h3><p>Toque numa skin desbloqueada para equipar. As bloqueadas estão na Loja.</p></div><button type="button" className={s.quietButton} onClick={() => onNavigate('shop')}>Abrir Loja</button></div>
        <div className={s.gearGrid}>{mySkins.map((item) => { const owned = economy.owned.includes(item.id); return <button type="button" key={item.id} className={s.gearCard} data-locked={!owned} disabled={busy} aria-pressed={item.id === skin?.id} onClick={() => void equip(item.id)} style={{ ['--tone' as string]: item.palette }}>
          <span className={s.gearArt}><img src={portraitFor(character, item)} alt="" loading="lazy"/>{!owned && <i className={s.lock} aria-hidden="true">🔒</i>}{item.id === skin?.id && <i className={s.equipped}>EQUIPADA</i>}</span>
          <b>{item.name}</b><small>{owned ? item.rarity : `${item.price} moedas`}</small></button>; })}</div>
      </section>
      <section className={`${s.panel} ${s.lowerCard}`}><div className={s.cardHead}><div><h3>Companheiros</h3><p>{pet ? `${pet.name} está equipado.` : 'Escolha um pet desbloqueado.'}</p></div></div>
        <div className={s.petRow}>
          <button type="button" className={s.petChip} disabled={busy} aria-pressed={!pet} onClick={() => void update({ ...economy, equippedPet: null }, 'Pet removido.')}><span className={s.petNone}>∅</span><b>Sem pet</b></button>
          {ownedPets.map((item) => <button type="button" key={item.id} className={s.petChip} disabled={busy} aria-pressed={item.id === pet?.id} onClick={() => void equip(item.id)}><span className={s.petThumb}><img src={item.icon ?? item.image} alt="" loading="lazy"/></span><b>{item.name}</b></button>)}
        </div>
        <div className={s.shortcuts}><button type="button" className={s.shortcut} onClick={() => onNavigate('shop')}><span className={s.materialIcon}><MaterialIcon material="loja"/></span><span><b>Ver todos os pets</b><small>Abrir Loja</small></span></button><button type="button" className={s.shortcut} onClick={onMap}><span className={s.materialIcon}><MaterialIcon material="mapa"/></span><span><b>Escolher uma fase</b><small>Continuar jornada</small></span></button></div>
      </section>
    </div>
    <p className={s.toast} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}

const CHARACTER_NAME: Record<CharacterId, string> = { crisoman: 'Crisoman', crisogirl: 'Crisogirl' };
const DEFAULT_PORTRAIT: Record<CharacterId, string> = { crisoman: '/assets/lobby/crisoman-portrait.png', crisogirl: '/assets/lobby/crisogirl-portrait.png' };
const DEFAULT_SKIN: Record<CharacterId, string> = { crisoman: 'skin-crisoman-verde', crisogirl: 'skin-crisogirl-rosa' };

/** Arte em alta resolução usada no lobby (nunca o sprite pequeno do jogo, que ficava borrado/deformado ao ampliar). */
function portraitFor(character: CharacterId, skin?: Cosmetic): string {
  if (!skin || skin.id === DEFAULT_SKIN[character]) return DEFAULT_PORTRAIT[character];
  return skin.image ? skin.image.replace('/cosmetics/skins/', '/lobby/skins/') : DEFAULT_PORTRAIT[character];
}

function CharacterPortrait({ character, skin }: { character: CharacterId; skin?: Cosmetic }) {
  return <img className={s.portrait} src={portraitFor(character, skin)} alt={`${CHARACTER_NAME[character]}, skin ${skin?.name ?? 'padrão'}`} draggable={false}/>;
}
