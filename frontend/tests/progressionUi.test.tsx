// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshEconomy } from '../src/app/economy';
import Progression from '../src/components/Progression';
import type { ProgressionState } from '../src/app/api';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const render = (ui: ReactElement) => act(() => root.render(ui));
const click = async (el: Element) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 0)); });
const buttons = () => [...host.querySelectorAll('button')];
const state = (o: Partial<ProgressionState> = {}): ProgressionState => ({ skills: { jump: 0, speed: 0, defense: 0, magnet: 0 }, pets: {}, daily: { date: '2026-10-30', resetsAt: Date.UTC(2026, 9, 31), counts: { wins: 0, materials: 0, recycles: 0 }, claimed: [] }, ...o });
const props = (economy = freshEconomy(), progression = state()) => ({ economy, progress: { unlocked: 1, stars: [], coins: economy.coins, best: [] } as never, progression, onUpgrade: vi.fn(async () => ({ ok: true, message: 'ok' })), onClaim: vi.fn(async () => ({ ok: true, message: 'ok' })), onNavigate: vi.fn(), onMap: vi.fn() });

describe('tela Habilidades & missões', () => {
  it('mostra as 4 habilidades com custo do próximo nível e bloqueia sem saldo', () => {
    const e = freshEconomy(); e.coins = 150; const p = props(e, state({ skills: { jump: 0, speed: 1, defense: 2, magnet: 3 } })); render(<Progression {...p} />);
    for (const name of ['Salto aprimorado', 'Velocidade', 'Defesa natural', 'Coleta magnética']) expect(host.textContent).toContain(name);
    const b = buttons(); const jump = b.find((x) => x.textContent?.includes('100 moedas'))!, speed = b.find((x) => x.textContent?.includes('200 moedas'))!, def = b.find((x) => x.textContent?.includes('350 moedas'))!;
    expect(jump.disabled).toBe(false); expect(speed.disabled).toBe(true); expect(def.disabled).toBe(true); expect(host.textContent).toContain('NÍVEL MÁXIMO');
  });
  it('enviar melhoria informa o nível atual (proteção contra clique duplo)', async () => {
    const e = freshEconomy(); e.coins = 1000; const p = props(e, state({ skills: { jump: 1, speed: 0, defense: 0, magnet: 0 } })); render(<Progression {...p} />);
    await click(buttons().find((x) => x.textContent?.includes('200 moedas'))!); expect(p.onUpgrade).toHaveBeenCalledWith('jump', 1);
  });
  it('pets: sem pets mostra convite à loja; nível 10 aparece como máximo', () => {
    render(<Progression {...props()} />); expect(host.textContent).toContain('Você ainda não possui pets');
    const e = freshEconomy(); e.owned.push('pet-foxy'); e.equippedPet = 'pet-foxy'; render(<Progression {...props(e, state({ pets: { 'pet-foxy': { xp: 0, level: 10 } } }))} />);
    expect(host.textContent).toContain('NÍVEL MÁXIMO'); expect(host.textContent).toContain('EQUIPADO');
  });
  it('missões: só resgata quando concluída e uma vez; mostra horário de renovação', async () => {
    const p = props(freshEconomy(), state({ daily: { date: '2026-10-30', resetsAt: Date.UTC(2026, 9, 31), counts: { wins: 1, materials: 2, recycles: 1 }, claimed: ['recycle'] } })); render(<Progression {...p} />);
    const labels = buttons().map((b) => b.textContent); expect(labels).toContain('RESGATAR'); expect(labels).toContain('EM ANDAMENTO'); expect(labels).toContain('RESGATADA');
    expect(host.textContent).toContain('renova às'); await click(buttons().find((b) => b.textContent === 'RESGATAR')!); expect(p.onClaim).toHaveBeenCalledWith('win');
    expect(buttons().find((b) => b.textContent === 'RESGATADA')!.disabled).toBe(true); expect(buttons().find((b) => b.textContent === 'EM ANDAMENTO')!.disabled).toBe(true);
  });
});
