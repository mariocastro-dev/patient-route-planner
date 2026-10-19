import { kMeans } from './clustering.js';
import { optimizeRoute } from './routing.js';
import { routeDistanceKm } from './geo.js';

/**
 * Splits patients among `caregivers` field staff and plans each daily route.
 * Also computes a naive baseline (same groups, visited in list order) so the
 * UI can show how much distance the optimization saves.
 */
export function planRoutes(base, patients, caregivers, { seed = 42 } = {}) {
  const { labels } = kMeans(patients, caregivers, { seed });
  const groups = Array.from({ length: Math.min(caregivers, patients.length) }, () => []);
  patients.forEach((p, i) => groups[labels[i]].push(p));

  const routes = groups.map((group, index) => {
    const { route, distanceKm } = optimizeRoute(base, group);
    return {
      caregiver: index + 1,
      stops: route,
      distanceKm,
      baselineKm: routeDistanceKm(base, group),
    };
  });

  const totalKm = routes.reduce((s, r) => s + r.distanceKm, 0);
  const baselineKm = routes.reduce((s, r) => s + r.baselineKm, 0);
  return {
    routes,
    totalKm,
    baselineKm,
    savingsPct: baselineKm > 0 ? ((baselineKm - totalKm) / baselineKm) * 100 : 0,
  };
}
