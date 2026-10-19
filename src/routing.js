import { haversineKm, routeDistanceKm } from './geo.js';

/**
 * Greedy construction: from the current position always go to the closest
 * unvisited stop. O(n²). Fast, but typically 15–25% longer than optimal.
 */
export function nearestNeighbor(origin, stops) {
  const remaining = [...stops];
  const route = [];
  let current = origin;
  while (remaining.length) {
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (haversineKm(current, remaining[i]) < haversineKm(current, remaining[best])) best = i;
    }
    current = remaining.splice(best, 1)[0];
    route.push(current);
  }
  return route;
}

/**
 * 2-opt local search: repeatedly reverses a segment of the route when doing so
 * shortens it (i.e. removes a "crossing"). Stops when no improving move exists.
 * Each pass is O(n²); the tour origin is fixed and the route returns to it.
 */
export function twoOpt(origin, route) {
  const tour = [origin, ...route, origin];
  const d = haversineKm;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < tour.length - 2; i++) {
      for (let j = i + 1; j < tour.length - 1; j++) {
        const delta =
          d(tour[i - 1], tour[j]) + d(tour[i], tour[j + 1]) -
          d(tour[i - 1], tour[i]) - d(tour[j], tour[j + 1]);
        if (delta < -1e-9) {
          // reverse tour[i..j]
          for (let a = i, b = j; a < b; a++, b--) [tour[a], tour[b]] = [tour[b], tour[a]];
          improved = true;
        }
      }
    }
  }
  return tour.slice(1, -1);
}

/** Nearest neighbor followed by 2-opt improvement. */
export function optimizeRoute(origin, stops) {
  const route = twoOpt(origin, nearestNeighbor(origin, stops));
  return { route, distanceKm: routeDistanceKm(origin, route) };
}
