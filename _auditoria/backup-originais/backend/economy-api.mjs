import { createServer } from 'node:http';
import { createHmac, createHash, scrypt, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
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
const scryptAsync = promisify(scrypt);

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
let database = { players: {}, accounts: {}, sessions: {} };
let queue = Promise.resolve();
const skins = new Map(catalog.skins.map((item) => [item.id, item]));
const pets = new Map(catalog.pets.map((item) => [item.id, item]));
const allItems = new Map([...skins, ...pets]);
const LEVEL_COUNT = 8 + catalog.newIslands.length;
const materialSet = new Set(catalog.materials);

const ACHIEVEMENTS = catalog.achievements ?? [];
const starSum = (p) => p.progress.stars.reduce((a, b) => a + b, 0);
const cleared = (p, i) => p.progress.stars[i] > 0;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** Regras de conquista: avaliadas SEMPRE no servidor, a partir dos dados já validados (o cliente não consegue forjar). */
const RULES = {
  first_steps: (p) => p.progress.stars.some((x) => x > 0), five_levels: (p) => p.progress.stars.filter((x) => x > 0).length >= 5,
  map1_done: (p) => range(0, 7).every((i) => cleared(p, i)), boss_lixao: (p) => cleared(p, 7), volcano_boss: (p) => cleared(p, 10),
  map2_done: (p) => range(8, 15).every((i) => cleared(p, i)), planet_guardian: (p) => cleared(p, 15),
  three_stars: (p) => p.progress.stars.some((x) => x >= 3), stars_10: (p) => starSum(p) >= 10, stars_30: (p) => starSum(p) >= 30, all_stars: (p) => starSum(p) >= LEVEL_COUNT * 3,
  coins_500: (p) => p.stats.coinsEarned >= 500, coins_5000: (p) => p.stats.coinsEarned >= 5000, materials_100: (p) => p.stats.materialsCollected >= 100,
  recycler_5: (p) => p.stats.recycles >= 5, shopper: (p) => p.stats.purchases >= 1, collector: (p) => p.economy.owned.length >= 8, registered: (p) => p.registered === true,
};
function unlockAchievements(p) { const fresh = []; for (const a of ACHIEVEMENTS) { if (p.achievements[a.id]) continue; if (RULES[a.id]?.(p)) { p.achievements[a.id] = Date.now(); fresh.push(a.id); } } return fresh; }
function freshPlayer() {
  return { economy: { coins: 0, materials: Object.fromEntries(catalog.materials.map((m) => [m, 0])), owned: ['skin-crisoman-verde', 'skin-crisogirl-rosa'], equippedSkin: { crisoman: 'skin-crisoman-verde', crisogirl: 'skin-crisogirl-rosa' }, equippedPet: null, character: 'crisoman', claimedSpawns: [], transactions: [] }, progress: { unlocked: 1, stars: Array(LEVEL_COUNT).fill(0), best: Array(LEVEL_COUNT).fill(0) }, paidLevels: [], achievements: {}, stats: { coinsEarned: 0, materialsCollected: 0, recycles: 0, purchases: 0 }, progression: freshProgression(), registered: false };
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
  p.paidLevels = Array.isArray(value.paidLevels) ? [...new Set(value.paidLevels.filter((n) => Number.isInteger(n) && n >= 0 && n < LEVEL_COUNT))] : [];
  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  if (value.achievements && typeof value.achievements === 'object') for (const [id, at] of Object.entries(value.achievements)) if (known.has(id) && safeInteger(at)) p.achievements[id] = at;
  for (const k of Object.keys(p.stats)) p.stats[k] = safeInteger(value.stats?.[k]) ? value.stats[k] : 0;
  const prog = value.progression ?? {}; const defaults = freshProgression();
  for (const skill of Object.keys(defaults.skills)) { const n = prog.skills?.[skill]; p.progression.skills[skill] = Number.isInteger(n) ? Math.max(0, Math.min(3, n)) : 0; }
  if (prog.pets && typeof prog.pets === 'object') for (const [id, v] of Object.entries(prog.pets)) if (pets.has(id) && v && safeInteger(v.xp, 1000000) && Number.isInteger(v.level)) p.progression.pets[id] = { xp: v.xp, level: Math.max(1, Math.min(10, v.level)) };
  if (prog.daily && typeof prog.daily === 'object') { const d = prog.daily; if (typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) p.progression.daily = { date: d.date, counts: { wins: safeInteger(d.counts?.wins, 100000) ? d.counts.wins : 0, materials: safeInteger(d.counts?.materials, 100000) ? d.counts.materials : 0, recycles: safeInteger(d.counts?.recycles, 100000) ? d.counts.recycles : 0 }, claimed: Array.isArray(d.claimed) ? [...new Set(d.claimed.filter((x) => DAILY_TASKS.some((t) => t.id === x)))] : [] }; }
  p.registered = value.registered === true; refreshDaily(p); return p;
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
  database.accounts ??= {}; database.sessions ??= {};
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
function snapshot(player, acct = null) { refreshDaily(player); return { economy: player.economy, progress: player.progress, progression: player.progression, achievements: player.achievements, stats: player.stats, account: acct ? { username: acct.username } : null }; }
const DAILY_TASKS = [{ id: 'win', title: 'Vença 1 fase', target: 1, reward: 80, kind: 'wins' }, { id: 'materials', title: 'Colete 5 materiais', target: 5, reward: 100, kind: 'materials' }, { id: 'recycle', title: 'Recicle 1 lote', target: 1, reward: 60, kind: 'recycles' }];
const todayKey = () => new Date().toISOString().slice(0, 10);
function freshProgression() { return { skills: { jump: 0, speed: 0, defense: 0, magnet: 0 }, pets: {}, daily: { date: todayKey(), counts: { wins: 0, materials: 0, recycles: 0 }, claimed: [] } }; }
function refreshDaily(player) { const d = player.progression.daily; if (d.date !== todayKey()) player.progression.daily = { date: todayKey(), counts: { wins: 0, materials: 0, recycles: 0 }, claimed: [] }; }
function addPetXp(player, amount = 25) { const id = player.economy.equippedPet; if (!id || !player.economy.owned.includes(id)) return; const pet = player.progression.pets[id] ?? { xp: 0, level: 1 }; pet.xp += amount; while (pet.level < 10 && pet.xp >= pet.level * 100) { pet.xp -= pet.level * 100; pet.level++; } if (pet.level >= 10) pet.xp = 0; player.progression.pets[id] = pet; }
function transaction(e, type, detail, delta) { e.transactions = [...e.transactions, { id: randomUUID(), type, at: Date.now(), detail, coinsDelta: delta }].slice(-200); }
async function ensurePlayer(key) { if (database.players[key]) return database.players[key]; return await serialize(async () => { if (!database.players[key]) { const next = structuredClone(database); next.players[key] = freshPlayer(); await persist(next); database = next; } return database.players[key]; }); }
function error(message, status = 400) { return Object.assign(new Error(message), { status }); }


// ------------------------------------------------------------------ contas (cadastro básico e seguro)
const SESSION_MS = 30 * 24 * 3600 * 1000;
const sidHash = (sid) => createHash('sha256').update(sid).digest('hex');
function accountForSid(sid) { const s = database.sessions[sidHash(sid)]; if (!s || s.exp < Date.now()) return null; return database.accounts[s.account] ?? null; }
const WEAK = new Set(['12345678', '123456789', '1234567890', 'password', 'senha123', 'senha1234', 'qwertyui', '11111111', 'abcd1234', 'crisoguardian']);
const authHits = new Map(); const failures = new Map();
function clientIp(req) { const fwd = process.env.CRISO_TRUST_PROXY === '1' ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() : ''; return fwd || req.socket.remoteAddress || 'ip'; }
function authRate(ip) { const now = Date.now(), recent = (authHits.get(ip) ?? []).filter((at) => now - at < 60000); if (recent.length >= 10) return false; recent.push(now); authHits.set(ip, recent); return true; }
async function derive(password, salt) { return await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }); }
const DUMMY_SALT = randomBytes(16);
function setSessionCookie(req, res, sid) { const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''; res.setHeader('Set-Cookie', `criso_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${secure}`); }
function validateCredentials(username, password) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) throw error('Nome de usuário: 3 a 20 letras, números ou _.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw error('A senha precisa ter de 8 a 128 caracteres.');
  if (password.toLowerCase() === username.toLowerCase() || WEAK.has(password.toLowerCase())) throw error('Escolha uma senha mais difícil de adivinhar.');
}
async function verifyPassword(acct, password) {
  const key = await derive(password, acct ? Buffer.from(acct.salt, 'hex') : DUMMY_SALT);   // sempre calcula: não revela se o usuário existe
  return !!acct && timingSafeEqual(key, Buffer.from(acct.hash, 'hex'));
}
function newSession(next, req, res, accountKey, oldSid) {
  const now = Date.now(); for (const [h, v] of Object.entries(next.sessions)) if (v.exp < now) delete next.sessions[h];
  if (oldSid) delete next.sessions[sidHash(oldSid)];
  const sid = randomBytes(32).toString('hex'); if (accountKey) next.sessions[sidHash(sid)] = { account: accountKey, exp: now + SESSION_MS };
  setSessionCookie(req, res, sid); return sid;
}
async function handleAuth(req, res, url, sid, body) {
  if (req.method !== 'POST') throw error('Método não permitido.', 405);
  if (!authRate(clientIp(req))) throw error('Muitas tentativas. Aguarde um minuto.', 429);
  const action = url.pathname.slice('/api/auth/'.length);
  if (action === 'register') {
    const { username, password } = body; validateCredentials(username, password); const ukey = username.toLowerCase();
    if (database.accounts[ukey]) throw error('Esse nome já está em uso.', 409);
    const salt = randomBytes(16); const hash = (await derive(password, salt)).toString('hex');
    return await serialize(async () => {
      if (database.accounts[ukey]) throw error('Esse nome já está em uso.', 409);
      const next = structuredClone(database); const id = randomBytes(8).toString('hex');
      next.accounts[ukey] = { id, username, salt: salt.toString('hex'), hash, createdAt: Date.now() };
      const guest = next.players[sid]; const player = cleanPlayer(guest ?? freshPlayer()); player.registered = true;   // o progresso de convidado vai junto
      const fresh = unlockAchievements(player); next.players[`acc_${id}`] = player; delete next.players[sid];
      newSession(next, req, res, ukey, sid); await persist(next); database = next;
      return reply(res, 200, { ...snapshot(player, next.accounts[ukey]), newAchievements: fresh });
    });
  }
  if (action === 'login') {
    const { username, password } = body; const ukey = typeof username === 'string' ? username.toLowerCase() : ''; if (typeof password !== 'string' || password.length > 128) throw error('Usuário ou senha inválidos.', 401);
    const f = failures.get(ukey); if (f && f.until > Date.now()) throw error('Conta bloqueada por alguns minutos após várias tentativas erradas.', 429);
    const acct = database.accounts[ukey]; const ok = await verifyPassword(acct, password);
    if (!ok) { const n = (f?.n ?? 0) + 1; failures.set(ukey, n >= 5 ? { n: 0, until: Date.now() + 5 * 60000 } : { n, until: 0 }); throw error('Usuário ou senha inválidos.', 401); }
    failures.delete(ukey);
    return await serialize(async () => {
      const next = structuredClone(database); newSession(next, req, res, ukey, sid); await persist(next); database = next;
      const player = next.players[`acc_${acct.id}`] ?? freshPlayer(); return reply(res, 200, snapshot(player, acct));
    });
  }
  if (action === 'logout') return await serialize(async () => {
    const next = structuredClone(database); const nsid = newSession(next, req, res, null, sid); next.players[nsid] = freshPlayer(); await persist(next); database = next; return reply(res, 200, snapshot(next.players[nsid]));
  });
  if (action === 'delete') {
    const acct = accountForSid(sid); if (!acct) throw error('Você não está conectado.', 401);
    if (typeof body.password !== 'string' || !(await verifyPassword(acct, body.password))) throw error('Senha incorreta.', 401);
    return await serialize(async () => {
      const next = structuredClone(database); const ukey = acct.username.toLowerCase(); delete next.accounts[ukey]; delete next.players[`acc_${acct.id}`];
      for (const [h, v] of Object.entries(next.sessions)) if (v.account === ukey) delete next.sessions[h];
      const nsid = newSession(next, req, res, null, null); next.players[nsid] = freshPlayer(); await persist(next); database = next; return reply(res, 200, snapshot(next.players[nsid]));
    });
  }
  throw error('Rota não encontrada.', 404);
}

const server = createServer(async (req, res) => {
  const sid = sessionId(req, res); const acct = accountForSid(sid); const pk = acct ? `acc_${acct.id}` : sid; const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (!url.pathname.startsWith('/api/')) return reply(res, 404, { message: 'Rota não encontrada.' });
    if (!rateLimit(sid, url.pathname)) return reply(res, 429, { message: 'Muitas tentativas. Aguarde um minuto.' });
    if (req.method === 'GET' && url.pathname === '/api/economy') return reply(res, 200, snapshot(await ensurePlayer(pk), acct));
    const body = await readBody(req);
    if (url.pathname.startsWith('/api/auth/')) return await handleAuth(req, res, url, sid, body);
    if (process.env.CRISO_TEST_MODE === '1' && req.method === 'POST' && url.pathname === '/api/test/seed') {
      return await serialize(async () => { const next = structuredClone(database); const p = freshPlayer(); if (body.economy) p.economy = cleanPlayer({ economy: body.economy }).economy; if (body.progress) p.progress = cleanPlayer({ progress: body.progress }).progress; if (body.progression) p.progression = cleanPlayer({ progression: body.progression }).progression; next.players[pk] = p; await persist(next); database = next; return reply(res, 200, snapshot(p, acct)); });
    }
    const player = await ensurePlayer(pk); if (req.method !== 'POST') return reply(res, 405, { message: 'Método não permitido.' });
    if (url.pathname === '/api/economy/loadout') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[pk]; const e = p.economy;
      if (body.character !== undefined) { if (!['crisoman', 'crisogirl'].includes(body.character)) throw error('Personagem inválido.'); e.character = body.character; }
      else if (body.skinId !== undefined) { const item = skins.get(body.skinId); if (!item || !e.owned.includes(item.id)) throw error('Skin bloqueada ou incompatível.'); e.character = item.character; e.equippedSkin[item.character] = item.id; }
      else if (body.petId !== undefined) { if (body.petId !== null && (!pets.has(body.petId) || !e.owned.includes(body.petId))) throw error('Pet bloqueado.'); e.equippedPet = body.petId; }
      else throw error('Seleção inválida.'); await persist(next); database = next; return reply(res, 200, snapshot(p, acct));
    });
    if (url.pathname === '/api/progression/upgrade') return await serialize(async () => {
      const skill = body.skill; const costs = [100, 200, 350]; const valid = ['jump', 'speed', 'defense', 'magnet'];
      if (!valid.includes(skill)) throw error('Habilidade inválida.');
      const next = structuredClone(database); const p = next.players[pk]; const level = p.progression.skills[skill];
      if (level >= 3) throw error('Essa habilidade já está no nível máximo.');
      const cost = costs[level]; if (p.economy.coins < cost) throw error('Moedas insuficientes.');
      p.economy.coins -= cost; p.progression.skills[skill]++; transaction(p.economy, 'purchase', `habilidade:${skill}:${level + 1}`, -cost);
      await persist(next); database = next; return reply(res, 200, snapshot(p, acct));
    });
    if (url.pathname === '/api/daily/claim') return await serialize(async () => {
      const task = DAILY_TASKS.find((item) => item.id === body.taskId); if (!task) throw error('Missão inválida.');
      const next = structuredClone(database); const p = next.players[pk]; refreshDaily(p); const d = p.progression.daily;
      if (d.claimed.includes(task.id)) throw error('Essa recompensa já foi resgatada.');
      if (d.counts[task.kind] < task.target) throw error('Missão ainda não concluída.');
      if (p.economy.coins > Number.MAX_SAFE_INTEGER - task.reward) throw error('Saldo excederia o limite.');
      p.economy.coins += task.reward; d.claimed.push(task.id); transaction(p.economy, 'reward', `missão diária:${task.title}`, task.reward);
      await persist(next); database = next; return reply(res, 200, snapshot(p, acct));
    });
    if (url.pathname === '/api/economy/purchase') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[pk]; const e = p.economy; const item = allItems.get(body.itemId);
      if (!item) throw error('Item inválido.'); if (e.owned.includes(item.id)) throw error('Você já possui este item.'); if (!safeInteger(e.coins) || e.coins < item.price) throw error('Saldo insuficiente.');
      e.coins -= item.price; e.owned.push(item.id); p.stats.purchases += 1; transaction(e, 'purchase', item.id, -item.price); const newAchievements = unlockAchievements(p); await persist(next); database = next; return reply(res, 200, { ...snapshot(p, acct), message: `${item.name} comprado!`, newAchievements });
    });
    if (url.pathname === '/api/economy/recycle') return await serialize(async () => {
      const next = structuredClone(database); const p = next.players[pk]; const e = p.economy; const { material, batches } = body;
      if (typeof material !== 'string' || !materialSet.has(material) || !safeInteger(batches, 100000) || batches < 1) throw error('Troca inválida.');
      const amount = batches * catalog.recycling.materialsPerExchange, gain = batches * catalog.recycling.coinsPerExchange;
      if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(gain) || e.materials[material] < amount) throw error('Materiais insuficientes.'); if (!safeInteger(e.coins) || e.coins + gain > Number.MAX_SAFE_INTEGER) throw error('Saldo excederia o limite.');
      e.materials[material] -= amount; e.coins += gain; p.stats.recycles += batches; refreshDaily(p); p.progression.daily.counts.recycles += batches; transaction(e, 'recycle', `${amount} ${material}`, gain); const newAchievements = unlockAchievements(p); await persist(next); database = next; return reply(res, 200, { ...snapshot(p, acct), message: `Troca concluída: +${gain} moedas.`, newAchievements });
    });
    if (url.pathname === '/api/run/start') {
      const level = body.level; if (!Number.isInteger(level) || level < 0 || level >= LEVEL_COUNT) throw error('Fase inválida.'); if (level + 1 > player.progress.unlocked) throw error('Essa fase ainda está bloqueada.', 403);
      const runId = randomBytes(24).toString('hex'); activeRuns.set(sid, { id: runId, level, started: performance.now() }); return reply(res, 200, { runId });
    }
    if (url.pathname === '/api/run/settle') return await serialize(async () => {
      const run = activeRuns.get(sid); if (!run || body.runId !== run.id || body.level !== run.level) throw error('Partida inválida, expirada ou já finalizada.', 409); if (body.won !== true) throw error('Somente uma vitória pode entregar recompensas.');
      const elapsed = (performance.now() - run.started) / 1000; 
      const next = structuredClone(database); const p = next.players[pk]; const e = p.economy; const seen = new Set(), fresh = []; let coins = 0; const mats = new Map();
      const list = Array.isArray(body.collectibles) ? body.collectibles.slice(0, 500) : [];
      for (const item of list) {
        if (!item || typeof item.id !== 'string' || item.id.trim().length === 0 || item.id.length > 120 || seen.has(item.id) || !/^(coin|material|enemy-coin):[A-Za-z0-9:._-]+$/.test(item.id)) continue;
        seen.add(item.id); if (e.claimedSpawns.includes(`${run.level}:${item.id}`)) continue;
        if (item.type === 'coin') coins++; else if (item.type === 'material' && typeof item.material === 'string' && materialSet.has(item.material)) mats.set(item.material, (mats.get(item.material) ?? 0) + 1); fresh.push(item);
      }
      const materialTotal = [...mats.values()].reduce((sum, n) => sum + n, 0), paidBefore = p.paidLevels.includes(run.level), timeAllowed = elapsed <= catalog.runLimits.maxSeconds;
      const paidCoins = paidBefore || !timeAllowed || elapsed < 15 ? 0 : Math.min(coins, catalog.runLimits.maxCoins, Math.floor(elapsed / catalog.runLimits.secondsPerCoin));
      const paidMaterials = paidBefore || !timeAllowed || elapsed < 15 ? 0 : Math.min(materialTotal, catalog.runLimits.maxMaterials, Math.floor(elapsed / catalog.runLimits.secondsPerMaterial));
      if (paidCoins || paidMaterials) {
        e.coins = Math.min(Number.MAX_SAFE_INTEGER, e.coins + paidCoins); let remaining = paidMaterials;
        for (const [type, count] of mats) { const paid = Math.min(count, remaining); e.materials[type] = Math.min(Number.MAX_SAFE_INTEGER, e.materials[type] + paid); remaining -= paid; if (!remaining) break; }
        p.paidLevels.push(run.level); transaction(e, 'reward', `fase ${run.level + 1}: ${paidCoins} moedas e ${paidMaterials} materiais`, paidCoins);
      }
      e.claimedSpawns = [...new Set([...e.claimedSpawns, ...[...seen].map((id) => `${run.level}:${id}`)])].slice(-10000);
      const stars = Number.isInteger(body.stars) ? Math.max(0, Math.min(3, body.stars)) : 1; const score = safeInteger(body.score, 10000000) ? body.score : 0;
      p.progress.unlocked = Math.min(LEVEL_COUNT, Math.max(p.progress.unlocked, run.level + 2)); p.progress.stars[run.level] = Math.max(p.progress.stars[run.level], stars); p.progress.best[run.level] = Math.max(p.progress.best[run.level], score);
      p.stats.coinsEarned += paidCoins; p.stats.materialsCollected += paidMaterials; refreshDaily(p); p.progression.daily.counts.wins += 1; p.progression.daily.counts.materials += paidMaterials; addPetXp(p, 25); const newAchievements = unlockAchievements(p);
      await persist(next); database = next; activeRuns.delete(sid); return reply(res, 200, { ...snapshot(p, acct), newAchievements, payout: { coins: paidCoins, materials: paidMaterials, discarded: Math.max(0, coins - paidCoins) + Math.max(0, materialTotal - paidMaterials) } });
    });
    return reply(res, 404, { message: 'Rota não encontrada.' });
  } catch (err) { const status = Number.isInteger(err?.status) ? err.status : 500; if (status === 500) console.error('API CrisoGuardian:', err); return reply(res, status, { message: status === 500 ? 'Falha interna ao salvar a operação.' : err.message }); }
});
await initialize();
server.listen(port, host, () => console.log(`Economia CrisoGuardian API ouvindo em http://${host}:${port}`));
server.on('error', (err) => { console.error(err); process.exitCode = 1; });



