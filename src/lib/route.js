import { meters, bearing, compassWord, localProjection } from './geo.js';
import { SPEED } from './format.js';

// Free OSRM instances run by the OpenStreetMap community: real foot and bike
// profiles, no key, CORS enabled. Fair use only — we fetch once per trip and
// again only when the rider leaves the route.
const ROUTER = {
  walk: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/',
  bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving/'
};

/**
 * A route is { coords: [{lat, lon}], steps: [Step], distance, duration, routed }.
 * Step: { at: meters along route where the maneuver happens, kind, modifier,
 *         text, street, location }.
 */
export async function fetchRoute(from, to, mode, { signal, destinationName } = {}) {
  const url =
    ROUTER[mode] +
    from.lon + ',' + from.lat + ';' + to.lon + ',' + to.lat +
    '?overview=full&geometries=geojson&steps=true';
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('router ' + res.status);
    const json = await res.json();
    const r = json.routes?.[0];
    if (!r) throw new Error('no route');
    return fromOsrm(r, from, to, mode, destinationName);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return straightLine(from, to, mode, destinationName);
  }
}

function fromOsrm(r, from, to, mode, destinationName) {
  const coords = r.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
  // OSRM leaves a gap between the snapped path and the rack itself; close it.
  if (meters(coords.at(-1), to) > 3) coords.push(to);
  const cum = cumulative(coords);
  const total = cum.at(-1);

  const steps = [];
  let along = 0;
  for (const s of r.legs.flatMap((l) => l.steps)) {
    const m = s.maneuver;
    const step = {
      at: along,
      kind: m.type,
      modifier: m.modifier || 'straight',
      street: s.name || '',
      location: { lat: m.location[1], lon: m.location[0] },
      bearingAfter: m.bearing_after
    };
    step.text = instruction(step, destinationName);
    // Drop no-op "continue straight" steps; they're noise on a walking path.
    const noise = (m.type === 'new name' || m.type === 'continue') && step.modifier === 'straight';
    if (!noise || !steps.length) steps.push(step);
    along += s.distance;
  }
  const last = steps.at(-1);
  if (last.kind !== 'arrive') steps.push({ at: total, kind: 'arrive', modifier: 'straight', street: '', location: to });
  steps.at(-1).at = total;
  steps.at(-1).text = instruction(steps.at(-1), destinationName);

  // OSRM's foot/bike durations are sensible, but keep our own speeds so the
  // trip time matches what the list promised.
  return { coords, cum, steps, distance: total, duration: (total / 1000 / SPEED[mode]) * 60, routed: true };
}

function straightLine(from, to, mode, destinationName) {
  const coords = [from, to];
  const d = meters(from, to);
  const head = bearing(from, to);
  return {
    coords,
    cum: [0, d],
    steps: [
      { at: 0, kind: 'depart', modifier: 'straight', street: '', location: from, bearingAfter: head, text: 'Head ' + compassWord(head) },
      { at: d, kind: 'arrive', modifier: 'straight', street: '', location: to, text: instruction({ kind: 'arrive' }, destinationName) }
    ],
    distance: d,
    duration: (d / 1000 / SPEED[mode]) * 60,
    routed: false
  };
}

function cumulative(coords) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + meters(coords[i - 1], coords[i]));
  return out;
}

const TURN = {
  left: 'Turn left',
  right: 'Turn right',
  'slight left': 'Bear left',
  'slight right': 'Bear right',
  'sharp left': 'Turn sharp left',
  'sharp right': 'Turn sharp right',
  uturn: 'Turn around',
  straight: 'Go straight'
};

export function instruction(step, destinationName) {
  const onto = step.street ? ' onto ' + step.street : '';
  switch (step.kind) {
    case 'depart':
      return 'Head ' + compassWord(step.bearingAfter ?? 0) + (step.street ? ' on ' + step.street : '');
    case 'arrive':
      return destinationName ? 'Arrive at ' + destinationName : 'Arrive at the racks';
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return 'Take the roundabout' + onto;
    case 'fork':
      return (step.modifier.includes('left') ? 'Keep left' : step.modifier.includes('right') ? 'Keep right' : 'Keep straight') + onto;
    case 'merge':
      return 'Merge' + onto;
    case 'end of road':
      return (TURN[step.modifier] || 'Turn') + onto;
    case 'new name':
    case 'continue':
      return (step.modifier === 'straight' ? 'Continue' : TURN[step.modifier] || 'Continue') + onto;
    default:
      return (TURN[step.modifier] || 'Continue') + onto;
  }
}

/**
 * Where is the rider relative to the route? Snaps a GPS fix onto the polyline.
 * Returns { along, offRoute (m from line), remaining, stepIndex, next, toNext }.
 * `next` is the upcoming maneuver; `toNext` meters until it.
 */
export function progressOn(route, pos) {
  const proj = localProjection(pos.lat);
  const p = proj.toXY(pos);
  let best = { d: Infinity, along: 0 };
  for (let i = 1; i < route.coords.length; i++) {
    const a = proj.toXY(route.coords[i - 1]);
    const b = proj.toXY(route.coords[i]);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    const qx = a[0] + t * dx;
    const qy = a[1] + t * dy;
    const d = Math.hypot(p[0] - qx, p[1] - qy);
    if (d < best.d) best = { d, along: route.cum[i - 1] + t * (route.cum[i] - route.cum[i - 1]) };
  }

  // The upcoming maneuver is the first one meaningfully ahead of us.
  let nextIndex = route.steps.findIndex((s, i) => i > 0 && s.at > best.along + 4);
  if (nextIndex === -1) nextIndex = route.steps.length - 1;
  const next = route.steps[nextIndex];
  return {
    along: best.along,
    offRoute: best.d,
    remaining: Math.max(0, route.distance - best.along),
    stepIndex: nextIndex - 1,
    next,
    toNext: Math.max(0, next.at - best.along)
  };
}
