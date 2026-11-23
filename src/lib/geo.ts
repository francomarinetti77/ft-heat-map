// Geographic helpers. Pure functions, no dependencies.

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle (straight-line) distance between two lat/lng points, in metres. */
export function haversineMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Approximate a routed (street-following) distance from the straight-line
 * distance. Trenching follows roads, not crow flight (§3.3). In a dense grid
 * like Barcelona's Eixample the detour factor is roughly 1.3–1.4; we use 1.35
 * as an indicative multiplier. A real deployment would call OSRM here.
 */
export const ROUTING_DETOUR_FACTOR = 1.35;

export function approxRoutedMetres(straightLineM: number): number {
  return Math.round(straightLineM * ROUTING_DETOUR_FACTOR);
}
