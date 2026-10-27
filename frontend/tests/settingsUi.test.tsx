// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TitleScreen from '../src/components/TitleScreen';
import { SettingsDialog } from '../src/components/Dialogs';
import { DEFAULT_KEYS, getSettings, resetSettings } from '../src/app/settings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { localStorage.clear(); resetSettings(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

const render = (ui: React.ReactElement) => act(() => root.render(ui));
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const textBtn = (t: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === t)!;
const byLabel = <T extends Element = HTMLButtonElement>(l: string) => host.querySelector<T>(`[aria-label="${l}"]`)!;
const tab = (name: string) => click([...host.querySelectorAll('[role=tab]')].find((b) => b.textContent === name)!);
const key = (code: string) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })); });
const open = (extra: Partial<React.ComponentProps<typeof SettingsDialog>> = {}) => render(<SettingsDialog onClose={vi.fn()} {...extra} />);

describe('janela de configurações', () => {
  it('Jogo: dificuldade, tiro automático e demais opções alteram e salvam', () => {
    open();
    click(textBtn('Difícil')); expect(getSettings().difficulty).toBe('hard'); expect(host.textContent).toContain('3 corações');
    click(byLabel('Tiro automático')); expect(getSettings().autoFire).toBe(true); expect(byLabel('Tiro automático').getAttribute('aria-checked')).toBe('true');
    click(byLabel('Abertura da fase')); expect(getSettings().introAnim).toBe(false);
    click(byLabel('Pausar ao sair da aba')); expect(getSettings().pauseOnBlur).toBe(false);
    expect(JSON.parse(localStorage.getItem('crisoguardian-settings-v1')!)).toMatchObject({ difficulty: 'hard', autoFire: true, introAnim: false });
  });

  it('não há mais botões de liberar fases nem de apagar progresso', () => {
    open(); expect(host.textContent).not.toContain('Liberar todas as fases'); expect(host.textContent).not.toContain('Apagar progresso');
  });

  it('em partida mostra Reiniciar fase e Voltar ao mapa; fora dela, não', () => {
    open(); expect(textBtn('Reiniciar fase')).toBeUndefined(); act(() => root.unmount()); root = createRoot(host);
    const onRestart = vi.fn(), onExit = vi.fn(); open({ inGame: { onRestart, onExit } });
    click(textBtn('Reiniciar fase')); expect(onRestart).toHaveBeenCalledTimes(1); click(textBtn('Voltar ao mapa')); expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('Áudio: sliders e mudo mexem nos volumes', () => {
    open(); tab('Áudio');
    const set = (label: string, v: number) => act(() => { const i = byLabel<HTMLInputElement>(label); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(i, String(v)); i.dispatchEvent(new Event('input', { bubbles: true })); });
    set('Volume geral', 30); expect(getSettings().master).toBeCloseTo(0.3); set('Volume da música', 0); expect(getSettings().music).toBe(0); set('Volume dos efeitos', 100); expect(getSettings().sfx).toBe(1);
    click(byLabel('Som ligado')); expect(getSettings().muted).toBe(true); expect(host.textContent).toContain('O som está desligado');
  });

  it('modal mantém a navegação por Tab dentro da janela', () => {
    open();
    const dialog = host.querySelector('[role="dialog"]')!;
    const items = [...dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    const first = items[0]!; const last = items[items.length - 1]!;
    act(() => { last.focus(); last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(first);
  });

  it('Controles: remapeia pulo, troca com outra ação, recusa Esc e restaura o padrão', () => {
    const onClose = vi.fn(); open({ onClose }); tab('Controles');
    click(byLabel('Pular — tecla principal: Espaço')); expect(host.textContent).toContain('Pressione…');
    key('KeyQ'); expect(getSettings().keys.jump[0]).toBe('KeyQ'); expect(host.textContent).toContain('Pular: Q');
    click(byLabel('Atirar — tecla principal: J')); key('KeyQ'); // Q era de "Pular": trocam
    expect(getSettings().keys.shoot[0]).toBe('KeyQ'); expect(getSettings().keys.jump[0]).toBe('KeyJ'); expect(host.textContent).toContain('ficou com J');
    click(byLabel('Atirar — tecla alternativa: X')); key('Escape'); expect(onClose).not.toHaveBeenCalled(); expect(host.textContent).toContain('Cancelado'); // Esc cancela, não fecha
    click(byLabel('Atirar — tecla alternativa: X')); key('F5'); expect(host.textContent).toContain('reservada');
    click(byLabel('Limpar tecla alternativa de Mover à esquerda')); expect(getSettings().keys.left[1]).toBe('');
    click(textBtn('Restaurar teclas padrão')); expect(getSettings().keys).toEqual(DEFAULT_KEYS);
  });

  it('Controles de toque e Tela: modo, tamanho, qualidade, tremor, luz e FPS', () => {
    open(); tab('Controles');
    click(textBtn('Sempre')); expect(getSettings().touchMode).toBe('on'); click(textBtn('G')); expect(getSettings().touchSize).toBe('lg');
    tab('Tela');
    click(textBtn('Baixa')); expect(getSettings().quality).toBe('low');
    const shake = getSettings().screenShake; click(byLabel('Tremor de tela')); expect(getSettings().screenShake).toBe(!shake);
    click(byLabel('Luz e vinheta')); expect(getSettings().lighting).toBe(false); click(byLabel('Mostrar FPS')); expect(getSettings().showFps).toBe(true);
  });

  it('Restaurar padrões pede confirmação e zera tudo', () => {
    open(); click(textBtn('Difícil')); click(textBtn('Restaurar padrões')); expect(getSettings().difficulty).toBe('hard'); // ainda não restaurou
    click(textBtn('Confirmar: restaurar tudo')); expect(getSettings().difficulty).toBe('normal'); expect(host.textContent).toContain('Configurações restauradas');
  });

  it('a mesma janela abre na tela de título e Esc a fecha', () => {
    render(<TitleScreen onPlay={vi.fn()} />);
    click(byLabel('Configurações')); expect(host.querySelector('[role=tablist]')).toBeTruthy();
    key('Escape'); expect(host.querySelector('[role=tablist]')).toBeNull();
  });
});
