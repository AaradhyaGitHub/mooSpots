// Haversine great-circle distance. Same math as the original src/loc.js.
const toRad = (v) => (v * Math.PI) / 180;
const toDeg = (v) => (v * 180) / Math.PI;

export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const l1 = toRad(lat1);
  const l2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(l1) * Math.cos(l2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Same, in meters, for {lat, lon} points.
export const meters = (a, b) => calculateDistance(a.lat, a.lon, b.lat, b.lon) * 1000;

// Initial bearing from a to b, degrees clockwise from north.
export function bearing(a, b) {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_WORDS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];
export const compassWord = (deg) => COMPASS_WORDS[Math.round(deg / 45) % 8];

// Local flat projection (meters) around a reference latitude. Accurate to well
// under a meter across campus, and much cheaper than geodesics in hot loops.
export function localProjection(lat0) {
  const kx = 111320 * Math.cos(toRad(lat0));
  const ky = 111132;
  return {
    toXY: (p) => [p.lon * kx, p.lat * ky],
    toLL: ([x, y]) => ({ lat: y / ky, lon: x / kx })
  };
}

// Where the browser lands before anything is located: the middle of the rack
// inventory, which is the middle of campus.
export const CAMPUS_CENTER = { lat: 38.5382, lon: -121.7577 };
