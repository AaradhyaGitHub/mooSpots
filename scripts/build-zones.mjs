// Builds src/data/zones.js from src/bike-rack.js.
//
//   node scripts/build-zones.mjs            # use cached building names
//   node scripts/build-zones.mjs --fetch    # refresh names from OpenStreetMap
//
// Why zones: racks on campus sit a median 13 m apart, so the nearest six racks
// are always "the same place" — identical walk and ride times, often identical
// type. A rider doesn't choose between racks, they choose where to go. So we
// clean the inventory, group racks into parking areas, name each area after the
// nearest campus building, and ship that as static data.
//
// Clustering is complete-linkage agglomerative with a hard diameter cap: every
// rack in an area is within MAX_DIAMETER_M of every other rack in it. That cap
// is what makes a single walk/ride time honest for the whole area.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src/bike-rack.js');
const OUT = join(ROOT, 'src/data/zones.js');
const NAMES = join(ROOT, 'scripts/campus-buildings.json');

const MAX_DIAMETER_M = 140; // ~1.7 min walk edge to edge
const NAME_RADIUS_M = 170; // farther than this from any building → named by street
const HULL_PAD_M = 16; // soft margin drawn around an area's racks

// --- Load ------------------------------------------------------------------

// bike-rack.js imports .jpg files, which Node can't load. Strip the imports and
// image refs and evaluate the array literal as a module.
async function loadRacks() {
  const text = readFileSync(SRC, 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/src:\s*img_[a-z_]+/g, 'src: ""');
  const url = 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
  return (await import(url)).AVAILABLE_BIKE_RACKS;
}

// --- Geometry ----------------------------------------------------------------

const toRad = (v) => (v * Math.PI) / 180;
function meters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Local equirectangular projection, plenty accurate across one campus.
const LAT0 = 38.538;
const M_PER_DEG_LAT = 111132;
const M_PER_DEG_LON = 111320 * Math.cos(toRad(LAT0));
const project = (p) => [p.lon * M_PER_DEG_LON, p.lat * M_PER_DEG_LAT];
const unproject = ([x, y]) => ({ lat: y / M_PER_DEG_LAT, lon: x / M_PER_DEG_LON });

function convexHull(pts) {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (s.length < 3) return s;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of s.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Hull of small circles around every rack → a rounded blob around the area.
function paddedHull(racks) {
  const pts = [];
  for (const r of racks) {
    const [x, y] = project(r);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      pts.push([x + Math.cos(a) * HULL_PAD_M, y + Math.sin(a) * HULL_PAD_M]);
    }
  }
  return convexHull(pts).map((p) => {
    const ll = unproject(p);
    return [round(ll.lat, 6), round(ll.lon, 6)];
  });
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
function compass(from, to) {
  const [x0, y0] = project(from);
  const [x1, y1] = project(to);
  const deg = (Math.atan2(x1 - x0, y1 - y0) * 180) / Math.PI;
  return COMPASS[Math.round(((deg + 360) % 360) / 45) % 8];
}

// --- Clean -------------------------------------------------------------------

function clean(racks) {
  const dropped = { noSpaces: 0, removed: 0, badCoords: 0 };
  const kept = racks.filter((r) => {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return dropped.badCoords++, false;
    if (/\bremoved\b/i.test(r.Comments || '')) return dropped.removed++, false;
    if (!(Number(r.rack_spaces) > 0)) return dropped.noSpaces++, false;
    return true;
  });
  return { kept, dropped };
}

// --- Cluster -----------------------------------------------------------------

function completeLinkage(racks, maxDiameter) {
  const n = racks.length;
  const M = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) M[i * n + j] = M[j * n + i] = meters(racks[i], racks[j]);
  const alive = new Uint8Array(n).fill(1);
  const members = racks.map((_, i) => [i]);
  for (;;) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (alive[j] && M[i * n + j] < best) { best = M[i * n + j]; bi = i; bj = j; }
      }
    }
    if (best > maxDiameter) break;
    for (let k = 0; k < n; k++) {
      if (!alive[k]) continue;
      const v = Math.max(M[bi * n + k], M[bj * n + k]);
      M[bi * n + k] = M[k * n + bi] = v;
    }
    alive[bj] = 0;
    members[bi] = members[bi].concat(members[bj]);
  }
  return members.filter((_, i) => alive[i]).map((idx) => idx.map((i) => racks[i]));
}

// --- Names -------------------------------------------------------------------

async function fetchBuildings() {
  const q =
    '[out:json][timeout:90];(way["building"]["name"](38.524,-121.785,38.552,-121.732);' +
    'relation["building"]["name"](38.524,-121.785,38.552,-121.732););out bb tags;';
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  for (const url of mirrors) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'mooSpots-build (github.com/AaradhyaGitHub/mooSpots)', Accept: 'application/json' },
        body: 'data=' + encodeURIComponent(q)
      });
      if (!res.ok) throw new Error(res.status);
      const json = await res.json();
      const list = json.elements
        .map((e) => ({
          name: e.tags.name,
          kind: e.tags.building,
          lat: round((e.bounds.minlat + e.bounds.maxlat) / 2, 6),
          lon: round((e.bounds.minlon + e.bounds.maxlon) / 2, 6),
          // Footprint diagonal in meters — a proxy for how recognizable it is.
          size: Math.round(
            meters({ lat: e.bounds.minlat, lon: e.bounds.minlon }, { lat: e.bounds.maxlat, lon: e.bounds.maxlon })
          )
        }))
        .filter((b) => b.name && Number.isFinite(b.lat));
      // Overpass reports timeouts as a 200 with zero elements.
      if (list.length < 50) throw new Error('only ' + list.length + ' buildings (' + (json.remark || 'no remark') + ')');
      console.log('fetched', list.length, 'buildings from', url);
      return list;
    } catch (err) {
      console.warn('overpass failed', url, err.message);
    }
  }
  throw new Error('All Overpass mirrors failed; rerun later or without --fetch.');
}

// Short, readable names: drop parentheticals and collapse whitespace.
const tidy = (s) => s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

// Campus-ish building types name areas freely; anything else (shops, hotels,
// churches just off campus) has to be much closer to win.
const CAMPUS_KINDS = new Set(['university', 'dormitory', 'school', 'civic', 'museum', 'college', 'fire_station']);
const VAGUE_NAME = /^(office|music|laundry room|restroom)s?$|\b(storage|shed|trailer|annex|garage)\b|^TB ?\d+|^temporary building/i;

// Effective distance: what a rider would recognize, not just what's nearest.
function namingCost(z, b) {
  let cost = meters(z.center, b);
  if (!CAMPUS_KINDS.has(b.kind)) cost += b.kind === 'yes' ? 30 : 120;
  if (VAGUE_NAME.test(b.name)) cost += 70;
  cost -= Math.min(35, (b.size || 0) / 4); // a 140 m-wide building gets the full bonus
  return cost;
}

function nameZones(zones, buildings) {
  for (const z of zones) {
    z.candidates = buildings
      .map((b) => ({ b, cost: namingCost(z, b), d: meters(z.center, b) }))
      .sort((a, b) => a.cost - b.cost);
    const best = z.candidates[0];
    if (best && best.d <= NAME_RADIUS_M) z.name = tidy(best.b.name);
    else if (best) z.name = 'Near ' + tidy(best.b.name);
    z.anchorPlace = best?.b;
  }

  // Several areas named after the same building: tell them apart by which side
  // they're on, falling back to their next-best landmark.
  const groups = {};
  zones.forEach((z) => z.name && (groups[z.name] ||= []).push(z));
  for (const list of Object.values(groups)) {
    if (list.length < 2) continue;
    const used = new Set();
    for (const z of list) {
      const side = compass(z.anchorPlace, z.center);
      if (!used.has(side)) {
        used.add(side);
        z.area = side[0].toUpperCase() + side.slice(1) + ' side';
      } else {
        const alt = z.candidates.find((c) => tidy(c.b.name) !== z.name && !groups[tidy(c.b.name)]);
        z.area = alt ? 'By ' + tidy(alt.b.name) : null;
      }
    }
  }

  let n = 0;
  for (const z of zones) {
    if (!z.name) z.name = 'Parking area ' + ++n;
    delete z.anchorPlace;
    delete z.candidates;
  }
}

// --- Main --------------------------------------------------------------------

const all = await loadRacks();
const { kept, dropped } = clean(all);

let buildings = [];
if (process.argv.includes('--fetch')) {
  buildings = await fetchBuildings();
  writeFileSync(NAMES, JSON.stringify(buildings, null, 0) + '\n');
} else if (existsSync(NAMES)) {
  buildings = JSON.parse(readFileSync(NAMES, 'utf8'));
}

const clusters = completeLinkage(kept, MAX_DIAMETER_M);

const zones = clusters.map((racks) => {
  const spaces = racks.reduce((a, r) => a + r.rack_spaces, 0);
  // Capacity-weighted center: the middle of where the bikes actually go.
  const center = {
    lat: racks.reduce((a, r) => a + r.lat * r.rack_spaces, 0) / spaces,
    lon: racks.reduce((a, r) => a + r.lon * r.rack_spaces, 0) / spaces
  };
  const types = {};
  racks.forEach((r) => (types[r.rack_type] = (types[r.rack_type] || 0) + r.rack_spaces));
  const mainType = Object.entries(types).sort((a, b) => b[1] - a[1])[0][0];
  const radius = Math.max(...racks.map((r) => meters(center, r)));
  return {
    center,
    spaces,
    radius: Math.round(radius),
    mainType,
    hull: paddedHull(racks),
    racks: racks
      .sort((a, b) => b.rack_spaces - a.rack_spaces)
      .map((r) => [r.id, round(r.lat, 7), round(r.lon, 7), r.rack_spaces, r.rack_type, (r.Comments || '').trim()])
  };
});

// Stable order and ids: north to south, west to east.
zones.sort((a, b) => b.center.lat - a.center.lat || a.center.lon - b.center.lon);
nameZones(zones, buildings);
zones.forEach((z, i) => {
  z.id = 'z' + (i + 1);
  z.center = { lat: round(z.center.lat, 6), lon: round(z.center.lon, 6) };
});

const meta = {
  generated: new Date().toISOString().slice(0, 10),
  source: 'src/bike-rack.js',
  racksIn: all.length,
  racksKept: kept.length,
  dropped,
  maxDiameterM: MAX_DIAMETER_M,
  zoneCount: zones.length,
  totalSpaces: kept.reduce((a, r) => a + r.rack_spaces, 0),
  namedBy: buildings.length ? 'OpenStreetMap buildings' : 'none'
};

const ordered = zones.map(({ id, name, area, center, spaces, radius, mainType, hull, racks }) => ({
  id, name, area: area || null, center, spaces, radius, mainType, hull, racks
}));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  '// Generated by scripts/build-zones.mjs — do not edit by hand.\n' +
    '// racks: [id, lat, lon, spaces, type, comment], biggest first.\n' +
    'export const ZONE_META = ' + JSON.stringify(meta) + ';\n\n' +
    'export const ZONES = [\n' + ordered.map((z) => '  ' + JSON.stringify(z)).join(',\n') + '\n];\n'
);

console.log(meta);
