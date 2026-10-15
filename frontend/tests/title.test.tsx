// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/app/App';
import TitleScreen from '../src/components/TitleScreen';
import { loadProgress } from '../src/app/progress';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement; let root: Root;
beforeEach(() => { localStorage.clear(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); });

const render = (ui: React.ReactElement) => act(() => root.render(ui));
const btn = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const textBtn = (txt: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === txt)!;

describe('tela de título', () => {
  it('tem os 4 botões e todos têm função', () => {
    const onPlay = vi.fn();
    render(<TitleScreen onPlay={onPlay} />);
    for (const l of ['Jogar', 'Configurações', 'Tutoriais', 'Sair']) expect(btn(l), l).toBeTruthy();

    click(btn('Jogar')); expect(onPlay).toHaveBeenCalledTimes(1);

    click(btn('Configurações')); expect(host.textContent).toContain('Dificuldade'); expect(host.textContent).not.toContain('Liberar todas as fases'); expect(host.textContent).not.toContain('Apagar progresso');
    click(textBtn('Fechar')); expect(host.textContent).not.toContain('Dificuldade');

    click(btn('Tutoriais')); expect(host.textContent).toContain('Como jogar');
    click(textBtn('Entendi!')); expect(host.textContent).not.toContain('Como jogar');
  });

  it('Sair pede confirmação e mostra a despedida', () => {
    vi.useFakeTimers(); const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
    render(<TitleScreen onPlay={vi.fn()} />);
    click(btn('Sair')); expect(host.textContent).toContain('Sair do jogo?');
    click(textBtn('Continuar jogando')); expect(host.textContent).not.toContain('Sair do jogo?');
    click(btn('Sair')); click(textBtn('Sim, sair')); expect(close).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); }); expect(host.textContent).toContain('Obrigado por jogar!');
    click(textBtn('Voltar ao início')); expect(host.textContent).not.toContain('Obrigado por jogar!');
  });

  it('Enter inicia o jogo, mas não com uma janela aberta', () => {
    const onPlay = vi.fn(); render(<TitleScreen onPlay={onPlay} />);
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); }); expect(onPlay).toHaveBeenCalledTimes(1);
    click(btn('Tutoriais')); act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); }); expect(onPlay).toHaveBeenCalledTimes(1);
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); }); expect(host.textContent).not.toContain('Como jogar');
  });
});

describe('fluxo do app', () => {
  it('título → mapa → voltar ao título; configurações do mapa funcionam', () => {
    render(<App />);
    expect(btn('Jogar')).toBeTruthy();
    click(btn('Jogar')); expect(btn('Voltar à tela inicial')).toBeTruthy(); expect(btn('Fase 1')).toBeTruthy();
    click(btn('Configurações')); expect(host.textContent).toContain('Dificuldade'); expect(loadProgress().unlocked).toBe(1);
    click(textBtn('Fechar'));
    click(btn('Voltar à tela inicial')); expect(btn('Jogar')).toBeTruthy();
  });
});
