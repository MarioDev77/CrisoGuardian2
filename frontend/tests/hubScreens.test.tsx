// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshEconomy, type EconomyState } from '../src/app/economy';
import HubHeader from '../src/components/HubHeader';
import Lobby from '../src/components/Lobby';
import Recycling from '../src/components/Recycling';
import Shop from '../src/components/Shop';

vi.mock('../src/game/assets', () => ({ Assets: { get: async () => ({ draw: vi.fn(), actorFrame: () => null, petFrame: () => null }) } }));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ save: vi.fn(), restore: vi.fn(), filter: 'none' } as unknown as CanvasRenderingContext2D); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const render = (ui: ReactElement) => act(() => root.render(ui));
const click = async (el: Element) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
const button = (label: string) => [...host.querySelectorAll('button')].find((element) => element.textContent?.trim().includes(label))!;

describe('Lobby, Loja e Reciclagem', () => {
  it('alterna a navegação superior sem perder o estado atual e mantém o atalho para as fases', async () => {
    const economy = freshEconomy(); economy.coins = 245;
    const navigate = vi.fn(); const onMap = vi.fn();
    render(<HubHeader active="lobby" economy={economy} unlocked={3} onNavigate={navigate} onMap={onMap}/>);
    expect(host.textContent).toContain('245');
    expect(host.textContent).toContain('03');
    await click(button('Loja')); expect(navigate).toHaveBeenCalledWith('shop');
    await click(button('Reciclagem')); expect(navigate).toHaveBeenCalledWith('recycle');
    await click(button('← Fases')); expect(onMap).toHaveBeenCalledOnce();
  });

  it('o botão Jogar do Lobby inicia o fluxo e personagens continuam selecionáveis', async () => {
    const economy = freshEconomy(); const play = vi.fn(); const navigate = vi.fn();
    render(<Lobby economy={economy} progress={{ unlocked: 2, stars: Array(11).fill(0), coins: 0, best: Array(11).fill(0) }} onEconomy={async () => ({ ok: true, message: '' })} onNavigate={navigate} onMap={vi.fn()} onPlay={play} onProgression={vi.fn()}/>);
    await click(button('Crisogirl')); expect(host.textContent).toContain('Crisogirl');
    await click(button('JOGAR')); expect(play).toHaveBeenCalledOnce();
    await click(button('Loja')); expect(navigate).toHaveBeenCalledWith('shop');
  });

  it('compra com confirmação e equipa um pet já adquirido', async () => {
    const economy = freshEconomy(); economy.coins = 300; economy.owned.push('pet-foxy');
    const purchase = vi.fn(async () => ({ ok: true, message: 'Comprado.' })); const equip = vi.fn(async () => ({ ok: true, message: 'Equipado.' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Shop economy={economy} unlocked={1} onPurchase={purchase} onEquip={equip} onNavigate={vi.fn()} onMap={vi.fn()}/>);
    await click(host.querySelector<HTMLButtonElement>('button[aria-label="Comprar Urbano"]')!);
    expect(purchase).toHaveBeenCalledWith('skin-crisoman-urbano');
    await click(host.querySelector<HTMLButtonElement>('button[aria-label="Ver pets"]')!);
    await click(host.querySelector<HTMLButtonElement>('button[aria-label="Equipar Foxy"]')!);
    expect(equip).toHaveBeenCalledWith('pet-foxy');
  });

  it('recicla somente pacotes disponíveis e informa o lote escolhido', async () => {
    const economy: EconomyState = { ...freshEconomy(), materials: { plastico: 0, papel: 20, vidro: 0, metal: 0 } };
    const recycle = vi.fn(async () => ({ ok: true, message: 'Troca concluída: +30 moedas.' }));
    render(<Recycling economy={economy} unlocked={1} onRecycle={recycle} onNavigate={vi.fn()} onMap={vi.fn()}/>);
    const paper = [...host.querySelectorAll('article')].find((article) => article.textContent?.includes('papel'))!;
    await click(paper.querySelector('button[aria-label="Aumentar pacotes de papel"]')!);
    await click(button('Reciclar 2 pacote(s)'));
    expect(recycle).toHaveBeenCalledWith('papel', 2);
    expect(host.textContent).toContain('+30 moedas');
  });
});
