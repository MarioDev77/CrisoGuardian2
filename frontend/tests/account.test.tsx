// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountDialog, Profile } from '../src/components/Account';
import { ACHIEVEMENTS } from '../src/app/catalog-ach';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null; let host: HTMLElement | null = null;
async function mount(el: ReactElement) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => { root!.render(el); }); return host; }
afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });
/** Digita num campo controlado do React (setter nativo + evento input). */
async function type(input: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click(); }); };
const field = (h: HTMLElement, label: RegExp) => [...h.querySelectorAll('label')].find((l) => label.test(l.textContent ?? ''))!.querySelector('input')!;
const submit = (h: HTMLElement) => [...h.querySelectorAll('button')].find((b) => /criar conta e salvar/i.test(b.textContent ?? ''))!;
const base = { username: null, onClose: () => {}, onLogout: async () => {}, onDelete: async () => null, onProfile: () => {} };

describe('cadastro e perfil', () => {
  it('valida nome e confirmação da senha antes de chamar o servidor', async () => {
    const onRegister = vi.fn(async () => null);
    const h = await mount(<AccountDialog {...base} onRegister={onRegister} onLogin={async () => null} />);
    await type(field(h, /nome de usuário/i), 'ab'); await type(field(h, /^senha/i), 'senha-bem-longa'); await click(submit(h));
    expect(h.querySelector('[role=alert]')!.textContent).toMatch(/3 a 20/);
    await type(field(h, /nome de usuário/i), 'guardiao_1'); await type(field(h, /repita/i), 'outra-coisa'); await click(submit(h));
    expect(h.querySelector('[role=alert]')!.textContent).toMatch(/não são iguais/); expect(onRegister).not.toHaveBeenCalled();
    await type(field(h, /repita/i), 'senha-bem-longa'); await click(submit(h));
    expect(onRegister).toHaveBeenCalledWith('guardiao_1', 'senha-bem-longa');
  });
  it('mostra o erro do servidor (nome em uso) sem fechar a janela', async () => {
    const onClose = vi.fn();
    const h = await mount(<AccountDialog {...base} onClose={onClose} onRegister={async () => 'Esse nome já está em uso.'} onLogin={async () => null} />);
    await type(field(h, /nome de usuário/i), 'maria'); await type(field(h, /^senha/i), 'senha-bem-longa'); await type(field(h, /repita/i), 'senha-bem-longa'); await click(submit(h));
    expect(h.querySelector('[role=alert]')!.textContent).toMatch(/já está em uso/); expect(onClose).not.toHaveBeenCalled();
  });
  it('perfil lista as 16 fases e todas as conquistas, destacando as desbloqueadas', async () => {
    const stars = Array(16).fill(0); stars[0] = 3; stars[1] = 1;
    const h = await mount(<Profile username="Maria" progress={{ unlocked: 3, stars, best: Array(16).fill(0), coins: 10 } as never} achievements={{ first_steps: Date.now() }} stats={null} onBack={() => {}} onOpenAccount={() => {}} />);
    expect(h.querySelectorAll('ol li')).toHaveLength(16); expect(h.querySelectorAll('ul li')).toHaveLength(ACHIEVEMENTS.length);
    expect(h.querySelectorAll('ul li[data-got="true"]')).toHaveLength(1); expect(h.textContent).toContain('2/16');
  });
});
