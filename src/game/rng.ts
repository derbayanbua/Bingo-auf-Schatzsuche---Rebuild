// Small deterministic PRNG (mulberry32). Its 32-bit state lives in GameState.rng so that
// a restored save continues with exactly the same dice sequence.

export interface Rng {
  /** Lingo random(n): 1..n */
  int(n: number): number;
  /** Lingo random(a, b): a..b */
  range(a: number, b: number): number;
}

export function makeRng(holder: { rng: number }): Rng {
  const next = (): number => {
    holder.rng = (holder.rng + 0x6d2b79f5) | 0;
    let t = holder.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (n) => 1 + Math.floor(next() * n),
    range: (a, b) => a + Math.floor(next() * (b - a + 1)),
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) | 0;
}
