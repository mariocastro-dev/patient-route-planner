import { haversineKm } from './geo.js';
import { createRng } from './rng.js';

/**
 * k-means++ initialization: the first centroid is random, each next one is
 * chosen with probability proportional to its squared distance to the
 * closest centroid already picked. Gives much better starts than pure random.
 */
function initCentroids(points, k, rng) {
  const centroids = [points[Math.floor(rng() * points.length)]];
  while (centroids.length < k) {
    const weights = points.map((p) => Math.min(...centroids.map((c) => haversineKm(p, c))) ** 2);
    const total = weights.reduce((s, w) => s + w, 0);
    let target = rng() * total;
    let idx = 0;
    while (idx < points.length - 1 && target > weights[idx]) target -= weights[idx++];
    centroids.push(points[idx]);
  }
  return centroids.map(({ lat, lng }) => ({ lat, lng }));
}

function mean(points) {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

/**
 * Assigns every point to a centroid while keeping groups balanced:
 * no group gets more than ceil(n / k) points. Candidate (point, centroid)
 * pairs are processed from shortest to longest distance — O(n·k·log(n·k)).
 * Balanced workloads matter more to field staff than perfectly tight clusters.
 */
export function balancedAssign(points, centroids) {
  const k = centroids.length;
  const capacity = Math.ceil(points.length / k);
  const pairs = [];
  points.forEach((p, i) => centroids.forEach((c, j) => pairs.push([haversineKm(p, c), i, j])));
  pairs.sort((a, b) => a[0] - b[0]);

  const labels = new Array(points.length).fill(-1);
  const sizes = new Array(k).fill(0);
  for (const [, i, j] of pairs) {
    if (labels[i] === -1 && sizes[j] < capacity) {
      labels[i] = j;
      sizes[j]++;
    }
  }
  return labels;
}

/**
 * Balanced k-means. Returns one label (0..k-1) per input point plus centroids.
 */
export function kMeans(points, k, { seed = 42, maxIterations = 50 } = {}) {
  if (k < 1) throw new Error('k must be >= 1');
  if (points.length === 0) return { labels: [], centroids: [] };
  k = Math.min(k, points.length);

  const rng = createRng(seed);
  let centroids = initCentroids(points, k, rng);
  let labels = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const next = balancedAssign(points, centroids);
    const converged = next.every((l, i) => l === labels[i]);
    labels = next;
    centroids = centroids.map((c, j) => {
      const members = points.filter((_, i) => labels[i] === j);
      return members.length ? mean(members) : c;
    });
    if (converged) break;
  }
  return { labels, centroids };
}
