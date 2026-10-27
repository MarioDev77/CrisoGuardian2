import { useMemo, useState } from 'react';
import { MATERIALS, RECYCLING } from '../app/catalog';
import type { EconomyState } from '../app/economy';
import HubHeader, { type HubSection, CoinIcon } from './HubHeader';
import { MaterialIcon } from './MaterialIcon';
import s from './Hub.module.css';

type Props = { economy: EconomyState; unlocked: number; onRecycle: (material: string, batches: number) => Promise<{ ok: boolean; message: string }>; onNavigate: (section: HubSection) => void; onMap: () => void };

export default function Recycling({ economy, unlocked, onRecycle, onNavigate, onMap }: Props) {
  const [batches, setBatches] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const total = useMemo(() => Object.values(economy.materials).reduce((sum, amount) => sum + amount, 0), [economy.materials]);
  const exchanges = economy.transactions.filter((entry) => entry.type === 'recycle').slice(-5).reverse();
  const countBatches = (material: string) => Math.floor((economy.materials[material] ?? 0) / RECYCLING.materialsPerExchange);
  const setBatch = (material: string, value: number) => setBatches((current) => ({ ...current, [material]: Math.max(1, Math.min(countBatches(material), value)) }));
  const exchange = async (material: string) => {
    if (busy || countBatches(material) < 1) return;
    setBusy(true);
    try { const result = await onRecycle(material, Math.min(batches[material] ?? 1, countBatches(material))); setNotice(result.message); }
    finally { setBusy(false); }
  };

  return <main className={s.screen}><div className={s.shell}>
    <HubHeader active="recycle" economy={economy} unlocked={unlocked} onNavigate={onNavigate} onMap={onMap}/>
    <div className={s.titleRow}><div><span className={s.kicker}>ECONOMIA CIRCULAR</span><h1>Reciclagem</h1><p>Troque materiais coletados por moedas usando a taxa do jogo.</p></div><button type="button" className={s.quietButton} onClick={onMap}>← Escolher fase</button></div>
    <div className={s.recycleIntro}>
      <section className={`${s.panel} ${s.recycleSummary}`}><span className={s.eyebrow}>INVENTÁRIO ATUAL</span><strong>{total} <small>materiais</small></strong><p>Os materiais são adicionados ao inventário ao concluir uma fase. Não existe limite de capacidade configurado.</p></section>
      <section className={`${s.panel} ${s.exchangeRate}`}><span className={s.eyebrow}>TAXA DE TROCA FIXA</span><h3>Recicle materiais para receber moedas</h3><div className={s.rateFormula}><b>{RECYCLING.materialsPerExchange}</b> unidades do mesmo material <span aria-hidden="true">→</span> <CoinIcon/><b>{RECYCLING.coinsPerExchange}</b> moedas</div></section>
    </div>
    <section className={s.recycleGrid} aria-label="Materiais recicláveis">{MATERIALS.map((material, index) => {
      const stock = economy.materials[material] ?? 0;
      const max = countBatches(material);
      const selected = Math.max(1, Math.min(max || 1, batches[material] ?? 1));
      return <article className={s.recycleCard} key={material} style={{ animationDelay: `${index * 45}ms` }}>
        <span className={s.materialIcon}><MaterialIcon material={material}/></span><div className={s.recycleInfo}><h3>{material}</h3><p>{stock} unidades no inventário</p></div>
        <div className={s.recycleControls}><div className={s.batchControl}><button type="button" aria-label={`Diminuir pacotes de ${material}`} disabled={busy || max < 1 || selected <= 1} onClick={() => setBatch(material, selected - 1)}>−</button><span>{selected} pacote(s) · {selected * RECYCLING.materialsPerExchange}</span><button type="button" aria-label={`Aumentar pacotes de ${material}`} disabled={busy || selected >= max} onClick={() => setBatch(material, selected + 1)}>+</button></div><span className={s.price}><CoinIcon/>{selected * RECYCLING.coinsPerExchange}</span><button type="button" className={s.recycleButton} disabled={busy || max < 1} onClick={() => void exchange(material)}>{max < 1 ? `Precisa de ${RECYCLING.materialsPerExchange} unidades` : `Reciclar ${selected} pacote(s)`}</button></div>
      </article>;
    })}</section>
    <section className={`${s.panel} ${s.history}`}><h3>Atividade recente</h3>{exchanges.length ? exchanges.map((entry) => <div className={s.historyRow} key={entry.id}><span>{new Date(entry.at).toLocaleString('pt-BR')} · {entry.detail}</span><b>+{entry.coinsDelta} moedas</b></div>) : <p className={s.emptyHistory}>Suas trocas aparecerão aqui depois da primeira reciclagem.</p>}</section>
    <p className={s.toast} role="status" aria-live="polite">{notice}</p>
  </div></main>;
}
