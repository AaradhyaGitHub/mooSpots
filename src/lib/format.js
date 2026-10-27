export const WALK_KMH = 4.8;
export const BIKE_KMH = 13;
export const SPEED = { walk: WALK_KMH, bike: BIKE_KMH };

export function formatDistance(m) {
  if (m < 1000) return Math.max(5, Math.round(m / 5) * 5) + ' m';
  return (m / 1000).toFixed(1) + ' km';
}

// Whole minutes for walking; bikes cover short hops in seconds, so say so
// instead of rounding everything up to "1 min".
export function travelMinutes(m, mode) {
  return (m / 1000 / SPEED[mode]) * 60;
}

export function formatDuration(min) {
  const sec = Math.round((min * 60) / 10) * 10;
  if (sec < 60) return Math.max(10, sec) + ' sec';
  return Math.max(1, Math.round(min)) + ' min';
}

export const formatTravel = (m, mode) => formatDuration(travelMinutes(m, mode));

export function formatClock(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const formatCount = (n) => n.toLocaleString('en-US');

export function formatCoord(lat, lon) {
  const f = (v, pos, neg) => Math.abs(v).toFixed(5) + '°' + (v >= 0 ? pos : neg);
  return f(lat, 'N', 'S') + '  ' + f(lon, 'E', 'W');
}

export function navigationUrl(from, to, mode = 'bike') {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    (from ? '&origin=' + from.lat + ',' + from.lon : '') +
    '&destination=' + to.lat + ',' + to.lon +
    '&travelmode=' + (mode === 'walk' ? 'walking' : 'bicycling')
  );
}
