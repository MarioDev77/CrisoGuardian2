import raw from './catalog-data.json';
export interface Achievement { id: string; name: string; desc: string; icon: string }
export const ACHIEVEMENTS = (raw as unknown as { achievements: Achievement[] }).achievements;
export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
