export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number { this.state = (1664525 * this.state + 1013904223) >>> 0; return this.state / 4294967296; }
  int(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.next() * items.length)]!; }
}
