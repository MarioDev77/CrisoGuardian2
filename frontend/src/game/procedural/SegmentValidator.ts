import type { GeneratedLevel, LevelConfig, LevelSegment, Rect } from '../levels/levelTypes';
export function overlaps(a: Rect, b: Rect): boolean { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
export function validateSegment(segment: LevelSegment, config: LevelConfig): boolean {
  if (segment.x < 0 || segment.width <= 0 || segment.groundY > config.viewportHeight || segment.groundY < config.viewportHeight * .5) return false;
  if (segment.platforms.some(p => p.x < segment.x || p.x+p.w > segment.x+segment.width || p.y >= segment.groundY || segment.groundY-p.y > config.maxJumpHeight+20)) return false;
  if (segment.enemies.some(e => e.x < segment.x+35 || e.x+e.w > segment.x+segment.width-20 || e.y+e.h > segment.groundY)) return false;
  if (segment.collectibles.some(c => c.x < segment.x || c.x+c.w > segment.x+segment.width)) return false;
  return true;
}
export function validateLevel(level: GeneratedLevel, config: LevelConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (level.segments.length < 2 || level.finishX <= 0 || level.finishX > level.width) errors.push('Início/fim inválido');
  level.segments.forEach((s,i) => { if (!validateSegment(s,config)) errors.push(`Segmento inválido: ${i}`); if (i && s.x !== level.segments[i-1]!.x+level.segments[i-1]!.width) errors.push(`Conexão inválida: ${i}`); });
  if (level.enemies.some(e => e.x < 100 || e.x > level.finishX-100)) errors.push('Inimigo em zona insegura');
  if (level.collectibles.some(c => c.x < 0 || c.x > level.finishX)) errors.push('Coletável fora do percurso');
  return { valid: errors.length === 0, errors };
}
