// Small seeded PRNG (mulberry32) so clustering and data generation are reproducible.
export function createRng(seed = 42) {
  let t = seed >>> 0;
  return function rng() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
