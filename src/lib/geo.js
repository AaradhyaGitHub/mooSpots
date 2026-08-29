// Haversine great-circle distance. Same math as the original src/loc.js.
const toRad = (v) => (v * Math.PI) / 180;

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

export function sortPlacesByDistance(places, lat, lon) {
  return [...places]
    .map((place) => ({ ...place, distance: calculateDistance(lat, lon, place.lat, place.lon) }))
    .sort((a, b) => a.distance - b.distance);
}

// A coordinate inside the campus rack cluster, used by "Use a campus spot".
export const DEMO_POSITION = { lat: 38.5372, lon: -121.752 };

// Fallback map center before anything is located.
export const CAMPUS_CENTER = { lat: 38.5382, lon: -121.7617 };
