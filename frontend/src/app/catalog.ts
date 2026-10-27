import catalog from './catalog-data.json';
export type CharacterId = 'crisoman' | 'crisogirl';
export type ItemRarity = 'comum' | 'raro' | 'épico' | 'lendário';
export interface Cosmetic { id: string; name: string; price: number; rarity: ItemRarity; character?: CharacterId; palette: string; }
export const SKINS = catalog.skins as Cosmetic[];
export const PETS = catalog.pets as Cosmetic[];
export const CATALOG = [...SKINS, ...PETS];
export const RECYCLING = catalog.recycling;
export const RUN_LIMITS = catalog.runLimits;
export const MATERIALS = catalog.materials as readonly string[];
