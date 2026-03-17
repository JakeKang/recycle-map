const EARTH_RADIUS_METERS = 6371e3;

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceLabel(meters: number): string {
  if (meters < 1000) {
    return `내 위치 ${Math.round(meters)}m`;
  }
  return `내 위치 ${(meters / 1000).toFixed(1)}km`;
}
