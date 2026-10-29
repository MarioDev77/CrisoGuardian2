import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const children: ChildProcess[] = []; const dirs: string[] = [];
async function freePort() { const s = createServer(); await new Promise<void>((r) => s.listen(0, '127.0.0.1', r)); const a = s.address() as { port: number }; await new Promise<void>((r) => s.close(() => r())); return a.port; }
async function start() {
  const port = await freePort(); const dir = resolve('..', 'backend', `test-runtime-${randomUUID()}`); dirs.push(dir); await mkdir(dir, { recursive: true });
  const child = spawn(process.execPath, ['../backend/economy-api.mjs'], { cwd: process.cwd(), env: { ...process.env, CRISO_API_PORT: String(port), CRISO_DATA_DIR: dir, CRISO_TEST_MODE: '1', CRISO_SERVER_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres!!' } });
  children.push(child); const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${base}/api/economy`)).ok) break; } catch { /* aguarda */ } await new Promise((r) => setTimeout(r, 100)); }
  return { base, dir };
}
/** Cliente com "jar" de cookies (o servidor troca o cookie ao entrar/sair). */
function client(base: string) {
  let cookie = '';
  const call = async (path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0]!;
    return { status: res.status, json: (await res.json()) as any, set };
  };
  return { call, get cookie() { return cookie; } };
}
afterEach(async () => { for (const c of children.splice(0)) c.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 150)); for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

describe('contas, conquistas e salvamento', () => {
  it('cadastro leva o progresso de convidado, senha não vai em texto e há conquista de registro', async () => {
    const { base, dir } = await start(); const c = client(base);
    await c.call('/api/economy'); await c.call('/api/test/seed', { economy: { coins: 77 }, progress: { unlocked: 4, stars: [3, 2, 1, 0] } });
    const r = await c.call('/api/auth/register', { username: 'Maria_01', password: 'verde-forte-2026' });
    expect(r.status).toBe(200); expect(r.json.account.username).toBe('Maria_01'); expect(r.json.economy.coins).toBe(77); expect(r.json.progress.unlocked).toBe(4);
    expect(r.json.newAchievements).toEqual(expect.arrayContaining(['registered', 'first_steps']));
    expect(r.set).toContain('HttpOnly'); expect(r.set).toContain('SameSite=Lax');
    expect(await readFile(`${dir}/players.signed.json`, 'utf8')).not.toContain('verde-forte-2026');
    // duplicado (mesmo ignorando maiúsculas) e senha fraca
    expect((await client(base).call('/api/auth/register', { username: 'maria_01', password: 'outra-senha-ok-1' })).status).toBe(409);
    expect((await client(base).call('/api/auth/register', { username: 'Joao_02', password: '12345678' })).status).toBe(400);
    expect((await client(base).call('/api/auth/register', { username: 'a b', password: 'senha-longa-123' })).status).toBe(400);
  });
  it('login em outro aparelho recupera tudo; logout volta a convidado; senha errada falha igual para usuário inexistente', async () => {
    const { base } = await start(); const a = client(base);
    await a.call('/api/economy'); await a.call('/api/test/seed', { progress: { unlocked: 6, stars: [3, 3, 3, 2, 2, 0] } });
    await a.call('/api/auth/register', { username: 'Guardiao', password: 'minha-senha-9000' });
    const b = client(base); await b.call('/api/economy');                       // outro navegador, convidado
    const wrong = await b.call('/api/auth/login', { username: 'Guardiao', password: 'errada-errada' }); const ghost = await b.call('/api/auth/login', { username: 'ninguem', password: 'errada-errada' });
    expect(wrong.status).toBe(401); expect(ghost.status).toBe(401); expect(wrong.json.message).toBe(ghost.json.message);
    const ok = await b.call('/api/auth/login', { username: 'guardiao', password: 'minha-senha-9000' });
    expect(ok.status).toBe(200); expect(ok.json.progress.unlocked).toBe(6); expect(ok.json.progress.stars.slice(0, 3)).toEqual([3, 3, 3]);
    const out = await b.call('/api/auth/logout', {}); expect(out.json.account).toBeNull(); expect(out.json.progress.unlocked).toBe(1);
    expect((await b.call('/api/economy')).json.account).toBeNull();
  });
  it('bloqueia a conta depois de 5 senhas erradas e não aceita sessão antiga após o login (cookie rotacionado)', async () => {
    const { base } = await start(); const a = client(base); await a.call('/api/economy');
    await a.call('/api/auth/register', { username: 'Lock_Test', password: 'senha-boa-1234' });
    const b = client(base); const before = (await b.call('/api/economy')).json; expect(before.account).toBeNull(); const oldCookie = b.cookie;
    await b.call('/api/auth/login', { username: 'Lock_Test', password: 'senha-boa-1234' }); expect(b.cookie).not.toBe(oldCookie);
    const c = client(base); let last = 0;
    for (let i = 0; i < 6; i++) last = (await c.call('/api/auth/login', { username: 'Lock_Test', password: 'chute-' + i })).status;
    expect(last).toBe(429);
    expect((await c.call('/api/auth/login', { username: 'Lock_Test', password: 'senha-boa-1234' })).status).toBe(429); // continua bloqueada
  });
  it('excluir conta apaga os dados e exige a senha', async () => {
    const { base } = await start(); const a = client(base); await a.call('/api/economy');
    await a.call('/api/auth/register', { username: 'Apagar_Me', password: 'senha-boa-1234' });
    expect((await a.call('/api/auth/delete', { password: 'errada-errada' })).status).toBe(401);
    expect((await a.call('/api/auth/delete', { password: 'senha-boa-1234' })).status).toBe(200);
    expect((await client(base).call('/api/auth/login', { username: 'Apagar_Me', password: 'senha-boa-1234' })).status).toBe(401);
  });
});
