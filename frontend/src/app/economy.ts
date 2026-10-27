import { CATALOG, MATERIALS, RECYCLING, RUN_LIMITS, type CharacterId } from './catalog';
import { LEVEL_COUNT } from './progress';

export interface EconomyState {
  coins: number;
  materials: Record<string, number>;
  owned: string[];
  equippedSkin: Record<CharacterId, string>;
  equippedPet: string | null;
  character: CharacterId;
  claimedSpawns: string[];
  transactions: Transaction[];
}
export interface Transaction {
  id: string;
  type: 'purchase' | 'recycle' | 'reward';
  at: number;
  detail: string;
  coinsDelta: number;
}

export const freshEconomy = (): EconomyState => ({
  coins: 0,
  materials: Object.fromEntries(MATERIALS.map((m) => [m, 0])),
  owned: ['skin-crisoman-verde', 'skin-crisogirl-rosa'],
  equippedSkin: { crisoman: 'skin-crisoman-verde', crisogirl: 'skin-crisogirl-rosa' },
  equippedPet: null,
  character: 'crisoman',
  claimedSpawns: [],
  transactions: [],
});

const validInt = (n: unknown, max = Number.MAX_SAFE_INTEGER): n is number =>
  Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= max;

export function sanitizeEconomy(input: unknown): EconomyState {
  const base = freshEconomy();
  if (!input || typeof input !== 'object') return base;
  const p = input as Partial<EconomyState>;
  base.coins = validInt(p.coins) ? p.coins : 0;
  for (const material of MATERIALS) {
    const amount = p.materials?.[material];
    base.materials[material] = validInt(amount) ? amount : 0;
  }
  base.owned = Array.isArray(p.owned)
    ? [...new Set(p.owned.filter((id): id is string => typeof id === 'string' && CATALOG.some((item) => item.id === id)))]
    : base.owned;
  for (const id of ['skin-crisoman-verde', 'skin-crisogirl-rosa']) {
    if (!base.owned.includes(id)) base.owned.push(id);
  }
  if (p.character === 'crisoman' || p.character === 'crisogirl') base.character = p.character;
  for (const character of ['crisoman', 'crisogirl'] as const) {
    const id = p.equippedSkin?.[character];
    if (typeof id === 'string' && base.owned.includes(id) && CATALOG.find((item) => item.id === id)?.character === character) {
      base.equippedSkin[character] = id;
    }
  }
  if (typeof p.equippedPet === 'string' && base.owned.includes(p.equippedPet) && p.equippedPet.startsWith('pet-')) {
    base.equippedPet = p.equippedPet;
  }
  base.claimedSpawns = Array.isArray(p.claimedSpawns)
    ? [...new Set(p.claimedSpawns.filter((id): id is string => typeof id === 'string' && id.length <= 120))].slice(-5000)
    : [];
  base.transactions = Array.isArray(p.transactions)
    ? p.transactions.filter((entry): entry is Transaction => !!entry && typeof entry.id === 'string'
      && ['purchase', 'recycle', 'reward'].includes(entry.type)
      && validInt(Math.abs(entry.coinsDelta)) && typeof entry.detail === 'string' && validInt(entry.at)).slice(-100)
    : [];
  return base;
}

function log(state: EconomyState, type: Transaction['type'], detail: string, coinsDelta: number, at = Date.now()): void {
  state.transactions = [...state.transactions, { id: `${at}-${state.transactions.length}`, type, at, detail, coinsDelta }].slice(-100);
}

/** Every operation validates completely, then returns one committed snapshot. */
export function purchase(state: EconomyState, id: unknown) {
  const item = typeof id === 'string' ? CATALOG.find((entry) => entry.id === id) : undefined;
  if (!item || !validInt(item.price)) return { state, ok: false, message: 'Item inválido.' };
  if (state.owned.includes(item.id)) return { state, ok: false, message: 'Você já possui este item.' };
  if (!validInt(state.coins) || state.coins < item.price) return { state, ok: false, message: 'Saldo insuficiente.' };
  const next = { ...state, coins: state.coins - item.price, owned: [...state.owned, item.id], transactions: [...state.transactions] };
  log(next, 'purchase', item.id, -item.price);
  return { state: next, ok: true, message: `${item.name} comprado!` };
}

export function recycle(state: EconomyState, material: unknown, batches: unknown) {
  if (typeof material !== 'string' || !(MATERIALS as readonly string[]).includes(material)
    || !validInt(batches, 100_000) || batches < 1 || !validInt(state.materials?.[material]) || !validInt(state.coins)) {
    return { state, ok: false, message: 'Troca inválida.' };
  }
  const amount = batches * RECYCLING.materialsPerExchange;
  const gain = batches * RECYCLING.coinsPerExchange;
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(gain) || state.materials[material]! < amount) {
    return { state, ok: false, message: 'Materiais insuficientes.' };
  }
  if (state.coins + gain > Number.MAX_SAFE_INTEGER) return { state, ok: false, message: 'Saldo excederia o limite.' };
  const next = { ...state, coins: state.coins + gain, materials: { ...state.materials, [material]: state.materials[material]! - amount }, transactions: [...state.transactions] };
  log(next, 'recycle', `${amount} ${material}`, gain);
  return { state: next, ok: true, message: `Troca concluída: +${gain} moedas.` };
}

export interface RunSettlement {
  level: number;
  time: number;
  won: boolean;
  collectibles: { id: string; type: 'coin' | 'material'; material?: string }[];
}
export function settleRun(state: EconomyState, run: RunSettlement) {
  if (!run.won || !Number.isInteger(run.level) || run.level < 0 || run.level >= LEVEL_COUNT || !validInt(state.coins)
    || !Number.isFinite(run.time) || run.time < 15 || run.time > RUN_LIMITS.maxSeconds || !Array.isArray(run.collectibles)) {
    return { state, rewardCoins: 0, rewardMaterials: 0, discarded: 0 };
  }

  const seen = new Set<string>();
  const fresh: RunSettlement['collectibles'] = [];
  let coinCount = 0;
  let materialCount = 0;
  for (const item of run.collectibles.slice(0, 500)) {
    if (!item || typeof item.id !== 'string' || item.id.trim().length === 0 || item.id.length > 120
      || seen.has(item.id) || state.claimedSpawns.includes(`${run.level}:${item.id}`)) continue;
    seen.add(item.id);
    fresh.push(item);
    if (item.type === 'coin') coinCount++;
    else if (item.type === 'material' && MATERIALS.includes(item.material as typeof MATERIALS[number])) materialCount++;
  }
  const paidCoins = Math.min(coinCount, RUN_LIMITS.maxCoins, Math.floor(run.time / RUN_LIMITS.secondsPerCoin));
  const paidMaterials = Math.min(materialCount, RUN_LIMITS.maxMaterials, Math.floor(run.time / RUN_LIMITS.secondsPerMaterial));
  const next: EconomyState = {
    ...state,
    coins: Math.min(Number.MAX_SAFE_INTEGER, state.coins + paidCoins),
    materials: { ...state.materials },
    claimedSpawns: [...state.claimedSpawns, ...[...seen].map((id) => `${run.level}:${id}`)].slice(-5000),
    transactions: [...state.transactions],
  };
  // Allocate the material cap only to unique, newly claimed recognized pickups.
  const byMaterial = new Map<string, number>();
  for (const item of fresh) {
    if (item.type === 'material' && item.material && MATERIALS.includes(item.material as typeof MATERIALS[number])) {
      byMaterial.set(item.material, (byMaterial.get(item.material) ?? 0) + 1);
    }
  }
  let remaining = paidMaterials;
  for (const [type, count] of byMaterial) {
    const paid = Math.min(count, remaining);
    next.materials[type] = Math.min(Number.MAX_SAFE_INTEGER, (next.materials[type] ?? 0) + paid);
    remaining -= paid;
    if (remaining === 0) break;
  }
  if (paidCoins || paidMaterials) log(next, 'reward', `fase ${run.level + 1}: ${paidCoins} moedas, ${paidMaterials} materiais`, paidCoins);
  return { state: next, rewardCoins: paidCoins, rewardMaterials: paidMaterials, discarded: coinCount - paidCoins + materialCount - paidMaterials };
}

export function equip(state: EconomyState, id: string): EconomyState {
  if (!state.owned.includes(id)) return state;
  const item = CATALOG.find((entry) => entry.id === id);
  if (!item) return state;
  if (item.character) return { ...state, equippedSkin: { ...state.equippedSkin, [item.character]: id } };
  if (id.startsWith('pet-')) return { ...state, equippedPet: id };
  return state;
}
