import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRoute, progressOn } from '../lib/route.js';
import { meters, bearing } from '../lib/geo.js';

const ARRIVE_M = 18; // close enough to see the racks
const OFF_ROUTE_M = 40; // beyond GPS noise on campus paths
const REROUTE_GAP_MS = 8000;

// ?sim in the URL walks a fake rider along the route — for testing turn-by-turn
// at a desk. Speed multiplier is the value: ?sim=6
function simSpeed() {
  const v = new URLSearchParams(location.search).get('sim');
  return v === null ? 0 : Number(v) || 4;
}

/**
 * Live turn-by-turn to one rack.
 *
 * trip: { to: {lat, lon}, name, mode, from: {lat, lon} } or null.
 * status: 'routing' | 'active' | 'arrived' | 'nogps'
 */
export function useNavigation(trip) {
  const [route, setRoute] = useState(null);
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(null);
  const [status, setStatus] = useState('routing');
  const [notice, setNotice] = useState('');

  const routeRef = useRef(null);
  const offCount = useRef(0);
  const lastRoute = useRef(0);
  const abortRef = useRef(null);
  const prevPos = useRef(null);
  const loading = useRef(false);

  const load = useCallback(
    async (from) => {
      if (!trip) return;
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      lastRoute.current = Date.now();
      loading.current = true;
      try {
        const r = await fetchRoute(from, trip.to, trip.mode, { signal: ctl.signal, destinationName: trip.name });
        routeRef.current = r;
        setRoute(r);
        if (!r.routed) setNotice('No path data here — showing a straight line.');
      } catch (err) {
        if (err.name !== 'AbortError') setNotice('Routing is unavailable right now.');
      } finally {
        if (abortRef.current === ctl) loading.current = false;
      }
    },
    [trip]
  );

  // Initial route from where the trip starts. Trips from a dropped pin have no
  // start yet — they route from the first GPS fix instead.
  useEffect(() => {
    if (!trip) return;
    routeRef.current = null;
    setRoute(null);
    setStatus('routing');
    setNotice('');
    setPosition(trip.from || null);
    prevPos.current = trip.from || null;
    if (trip.from) load(trip.from);
    return () => abortRef.current?.abort();
  }, [trip, load]);

  const onFix = useCallback(
    (p, gpsHeading) => {
      setPosition(p);
      const prev = prevPos.current;
      if (gpsHeading != null && !Number.isNaN(gpsHeading)) setHeading(gpsHeading);
      else if (prev && meters(prev, p) > 3) setHeading(bearing(prev, p));
      prevPos.current = p;

      if (meters(p, trip.to) <= ARRIVE_M) {
        setStatus('arrived');
        return;
      }
      setStatus((s) => (s === 'arrived' ? s : 'active'));

      const r = routeRef.current;
      if (!r) {
        if (!loading.current) load(p);
        return;
      }
      const prog = progressOn(r, p);
      if (prog.offRoute > OFF_ROUTE_M + Math.min(30, p.accuracy || 0)) offCount.current += 1;
      else offCount.current = 0;
      // Two bad fixes in a row, and not more than once every few seconds.
      if (offCount.current >= 2 && Date.now() - lastRoute.current > REROUTE_GAP_MS) {
        offCount.current = 0;
        setNotice('Rerouting…');
        load(p).then(() => setNotice(''));
      }
    },
    [trip, load]
  );

  // Position source: real GPS, or the simulator.
  useEffect(() => {
    if (!trip) return;
    const speed = simSpeed();
    if (speed) {
      if (!route) return;
      let along = 0;
      const id = setInterval(() => {
        along += 1.4 * speed; // walking pace × multiplier, per second
        const r = routeRef.current;
        if (!r) return;
        const i = Math.max(1, r.cum.findIndex((c) => c >= along));
        const a = r.coords[i - 1];
        const b = r.coords[Math.min(i, r.coords.length - 1)];
        const seg = r.cum[i] - r.cum[i - 1] || 1;
        const t = Math.min(1, (along - r.cum[i - 1]) / seg);
        onFix({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, accuracy: 5 });
      }, 1000);
      return () => clearInterval(id);
    }
    if (!navigator.geolocation) {
      setStatus('nogps');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => onFix({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }, pos.coords.heading),
      () => setStatus((s) => (s === 'routing' ? 'nogps' : s)),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trip, route, onFix]);

  // Keep the screen awake while guiding, where the browser allows it.
  useEffect(() => {
    if (!trip || !('wakeLock' in navigator)) return;
    let lock;
    navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => lock?.release().catch(() => {});
  }, [trip]);

  const progress = route && position ? progressOn(route, position) : null;
  return { route, position, heading, progress, status, notice };
}
