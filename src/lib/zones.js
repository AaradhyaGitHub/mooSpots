import { ZONES, ZONE_META } from '../data/zones.js';
import { meters, bearing } from './geo.js';

// Racks ship as compact tuples; expand once.
export const zones = ZONES.map((z) => ({
  ...z,
  label: z.area ? z.name + ' · ' + z.area : z.name,
  racks: z.racks.map(([id, lat, lon, spaces, type, comment]) => ({ id, lat, lon, spaces, type, comment, zoneId: z.id }))
}));

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]));
export const allRacks = zones.flatMap((z) => z.racks);
export { ZONE_META };

// Areas this small aren't worth sending anyone to first: one or two racks with
// a handful of spaces. They stay on the map, they just don't headline a list.
const MIN_LISTED_SPACES = 12;

// Within a zone, which rack do we route to? The closest one, unless a much
// bigger rack is barely farther: each space of capacity is worth ~1.2 m of
// extra walking, capped so a huge rack never drags you across the area.
export function pickDestination(zone, from) {
  if (!from) return zone.racks[0];
  let best = null;
  for (const r of zone.racks) {
    const score = meters(from, r) - 1.2 * Math.min(r.spaces, 40);
    if (!best || score < best.score) best = { r, score };
  }
  return best.r;
}

// Nearest parking areas to a point. Distance to an area is distance to its
// closest rack — that's when you've "arrived".
export function rankZones(from, count = 5) {
  if (!from) return [];
  return zones
    .filter((z) => z.spaces >= MIN_LISTED_SPACES)
    .map((zone) => {
      let nearest = zone.racks[0];
      let dist = Infinity;
      for (const r of zone.racks) {
        const d = meters(from, r);
        if (d < dist) {
          dist = d;
          nearest = r;
        }
      }
      return { zone, dist, nearest, bearing: bearing(from, zone.center) };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((res) => ({ ...res, destination: pickDestination(res.zone, from) }));
}

export function racksByDistance(zone, from) {
  if (!from) return zone.racks;
  return zone.racks
    .map((r) => ({ ...r, dist: meters(from, r) }))
    .sort((a, b) => a.dist - b.dist);
}

const TYPE_SHORT = {
  'Lightning Bolt Rack': 'Lightning bolt',
  'Coat Hanger Rack': 'Coat hanger',
  'Inverted U': 'Inverted U',
  'Bike Rail': 'Rail',
  'Low Rack': 'Low rack',
  'Playground Rack': 'Playground',
  'Bike Stall': 'Stall',
  'Park-rite Rack': 'Park-rite',
  'Varsity Rack': 'Varsity',
  'Concrete Pod': 'Concrete pod',
  'Bike Locker': 'Locker',
  'Wave Rack': 'Wave',
  Other: 'Mixed'
};
export const shortType = (t) => TYPE_SHORT[t] || t;
