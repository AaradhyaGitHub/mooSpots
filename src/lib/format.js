export const WALK_KMH = 4.8;
export const BIKE_KMH = 13;

export function formatDistance(km) {
  return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
}

export function formatMinutes(km, kmh) {
  return Math.max(1, Math.round((km / kmh) * 60)) + ' min';
}

export function navigationUrl(from, to) {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    '&origin=' + from.lat + ',' + from.lon +
    '&destination=' + to.lat + ',' + to.lon +
    '&travelmode=bicycling'
  );
}
