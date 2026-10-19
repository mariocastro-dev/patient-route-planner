// Geographic helpers. Distances are great-circle ("as the crow flies") in kilometers.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two points using the haversine formula.
 * @param {{lat:number,lng:number}} a
 * @param {{lat:number,lng:number}} b
 * @returns {number} distance in km
 */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Total length of a route that starts at `origin`, visits `stops` in order
 * and (optionally) returns to `origin`.
 */
export function routeDistanceKm(origin, stops, returnToOrigin = true) {
  if (stops.length === 0) return 0;
  let total = haversineKm(origin, stops[0]);
  for (let i = 1; i < stops.length; i++) total += haversineKm(stops[i - 1], stops[i]);
  if (returnToOrigin) total += haversineKm(stops[stops.length - 1], origin);
  return total;
}
