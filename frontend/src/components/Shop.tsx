import { useState } from 'react';
import { CATALOG, PETS, SKINS, type CharacterId } from '../app/catalog';
import type { EconomyState } from '../app/economy';
import HubHeader, { type HubSection, CoinIcon } from './HubHeader';
import s from './Hub.module.css';

type Result = { ok: boolean; message: string };
type Props = { economy: EconomyState; unlocked: number; onPurchase: (id: string) => Promise<Result>; onEquip: (id: string | null) => Promise<Result>; onNavigate: (section: HubSection) => void; onMap: () => void };

export default function Shop({ economy, unlocked, onPurchase, onEquip, onNavigate, onMap }: Props) {
  const [tab, setTab] = useState<'skins' | 'pets'>('skins');
  const [filter, setFilter] = useState<CharacterId>(economy.character);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const items = tab === 'skins' ? SKINS.filter((item) => item.character === filter) : PETS;
  const act = async (operation: () => Promise<Result>) => { if (busy) return; setBusy(true); try { const result = await operation(); setNotice(result.message); } finally { setBusy(false); } };
  const buy = async (id: string) => { const item = CATALOG.find((entry) => entry.id === id); if (!item || economy.owned.includes(id) || economy.coins < item.price) return; if (!window.confirm(`Comprar ${item.name} por ${item.price} moedas?`)) return; await act(() => onPurchase(id)); };
  const equip = (id: string | null) => { void act(() => onEquip(id)); };

  return <main className={s.screen}><div className={s.shell}>
    <HubHeader active="shop" economy={economy} unlocked={unlocked} onNavigate={onNavigate} onMap={onMap}/>
    <div className={s.titleRow}><div><span className={s.kicker}>VISUAIS E COMPANHEIROS</span><h1>Loja</h1><p>Use suas moedas para desbloquear novos visuais e pets.</p></div><button type="button" className={s.quietButton} onClick={onMap}>← Escolher fase</button></div>
    <div className={s.shopLayout}>
      <aside className={`${s.panel} ${s.shopRail}`} aria-label="Categorias da loja"><div className={s.railLabel}>CATÁLOGO</div><button type="button" className={s.railButton} aria-label="Ver skins" aria-pressed={tab === 'skins'} onClick={() => setTab('skins')}><span>Skins</span><span>{SKINS.length}</span></button><button type="button" className={s.railButton} aria-label="Ver pets" aria-pressed={tab === 'pets'} onClick={() => setTab('pets')}><span>Pets</span><span>{PETS.length}</span></button>{tab === 'skins' && <><div className={s.railLabel}>PERSONAGEM</div><button type="button" className={s.railButton} aria-pressed={filter === 'crisoman'} onClick={() => setFilter('crisoman')}>Crisoman</button><button type="button" className={s.railButton} aria-pressed={filter === 'crisogirl'} onClick={() => setFilter('crisogirl')}>Crisogirl</button></>}</aside>
      <section className={`${s.panel} ${s.shopContent}`}>
        <div className={s.shopTools}><div><span className={s.eyebrow}>{tab === 'skins' ? (filter === 'crisoman' ? 'VISUAIS DO CRISOMAN' : 'VISUAIS DA CRISOGIRL') : 'COMPANHEIROS'}</span><p>{tab === 'skins' ? 'Escolha um personagem para ver os visuais disponíveis.' : 'Os pets acompanham o personagem durante as fases.'}</p></div><div className={s.wallet}><CoinIcon/><b>{economy.coins.toLocaleString('pt-BR')}</b></div></div>
        {tab === 'pets' && economy.equippedPet && <div className={s.petUnequip}><span>Pet atual: <b>{PETS.find((item) => item.id === economy.equippedPet)?.name ?? '—'}</b></span><button type="button" className={s.quietButton} disabled={busy} onClick={() => equip(null)}>Remover pet</button></div>}
        <section className={s.skinGrid} aria-label={tab === 'skins' ? `Skins de ${filter}` : 'Pets'}>{items.map((item, index) => {
          const owned = economy.owned.includes(item.id);
          const active = item.character ? economy.equippedSkin[item.character] === item.id : economy.equippedPet === item.id;
          const image = tab === 'pets' ? (item.icon ?? item.image) : item.image;
          return <article className={s.itemCard} key={item.id} style={{ animationDelay: `${index * 35}ms` }}>
            <div className={`${s.artBox} ${tab === 'pets' ? s.pet : ''}`}><img src={image} alt={`${item.name}${item.character ? ` — ${item.character === 'crisoman' ? 'Crisoman' : 'Crisogirl'}` : ''}`} loading="lazy"/><span className={s.rarity}>{item.rarity}</span></div>
            <div className={s.itemBody}><h3>{item.name}</h3><div className={s.itemMeta}><span>{owned ? (active ? 'Equipado' : 'Adquirido') : 'Disponível'}</span><span className={s.price}><CoinIcon/>{item.price === 0 ? 'Grátis' : item.price}</span></div>
              {owned ? <button type="button" className={s.itemButton} aria-label={active ? `${item.name} equipado` : `Equipar ${item.name}`} disabled={busy || active} onClick={() => equip(item.id)}>{active ? 'Equipado' : 'Equipar'}</button> : <button type="button" className={s.itemButton} aria-label={`Comprar ${item.name}`} disabled={busy || economy.coins < item.price} onClick={() => void buy(item.id)}>{economy.coins < item.price ? 'Moedas insuficientes' : `Comprar · ${item.price} moedas`}</button>}
            </div>
          </article>;
        })}</section>
      </section>
    </div>
    <p className={s.toast} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}
