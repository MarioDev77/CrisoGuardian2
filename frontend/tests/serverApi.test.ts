import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const children: ChildProcess[] = [];
const tempDirs: string[] = [];
async function portAvailable() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Porta inválida.');
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); return address.port;
}
async function launch(port: number, dataDir: string) {
  const child = spawn(process.execPath, ['../backend/economy-api.mjs'], { cwd: process.cwd(), env: { ...process.env, CRISO_API_PORT: String(port), CRISO_DATA_DIR: dataDir, CRISO_TEST_MODE: '1', CRISO_SERVER_SECRET: 'server-test-secret-0123456789abcdef' }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child); let logs = '';
  child.stdout?.on('data', (data) => { logs += data.toString(); }); child.stderr?.on('data', (data) => { logs += data.toString(); });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`Servidor terminou: ${logs}`);
    try { const response = await fetch(`${base}/api/economy`); if (response.ok) return { child, base, cookie: response.headers.get('set-cookie')!.split(';')[0]! }; } catch { /* aguarda inicialização */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill(); throw new Error(`Servidor não iniciou: ${logs}`);
}
async function stop(child: ChildProcess) { if (child.exitCode !== null) return; child.kill('SIGTERM'); await Promise.race([new Promise<void>((resolve) => child.once('exit', () => resolve())), new Promise<void>((resolve) => setTimeout(resolve, 1500))]); }
async function post(base: string, cookie: string, path: string, data: unknown) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
afterEach(async () => { for (const child of children.splice(0)) await stop(child); for (const dir of tempDirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

describe('API de economia server-side', () => {
  it('serializa compras duplicadas e restaura o backup se o save assinado for adulterado', async () => {
    const port = await portAvailable(); const dataDir = resolve('..', 'backend', `test-runtime-${randomUUID()}`); tempDirs.push(dataDir); await mkdir(dataDir, { recursive: true });
    let launched = await launch(port, dataDir);
    let { base, cookie } = launched;
    const fixture = { coins: 120, materials: { plastico: 0, papel: 0, vidro: 0, metal: 0 }, owned: ['skin-crisoman-verde', 'skin-crisogirl-rosa'], equippedSkin: { crisoman: 'skin-crisoman-verde', crisogirl: 'skin-crisogirl-rosa' }, equippedPet: null, character: 'crisoman', claimedSpawns: [], transactions: [] };
    expect((await post(base, cookie, '/api/test/seed', { economy: fixture })).status).toBe(200);
    const results = await Promise.all([post(base, cookie, '/api/economy/purchase', { itemId: 'skin-crisoman-urbano' }), post(base, cookie, '/api/economy/purchase', { itemId: 'skin-crisoman-urbano' })]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 400]);
    const current = await (await fetch(`${base}/api/economy`, { headers: { cookie } })).json() as any;
    expect(current.economy.coins).toBe(0); expect(current.economy.owned.filter((id: string) => id === 'skin-crisoman-urbano')).toHaveLength(1); expect(current.economy.transactions).toHaveLength(1);

    const file = resolve(dataDir, 'players.signed.json'); const envelope = JSON.parse(await readFile(file, 'utf8')) as { payload: string; mac: string };
    const database = JSON.parse(envelope.payload); database.players[cookie.slice('criso_sid='.length)].economy.coins = 999999;
    envelope.payload = JSON.stringify(database); await writeFile(file, JSON.stringify(envelope));
    await stop(launched.child);
    launched = await launch(port, dataDir); base = launched.base; cookie = `criso_sid=${cookie.slice('criso_sid='.length)}`;
    const restored = await (await fetch(`${base}/api/economy`, { headers: { cookie } })).json() as any;
    expect(restored.economy.coins).toBe(120); expect(restored.economy.owned).not.toContain('skin-crisoman-urbano');
  }, 15000);
});
