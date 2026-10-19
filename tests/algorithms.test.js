import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, routeDistanceKm } from '../src/geo.js';
import { kMeans } from '../src/clustering.js';
import { nearestNeighbor, twoOpt, optimizeRoute } from '../src/routing.js';
import { planRoutes } from '../src/planner.js';
import { createRng } from '../src/rng.js';

const BASE = { lat: 4.4389, lng: -75.2322 };

function randomPoints(n, seed = 1) {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    lat: 4.41 + rng() * 0.05,
    lng: -75.24 + rng() * 0.08,
  }));
}

test('haversine: same point is 0 km', () => {
  assert.equal(haversineKm(BASE, BASE), 0);
});

test('haversine: Ibagué to Bogotá is about 130 km in a straight line', () => {
  const bogota = { lat: 4.711, lng: -74.0721 };
  const d = haversineKm(BASE, bogota);
  assert.ok(d > 125 && d < 135, `got ${d}`);
});

test('haversine is symmetric', () => {
  const [a, b] = randomPoints(2);
  assert.ok(Math.abs(haversineKm(a, b) - haversineKm(b, a)) < 1e-12);
});

test('routeDistance of empty route is 0', () => {
  assert.equal(routeDistanceKm(BASE, []), 0);
});

test('nearestNeighbor visits every stop exactly once', () => {
  const pts = randomPoints(25);
  const route = nearestNeighbor(BASE, pts);
  assert.equal(route.length, pts.length);
  assert.deepEqual(new Set(route.map((p) => p.id)), new Set(pts.map((p) => p.id)));
});

test('2-opt never makes a route longer', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const pts = randomPoints(15, seed);
    const before = routeDistanceKm(BASE, pts);
    const after = routeDistanceKm(BASE, twoOpt(BASE, pts));
    assert.ok(after <= before + 1e-9, `seed ${seed}: ${after} > ${before}`);
  }
});

test('2-opt removes a crossing on a square', () => {
  const sq = [
    { id: 'a', lat: 0, lng: 1 },
    { id: 'c', lat: 1, lng: 0 }, // visiting a -> c -> b crosses the square
    { id: 'b', lat: 1, lng: 1 },
  ];
  const origin = { lat: 0, lng: 0 };
  const fixed = twoOpt(origin, sq);
  assert.ok(routeDistanceKm(origin, fixed) < routeDistanceKm(origin, sq));
});

test('optimizeRoute handles 0 and 1 stops', () => {
  assert.equal(optimizeRoute(BASE, []).distanceKm, 0);
  const one = randomPoints(1);
  assert.equal(optimizeRoute(BASE, one).route.length, 1);
});

test('kMeans produces balanced groups (max size ceil(n/k))', () => {
  const pts = randomPoints(40);
  for (const k of [1, 2, 3, 4, 6]) {
    const { labels } = kMeans(pts, k);
    const sizes = Array(k).fill(0);
    labels.forEach((l) => sizes[l]++);
    assert.equal(sizes.reduce((s, x) => s + x, 0), pts.length);
    assert.ok(Math.max(...sizes) <= Math.ceil(pts.length / k), `k=${k} sizes=${sizes}`);
  }
});

test('kMeans is deterministic for a given seed', () => {
  const pts = randomPoints(30);
  assert.deepEqual(kMeans(pts, 3, { seed: 7 }).labels, kMeans(pts, 3, { seed: 7 }).labels);
});

test('kMeans caps k at the number of points', () => {
  const pts = randomPoints(2);
  assert.equal(kMeans(pts, 5).centroids.length, 2);
});

test('planRoutes covers all patients and beats the naive baseline', () => {
  const pts = randomPoints(40, 3);
  const plan = planRoutes(BASE, pts, 4);
  const visited = plan.routes.flatMap((r) => r.stops.map((s) => s.id));
  assert.equal(visited.length, pts.length);
  assert.equal(new Set(visited).size, pts.length);
  assert.ok(plan.totalKm <= plan.baselineKm);
});
