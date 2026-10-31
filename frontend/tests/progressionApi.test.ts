import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/** Testes de integração reais: sobem backend/economy-api.mjs e chamam as rotas de habilidades, pets e missões diárias. */
const SECRET = 'server-test-secret-0123456789abcdef';
const children: ChildProcess[] = []; const dirs: string[] = [];
type Snap = { economy: any; progress: any; progression: any; account: { username: string } | null; payout?: any; message?: string };
interface Client { base: string; cookie: string; dir: string; child: ChildProcess; port: number }

async function freePort() { const s = createServer(); await new Promise<void>((r) => s.listen(0, '127.0.0.1', r)); const a = s.address() as { port: number }; await new Promise<void>((r) => s.close(() => r())); return a.port; }
async function boot(dir: string, port: number) {
  const child = spawn(process.execPath, [resolve('..', 'backend', 'economy-api.mjs')], { env: { ...process.env, CRISO_API_PORT: String(port), CRISO_DATA_DIR: dir, CRISO_TEST_MODE: '1', CRISO_SERVER_SECRET: SECRET }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child); let logs = ''; child.stdout?.on('data', (d) => { logs += d; }); child.stderr?.on('data', (d) => { logs += d; });
  for (let i = 0; i < 80; i++) { if (child.exitCode !== null) throw new Error(`Servidor terminou: ${logs}`); try { const r = await fetch(`http://127.0.0.1:${port}/api/economy`); if (r.ok) return { child, base: `http://127.0.0.1:${port}`, cookie: r.headers.get('set-cookie')!.split(';')[0]! }; } catch { /* aguarda */ } await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`Servidor não iniciou: ${logs}`);
}
async function start(): Promise<Client> { const dir = await mkdtemp(join(tmpdir(), 'criso-')); dirs.push(dir); const port = await freePort(); return { ...(await boot(dir, port)), dir, port }; }
async function stop(child: ChildProcess) { if (child.exitCode !== null) return; await new Promise<void>((r) => { child.once('exit', () => r()); child.kill('SIGTERM'); setTimeout(r, 2000); }); }
const post = (c: { base: string; cookie: string }, path: string, body: unknown, cookie = c.cookie) => fetch(`${c.base}${path}`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const get = async (c: { base: string; cookie: string }, cookie = c.cookie) => (await (await fetch(`${c.base}/api/economy`, { headers: { cookie } })).json()) as Snap;
const json = async (r: Response) => (await r.json()) as Snap;
const seed = (c: Client, body: unknown) => post(c, '/api/test/seed', body);
const OWN = ['skin-crisoman-verde', 'skin-crisogirl-rosa'];
const eco = (o: Record<string, unknown> = {}) => ({ coins: 0, materials: { plastico: 0, papel: 0, vidro: 0, metal: 0 }, owned: OWN, equippedSkin: { crisoman: OWN[0], crisogirl: OWN[1] }, equippedPet: null, character: 'crisoman', claimedSpawns: [], transactions: [], ...o });
/** Vitória em `age` segundos simulados (o servidor mede o tempo; /api/test/age-run só existe com CRISO_TEST_MODE). */
async function win(c: Client, level = 0, collectibles: unknown[] = [], age = 20) {
  const start = await post(c, '/api/run/start', { level }); const { runId } = (await start.json()) as { runId: string };
  if (age) await post(c, '/api/test/age-run', { seconds: age });
  return { runId, res: await post(c, '/api/run/settle', { runId, level, won: true, collectibles, stars: 3, score: 100 }) };
}
const mats = (n: number, prefix = 'm') => Array.from({ length: n }, (_, i) => ({ id: `material:${prefix}-${i}`, type: 'material', material: 'papel' }));
afterEach(async () => { for (const c of children.splice(0)) await stop(c); for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

describe('Árvore de habilidades (servidor)', () => {
  it('cobra 100/200/350, respeita o nível 3 e persiste após reiniciar o servidor', async () => {
    const c = await start(); await seed(c, { economy: eco({ coins: 1000 }) });
    for (const [lvl, cost] of [[0, 100], [1, 200], [2, 350]] as const) { const before = (await get(c)).economy.coins; const r = await post(c, '/api/progression/upgrade', { skill: 'jump', expectedLevel: lvl }); expect(r.status).toBe(200); const s = await json(r); expect(s.progression.skills.jump).toBe(lvl + 1); expect(before - s.economy.coins).toBe(cost); }
    const max = await post(c, '/api/progression/upgrade', { skill: 'jump' }); expect(max.status).toBe(400);
    expect((await get(c)).economy.coins).toBe(1000 - 650);
    const cookie = c.cookie; await stop(c.child); const again = await boot(c.dir, c.port);
    const s = await get(again, cookie); expect(s.progression.skills.jump).toBe(3); expect(s.economy.coins).toBe(350);
  }, 20000);
  it('recusa saldo insuficiente, habilidade inexistente e payloads maliciosos sem alterar nada', async () => {
    const c = await start(); await seed(c, { economy: eco({ coins: 99 }) });
    for (const body of [{ skill: 'speed' }, { skill: 'voar' }, { skill: '__proto__' }, { skill: ['speed'] }, { skill: { $ne: 1 } }, {}, { skill: 'speed', cost: 0, coins: 99999 }]) { const r = await post(c, '/api/progression/upgrade', body); expect(r.status, JSON.stringify(body)).toBe(400); }
    const s = await get(c); expect(s.economy.coins).toBe(99); expect(s.progression.skills).toEqual({ jump: 0, speed: 0, defense: 0, magnet: 0 });
  });
  it('cliques duplos simultâneos não compram dois níveis (expectedLevel) e cobram uma única vez', async () => {
    const c = await start(); await seed(c, { economy: eco({ coins: 1000 }) });
    const rs = await Promise.all([post(c, '/api/progression/upgrade', { skill: 'magnet', expectedLevel: 0 }), post(c, '/api/progression/upgrade', { skill: 'magnet', expectedLevel: 0 })]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const s = await get(c); expect(s.progression.skills.magnet).toBe(1); expect(s.economy.coins).toBe(900);
  });
  it('exige a própria sessão: outro jogador não consegue gastar as moedas alheias', async () => {
    const a = await start(); await seed(a, { economy: eco({ coins: 500 }) });
    const other = await fetch(`${a.base}/api/economy`); const otherCookie = other.headers.get('set-cookie')!.split(';')[0]!;
    expect((await post(a, '/api/progression/upgrade', { skill: 'jump' }, otherCookie)).status).toBe(400);
    expect((await get(a)).economy.coins).toBe(500); expect((await get(a)).progression.skills.jump).toBe(0);
  });
});

describe('Evolução dos pets (servidor)', () => {
  it('concede 25 XP por vitória válida, sobe de nível aos 100 XP e mantém o progresso após reiniciar', async () => {
    const c = await start(); await seed(c, { economy: eco({ owned: [...OWN, 'pet-foxy'], equippedPet: 'pet-foxy' }), progression: { pets: { 'pet-foxy': { xp: 50, level: 1 } } } });
    let s = await json((await win(c)).res); expect(s.progression.pets['pet-foxy']).toEqual({ xp: 75, level: 1 });
    s = await json((await win(c)).res); expect(s.progression.pets['pet-foxy']).toEqual({ xp: 0, level: 2 });
    const cookie = c.cookie; await stop(c.child); const again = await boot(c.dir, c.port);
    expect((await get(again, cookie)).progression.pets['pet-foxy']).toEqual({ xp: 0, level: 2 });
  }, 20000);
  it('para no nível 10 (sem XP infinito) e só o pet equipado evolui', async () => {
    const c = await start(); await seed(c, { economy: eco({ owned: [...OWN, 'pet-foxy', 'pet-brasa'], equippedPet: 'pet-foxy' }), progression: { pets: { 'pet-foxy': { xp: 899, level: 9 }, 'pet-brasa': { xp: 10, level: 1 } } } });
    let s = await json((await win(c)).res); expect(s.progression.pets['pet-foxy']).toEqual({ xp: 0, level: 10 });
    s = await json((await win(c)).res); expect(s.progression.pets['pet-foxy']).toEqual({ xp: 0, level: 10 }); expect(s.progression.pets['pet-brasa']).toEqual({ xp: 10, level: 1 });
  }, 20000);
  it('não dá XP sem pet equipado, em vitória instantânea (<15 s), nem ao reenviar a mesma partida', async () => {
    const c = await start(); await seed(c, { economy: eco({ owned: [...OWN, 'pet-foxy'] }) });
    await win(c); expect((await get(c)).progression.pets).toEqual({});
    expect((await post(c, '/api/economy/loadout', { petId: 'pet-foxy' })).status).toBe(200);
    const fast = await win(c, 0, [], 0); expect(fast.res.status).toBe(200); expect((await get(c)).progression.pets).toEqual({});
    const ok = await win(c); expect(ok.res.status).toBe(200); expect((await get(c)).progression.pets['pet-foxy'].xp).toBe(25);
    const replay = await post(c, '/api/run/settle', { runId: ok.runId, level: 0, won: true, collectibles: [], stars: 1, score: 1 }); expect(replay.status).toBe(409);
    expect((await get(c)).progression.pets['pet-foxy'].xp).toBe(25);
  }, 20000);
  it('não equipa pet que o jogador não possui e ignora XP/nível enviados pelo navegador', async () => {
    const c = await start(); await seed(c, { economy: eco({ owned: [...OWN, 'pet-foxy'], equippedPet: 'pet-foxy' }) });
    expect((await post(c, '/api/economy/loadout', { petId: 'pet-brasa' })).status).toBe(400);
    const start1 = await post(c, '/api/run/start', { level: 0 }); const { runId } = (await start1.json()) as { runId: string }; await post(c, '/api/test/age-run', { seconds: 20 });
    const r = await post(c, '/api/run/settle', { runId, level: 0, won: true, collectibles: [], stars: 3, score: 1, petXp: 99999, xp: 99999, petLevel: 10, progression: { pets: { 'pet-foxy': { xp: 0, level: 10 } } } });
    expect(r.status).toBe(200); expect((await json(r)).progression.pets['pet-foxy']).toEqual({ xp: 25, level: 1 });
  }, 20000);
  it('normaliza pets adulterados/antigos ao carregar (nível 1–10, XP coerente)', async () => {
    const c = await start(); const r = await json(await seed(c, { economy: eco({ owned: [...OWN, 'pet-foxy'] }), progression: { skills: { jump: 99, speed: -4, defense: 1.5, magnet: 'x' }, pets: { 'pet-foxy': { xp: 99999, level: 99 }, 'pet-fantasma': { xp: 5, level: 2 } } } }));
    expect(r.progression.skills).toEqual({ jump: 3, speed: 0, defense: 0, magnet: 0 }); expect(r.progression.pets).toEqual({ 'pet-foxy': { xp: 0, level: 10 } });
  });
});

describe('Missões diárias (servidor)', () => {
  it('vitória válida avança "vencer fase"; resgate só uma vez, inclusive em requisições simultâneas', async () => {
    const c = await start(); await seed(c, { economy: eco() });
    expect((await post(c, '/api/daily/claim', { taskId: 'win' })).status).toBe(400);   // ainda não concluída
    await win(c); const s0 = await get(c); expect(s0.progression.daily.counts.wins).toBe(1);
    const rs = await Promise.all([post(c, '/api/daily/claim', { taskId: 'win' }), post(c, '/api/daily/claim', { taskId: 'win' })]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 400]);
    const s = await get(c); expect(s.economy.coins).toBe(80); expect(s.progression.daily.claimed).toEqual(['win']);
    expect((await post(c, '/api/daily/claim', { taskId: 'win' })).status).toBe(400); expect((await get(c)).economy.coins).toBe(80);
  }, 20000);
  it('vitória instantânea não conta para a missão; ids inválidos são recusados', async () => {
    const c = await start(); await seed(c, { economy: eco() }); await win(c, 0, [], 0);
    expect((await get(c)).progression.daily.counts.wins).toBe(0);
    for (const taskId of ['x', '', null, { $ne: 1 }, ['win'], 'constructor']) expect((await post(c, '/api/daily/claim', { taskId })).status, String(taskId)).toBe(400);
    expect((await get(c)).economy.coins).toBe(0);
  });
  it('"coletar 5 materiais" conta a coleta da partida mesmo em fases já pagas (replays) e limita pelo tempo', async () => {
    const c = await start(); await seed(c, { economy: eco() });
    await win(c, 0, mats(5), 20); expect((await get(c)).progression.daily.counts.materials).toBe(5);
    await win(c, 0, mats(5), 20);   // mesma fase, mesmos spawns: sem pagamento, mas a missão acompanha a ação do jogador
    expect((await get(c)).progression.daily.counts.materials).toBe(10);
    const inflated = await start(); await seed(inflated, { economy: eco() }); await win(inflated, 0, mats(400, 'z'), 20);
    expect((await get(inflated)).progression.daily.counts.materials).toBe(5);   // 20 s / 4 s por material
  }, 20000);
  it('"reciclar 1 lote" acompanha a troca no servidor e paga 60 moedas uma vez', async () => {
    const c = await start(); await seed(c, { economy: eco({ materials: { plastico: 25, papel: 0, vidro: 0, metal: 0 } }) });
    expect((await post(c, '/api/economy/recycle', { material: 'plastico', batches: 1 })).status).toBe(200);
    expect((await get(c)).progression.daily.counts.recycles).toBe(1);
    const coins = (await get(c)).economy.coins; expect((await post(c, '/api/daily/claim', { taskId: 'recycle' })).status).toBe(200);
    expect((await get(c)).economy.coins).toBe(coins + 60); expect((await post(c, '/api/daily/claim', { taskId: 'recycle' })).status).toBe(400);
  });
  it('renovação diária: data antiga zera contagens e resgates; snapshot traz a data UTC e o horário da próxima renovação', async () => {
    const c = await start(); await seed(c, { economy: eco(), progression: { daily: { date: '2000-01-01', counts: { wins: 1, materials: 5, recycles: 1 }, claimed: ['win'] } } });
    const s = await get(c); const today = new Date().toISOString().slice(0, 10);
    expect(s.progression.daily.date).toBe(today); expect(s.progression.daily.counts).toEqual({ wins: 0, materials: 0, recycles: 0 }); expect(s.progression.daily.claimed).toEqual([]);
    expect(s.progression.daily.resetsAt).toBeGreaterThan(Date.now()); expect(s.progression.daily.resetsAt - Date.now()).toBeLessThanOrEqual(24 * 3600 * 1000);
    expect(new Date(s.progression.daily.resetsAt).toISOString().endsWith('T00:00:00.000Z')).toBe(true);
  });
});

describe('Persistência, contas e compatibilidade com dados antigos', () => {
  it('conta registrada, sessão, habilidades e missões sobrevivem à reinicialização do servidor', async () => {
    const c = await start(); await seed(c, { economy: eco({ coins: 500 }) });
    const reg = await post(c, '/api/auth/register', { username: 'jogador_x', password: 'Sup3rSenha!xyz' }); expect(reg.status).toBe(200); const session = reg.headers.get('set-cookie')!.split(';')[0]!;
    expect((await post(c, '/api/progression/upgrade', { skill: 'speed', expectedLevel: 0 }, session)).status).toBe(200);
    await stop(c.child); const again = await boot(c.dir, c.port);
    const me = await get(again, session); expect(me.account?.username).toBe('jogador_x'); expect(me.progression.skills.speed).toBe(1); expect(me.economy.coins).toBe(400);
    const login = await post(again, '/api/auth/login', { username: 'jogador_x', password: 'Sup3rSenha!xyz' }, `criso_sid=${'a'.repeat(64)}`); expect(login.status).toBe(200); expect((await json(login)).progression.skills.speed).toBe(1);
  }, 25000);
  it('abre um save antigo (sem progression/stats/achievements) e o completa com valores padrão sem perder moedas e itens', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'criso-')); dirs.push(dir); const sid = 'b'.repeat(64);
    const legacy = { players: { [sid]: { economy: { coins: 777, materials: { plastico: 3 }, owned: [...OWN, 'pet-turtix'], equippedPet: 'pet-turtix', character: 'crisogirl' }, progress: { unlocked: 4, stars: [3, 2, 1], best: [10, 20, 30] }, paidLevels: [0, 1] } } };
    const payload = JSON.stringify(legacy); await writeFile(join(dir, 'players.signed.json'), JSON.stringify({ payload, mac: createHmac('sha256', SECRET).update(payload).digest('hex') }));
    const port = await freePort(); const s = await boot(dir, port); const snap = await get(s, `criso_sid=${sid}`);
    expect(snap.economy.coins).toBe(777); expect(snap.economy.owned).toContain('pet-turtix'); expect(snap.economy.equippedPet).toBe('pet-turtix'); expect(snap.progress.unlocked).toBe(4);
    expect(snap.progression.skills).toEqual({ jump: 0, speed: 0, defense: 0, magnet: 0 }); expect(snap.progression.pets).toEqual({}); expect(snap.progression.daily.claimed).toEqual([]);
    expect(JSON.parse(await readFile(join(dir, 'players.signed.json'), 'utf8')).payload).toBeTruthy();
  }, 20000);
});

describe('Abuso por requisições sem sessão', () => {
  it('visitas sem cookie não gravam perfis em disco e a criação de perfis por POST é limitada por IP', async () => {
    const c = await start();
    for (let i = 0; i < 60; i++) expect((await fetch(`${c.base}/api/economy`)).status).toBe(200);
    const persisted = async () => Object.keys(JSON.parse(JSON.parse(await readFile(join(c.dir, 'players.signed.json'), 'utf8')).payload).players).length;
    expect(await persisted()).toBe(0);
    const codes: number[] = []; for (let i = 0; i < 40; i++) codes.push((await fetch(`${c.base}/api/economy/loadout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character: 'crisoman' }) })).status);
    expect(codes.filter((x) => x === 200).length).toBe(30); expect(codes.filter((x) => x === 429).length).toBe(10); expect(await persisted()).toBe(30);
  }, 30000);
  it('um visitante novo ainda recebe o perfil inicial completo (compatibilidade com o fluxo atual)', async () => {
    const c = await start(); const s = await (await fetch(`${c.base}/api/economy`)).json() as Snap;
    expect(s.economy.coins).toBe(0); expect(s.economy.owned).toEqual(OWN); expect(s.progress.unlocked).toBe(1); expect(s.progression.skills).toEqual({ jump: 0, speed: 0, defense: 0, magnet: 0 });
  });
});
