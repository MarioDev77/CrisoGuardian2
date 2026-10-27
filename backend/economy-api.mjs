import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
async function loadCatalog() {
  // Monorepo/dev: fonte única no frontend. Deploy só da pasta backend/: usa a cópia local.
  for (const rel of ['../frontend/src/app/catalog-data.json', './catalog-data.json']) {
    try { return JSON.parse((await readFile(new URL(rel, import.meta.url), 'utf8')).replace(/^\uFEFF/, '')); } catch { /* tenta o próximo */ }
  }
  throw new Error('catalog-data.json não encontrado (esperado em ../frontend/src/app/ ou em backend/).');
}
const catalog = await loadCatalog();

const port = Number(process.env.CRISO_API_PORT ?? process.env.PORT ?? 4174);
const host = process.env.CRISO_API_HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const backendDir = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.CRISO_DATA_DIR ? resolve(process.env.CRISO_DATA_DIR) : join(backendDir, 'data');
const legacyDataDir = resolve(backendDir, '../frontend/server/data');
const dataFile = join(dataDir, 'players.signed.json');
const backupFile = join(dataDir, 'players.backup.signed.json');
const secretFile = join(dataDir, 'server.key');
const maxBody = 64 * 1024;
const activeRuns = new Map();
const requestWindow = new Map();
let key;
let database = { players: {} };
let queue = Promise.resolve();
const skins = new Map(catalog.skins.map((item) => [item.id, item]));
const pets = new Map(catalog.pets.map((item) => [item.id, item]));
const allItems = new Map([...skins, ...pets]);
const LEVEL_COUNT = 8 + catalog.newIslands.length;
const materialSet = new Set(catalog.materials);

function freshPlayer() {
  return { economy: { coins: 0, materials: Object.fromEntries(catalog.materials.map((m) => [m, 0])), owned: ['skin-crisoman-verde', 'skin-crisogirl-rosa'], equippedSkin: { crisoman: 'skin-crisoman-verde', crisogirl: 'skin-crisogirl-rosa' }, equippedPet: null, character: 'crisoman', claimedSpawns: [], transactions: [] }, progress: { unlocked: 1, stars: Array(LEVEL_COUNT).fill(0), best: Array(LEVEL_COUNT).fill(0) }, paidLevels: [] };
}
function safeInteger(value, max = Number.MAX_SAFE_INTEGER) { return Number.isSafeInteger(value) && value >= 0 && value <= max; }
function cleanPlayer(value) {
  const p = freshPlayer(); if (!value || typeof value !== 'object') return p; const e = value.economy ?? {};
  p.economy.coins = safeInteger(e.coins) ? e.coins : 0;
  for (const material of catalog.materials) p.economy.materials[material] = safeInteger(e.materials?.[material]) ? e.materials[material] : 0;
  if (Array.isArray(e.owned)) p.economy.owned = [...new Set(e.owned.filter((id) => allItems.has(id)))];
  for (const id of ['skin-crisoman-verde', 'skin-crisogirl-rosa']) if (!p.economy.owned.includes(id)) p.economy.owned.push(id);
  if (e.character === 'crisoman' || e.character === 'crisogirl') p.economy.character = e.character;
  for (const character of ['crisoman', 'crisogirl']) { const id = e.equippedSkin?.[character]; if (p.economy.owned.includes(id) && skins.get(id)?.character === character) p.economy.equippedSkin[character] = id; }
  if (p.economy.owned.includes(e.equippedPet) && pets.has(e.equippedPet)) p.economy.equippedPet = e.equippedPet;
  p.economy.claimedSpawns = Array.isArray(e.claimedSpawns) ? [...new Set(e.claimedSpawns.filter((id) => typeof id === 'string' && id.length <= 140))].slice(-10000) : [];
  p.economy.transactions = Array.isArray(e.transactions) ? e.transactions.filter((t) => t && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.detail === 'string' && safeInteger(t.at) && Number.isSafeInteger(t.coinsDelta)).slice(-200) : [];
  const pr = value.progress ?? {}; p.progress.unlocked = Number.isInteger(pr.unlocked) ? Math.max(1, Math.min(LEVEL_COUNT, pr.unlocked)) : 1;
  p.progress.stars = Array.isArray(pr.stars) ? Array.from({ length: LEVEL_COUNT }, (_, i) => Number.isInteger(pr.stars[i]) ? Math.max(0, Math.min(3, pr.stars[i])) : 0) : p.progress.stars;
  p.progress.best = Array.isArray(pr.best) ? Array.from({ length: LEVEL_COUNT }, (_, i) => safeInteger(pr.best[i]) ? pr.best[i] : 0) : p.progress.best;
  p.paidLevels = Array.isArray(value.paidLevels) ? [...new Set(value.paidLevels.filter((n) => Number.isInteger(n) && n >= 0 && n < LEVEL_COUNT))] : []; return p;
}
function mac(payload) { return createHmac('sha256', key).update(payload).digest('hex'); }
function envelope(payload) { return JSON.stringify({ payload, mac: mac(payload) }); }
function verifyEnvelope(raw) {
  try { const parsed = JSON.parse(raw); if (typeof parsed.payload !== 'string' || typeof parsed.mac !== 'string' || !/^[a-f0-9]{64}$/i.test(parsed.mac)) return null; const a = Buffer.from(mac(parsed.payload), 'hex'), b = Buffer.from(parsed.mac, 'hex'); if (a.length !== b.length || !timingSafeEqual(a, b)) return null; const data = JSON.parse(parsed.payload); if (!data || typeof data.players !== 'object') return null; return { players: Object.fromEntries(Object.entries(data.players).map(([id, player]) => [id, cleanPlayer(player)])) }; } catch { return null; }
}
async function atomicWrite(path, content) { await mkdir(dirname(path), { recursive: true }); const temp = `${path}.${randomUUID()}.tmp`; await writeFile(temp, content, { mode: 0o600 }); await rename(temp, path); }
async function readSigned(path) { try { return verifyEnvelope(await readFile(path, 'utf8')); } catch { return null; } }
async function persist(next) { const previous = await readSigned(dataFile); if (previous) await atomicWrite(backupFile, envelope(JSON.stringify(previous))); await atomicWrite(dataFile, envelope(JSON.stringify(next))); }
async function initialize() {
  await mkdir(dataDir, { recursive: true });
  if (process.env.CRISO_SERVER_SECRET) { if (process.env.CRISO_SERVER_SECRET.length < 32) throw new Error('CRISO_SERVER_SECRET precisa ter pelo menos 32 caracteres.'); key = process.env.CRISO_SERVER_SECRET; }
  else {
    try { key = await readFile(secretFile); }
    catch {
      try { key = await readFile(join(legacyDataDir, 'server.key')); await writeFile(secretFile, key, { mode: 0o600, flag: 'wx' }); }
      catch { key = randomBytes(32); await writeFile(secretFile, key, { mode: 0o600, flag: 'wx' }).catch(async () => { key = await readFile(secretFile); }); }
    }
  }
  const current = await readSigned(dataFile); const backup = await readSigned(backupFile);
  const legacy = current || backup ? null : await readSigned(join(legacyDataDir, 'players.signed.json')) ?? await readSigned(join(legacyDataDir, 'players.backup.signed.json'));
  database = current ?? backup ?? legacy ?? { players: {} };
  if (!current) await atomicWrite(dataFile, envelope(JSON.stringify(database)));
}
function serialize(fn) { const result = queue.then(fn); queue = result.catch(() => {}); return result; }
function sessionId(req, res) {
  const cookie = String(req.headers.cookie ?? '').split(';').map((x) => x.trim()).find((x) => x.startsWith('criso_sid=')); const candidate = cookie?.slice('criso_sid='.length) ?? '';
  if (/^[a-f0-9]{64}$/i.test(candidate)) return candidate; const sid = randomBytes(32).toString('hex'); const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `criso_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`); return sid;
}
function reply(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); }
async function readBody(req) { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > maxBody) throw Object.assign(new Error('Requisição grande demais.'), { status: 413 }); } try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); } }
function rateLimit(sid, path) { const now = Date.now(), k = `${sid}:${path}`, old = requestWindow.get(k) ?? [], recent = old.filter((at) => now - at < 60000); const limit = path.endsWith('/loadout') || path === '/api/run/start' ? 300 : path === '/api/economy' ? 600 : 60; if (recent.length >= limit) return false; recent.push(now); requestWindow.set(k, recent); return true; }
function snapshot(player) { return { economy: player.economy, progress: player.progress }; }
function transaction(e, type, detail, delta) { e.transactions = [...e.transactions, { id: randomUUID(), type, at: Date.now(), detail, coinsDelta: delta }].slice(-200); }
async function ensurePlayer(sid) { if (database.players[sid]) return database.players[sid]; return await serialize(async () => { if (!database.players[sid]) { const next = structuredClone(database); next.players[sid] = freshPlayer(); await persist(next); database = next; } return database.players[sid]; }); }
function error(message, status = 400) { return Object.assign(new Error(message), { status }); }

const server = createServer(async (req, res) => {
  const sid = sessionId(req, res); const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (!url.pathname.startsWith('/api/')) return reply(res, 404, { message: 'Rota não encontrada.' });
    if (!rateLimit(sid, url.pathname)) return reply(res, 429, { message: 'Muitas tentativas. Aguarde um minuto.' });
    if (req.method === 'GET' && url.pathname === '/api/economy') return reply(res, 200, snapshot(await ensurePlayer(sid)));
    const body = await readBody(req);
    if (process.env.CRISO_TEST_MODE === '1' && req.method === 'POST' && url.pathname === '/api/test/seed') {
      return await serialize(async () => { const next = structuredClone(database); const p = freshPlayer(); if (body.economy) p.economy = cleanPlayer({ economy: body.economy }).economy; if (body.progress) p.progress = cleanPlayer({ progress: body.progress }).progress; next.players[sid] = p; await persist(next); database = next; return reply(res, 200, snapshot(p)); });
    }
    const player = await ensurePlayer(sid); if (req.method !== 'POST') return reply(res, 405, { message: 'Método não permitido.' });
    if (url.pathname === '/api/economy/loadout') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[sid]; const e = p.economy;
      if (body.character !== undefined) { if (!['crisoman', 'crisogirl'].includes(body.character)) throw error('Personagem inválido.'); e.character = body.character; }
      else if (body.skinId !== undefined) { const item = skins.get(body.skinId); if (!item || !e.owned.includes(item.id) || item.character !== e.character) throw error('Skin bloqueada ou incompatível.'); e.equippedSkin[e.character] = item.id; }
      else if (body.petId !== undefined) { if (body.petId !== null && (!pets.has(body.petId) || !e.owned.includes(body.petId))) throw error('Pet bloqueado.'); e.equippedPet = body.petId; }
      else throw error('Seleção inválida.'); await persist(next); database = next; return reply(res, 200, snapshot(p));
    });
    if (url.pathname === '/api/economy/purchase') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[sid]; const e = p.economy; const item = allItems.get(body.itemId);
      if (!item) throw error('Item inválido.'); if (e.owned.includes(item.id)) throw error('Você já possui este item.'); if (!safeInteger(e.coins) || e.coins < item.price) throw error('Saldo insuficiente.');
      e.coins -= item.price; e.owned.push(item.id); transaction(e, 'purchase', item.id, -item.price); await persist(next); database = next; return reply(res, 200, { ...snapshot(p), message: `${item.name} comprado!` });
    });
    if (url.pathname === '/api/economy/recycle') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[sid]; const e = p.economy; const { material, batches } = body;
      if (typeof material !== 'string' || !materialSet.has(material) || !safeInteger(batches, 100000) || batches < 1) throw error('Troca inválida.');
      const amount = batches * catalog.recycling.materialsPerExchange, gain = batches * catalog.recycling.coinsPerExchange;
      if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(gain) || e.materials[material] < amount) throw error('Materiais insuficientes.'); if (!safeInteger(e.coins) || e.coins + gain > Number.MAX_SAFE_INTEGER) throw error('Saldo excederia o limite.');
      e.materials[material] -= amount; e.coins += gain; transaction(e, 'recycle', `${amount} ${material}`, gain); await persist(next); database = next; return reply(res, 200, { ...snapshot(p), message: `Troca concluída: +${gain} moedas.` });
    });
    if (url.pathname === '/api/run/start') {
      const level = body.level; if (!Number.isInteger(level) || level < 0 || level >= LEVEL_COUNT) throw error('Fase inválida.'); if (level + 1 > player.progress.unlocked) throw error('Essa fase ainda está bloqueada.', 403);
      const runId = randomBytes(24).toString('hex'); activeRuns.set(sid, { id: runId, level, started: performance.now() }); return reply(res, 200, { runId });
    }
    if (url.pathname === '/api/run/settle') return await serialize(async () => {
      const run = activeRuns.get(sid); if (!run || body.runId !== run.id || body.level !== run.level) throw error('Partida inválida, expirada ou já finalizada.', 409); if (body.won !== true) throw error('Somente uma vitória pode entregar recompensas.');
      const elapsed = (performance.now() - run.started) / 1000; if (elapsed < 15) throw error('A partida ainda não atingiu o tempo mínimo.');
      const next = structuredClone(database); const p = next.players[sid]; const e = p.economy; const seen = new Set(), fresh = []; let coins = 0; const mats = new Map();
      const list = Array.isArray(body.collectibles) ? body.collectibles.slice(0, 500) : [];
      for (const item of list) {
        if (!item || typeof item.id !== 'string' || item.id.trim().length === 0 || item.id.length > 120 || seen.has(item.id) || !/^(coin|material|enemy-coin):[A-Za-z0-9:._-]+$/.test(item.id)) continue;
        seen.add(item.id); if (e.claimedSpawns.includes(`${run.level}:${item.id}`)) continue;
        if (item.type === 'coin') coins++; else if (item.type === 'material' && typeof item.material === 'string' && materialSet.has(item.material)) mats.set(item.material, (mats.get(item.material) ?? 0) + 1); fresh.push(item);
      }
      const materialTotal = [...mats.values()].reduce((sum, n) => sum + n, 0), paidBefore = p.paidLevels.includes(run.level), timeAllowed = elapsed <= catalog.runLimits.maxSeconds;
      const paidCoins = paidBefore || !timeAllowed ? 0 : Math.min(coins, catalog.runLimits.maxCoins, Math.floor(elapsed / catalog.runLimits.secondsPerCoin));
      const paidMaterials = paidBefore || !timeAllowed ? 0 : Math.min(materialTotal, catalog.runLimits.maxMaterials, Math.floor(elapsed / catalog.runLimits.secondsPerMaterial));
      if (paidCoins || paidMaterials) {
        e.coins = Math.min(Number.MAX_SAFE_INTEGER, e.coins + paidCoins); let remaining = paidMaterials;
        for (const [type, count] of mats) { const paid = Math.min(count, remaining); e.materials[type] = Math.min(Number.MAX_SAFE_INTEGER, e.materials[type] + paid); remaining -= paid; if (!remaining) break; }
        p.paidLevels.push(run.level); transaction(e, 'reward', `fase ${run.level + 1}: ${paidCoins} moedas e ${paidMaterials} materiais`, paidCoins);
      }
      e.claimedSpawns = [...new Set([...e.claimedSpawns, ...[...seen].map((id) => `${run.level}:${id}`)])].slice(-10000);
      const stars = Number.isInteger(body.stars) ? Math.max(0, Math.min(3, body.stars)) : 1; const score = safeInteger(body.score, 10000000) ? body.score : 0;
      p.progress.unlocked = Math.min(LEVEL_COUNT, Math.max(p.progress.unlocked, run.level + 2)); p.progress.stars[run.level] = Math.max(p.progress.stars[run.level], stars); p.progress.best[run.level] = Math.max(p.progress.best[run.level], score);
      await persist(next); database = next; activeRuns.delete(sid); return reply(res, 200, { ...snapshot(p), payout: { coins: paidCoins, materials: paidMaterials, discarded: Math.max(0, coins - paidCoins) + Math.max(0, materialTotal - paidMaterials) } });
    });
    return reply(res, 404, { message: 'Rota não encontrada.' });
  } catch (err) { const status = Number.isInteger(err?.status) ? err.status : 500; if (status === 500) console.error('API CrisoGuardian:', err); return reply(res, status, { message: status === 500 ? 'Falha interna ao salvar a operação.' : err.message }); }
});
await initialize();
server.listen(port, host, () => console.log(`Economia CrisoGuardian API ouvindo em http://${host}:${port}`));
server.on('error', (err) => { console.error(err); process.exitCode = 1; });



