import { useCallback, useMemo, useRef, useState } from 'react';
import { rankZones } from '../lib/zones.js';
import { meters, CAMPUS_CENTER } from '../lib/geo.js';

// Farther than this and we stop pretending you're about to ride there.
const FAR_M = 4000;

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform || navigator.userAgent);
const SYSTEM_HINT = isMac
  ? ' On a Mac, check System Settings → Privacy & Security → Location Services is on for your browser.'
  : '';

const GEO_ERRORS = {
  1: 'Location is blocked for this site. Allow it in your browser settings, or drop a pin instead.',
  2: "Your browser couldn't work out where you are." + SYSTEM_HINT + ' Or drop a pin instead.',
  3: "Couldn't get a location fix in time." + SYSTEM_HINT + ' Or drop a pin instead.'
};

// Two requests race. Laptops have no GPS, and a high-accuracy request there can
// hang until it times out, so a quick coarse fix (Wi-Fi based, recent cache OK)
// gets you on the map while the precise one keeps working in the background.
const QUICK = { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60000 };
const PRECISE = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const readMode = () => {
  try {
    return localStorage.getItem('moo-mode') === 'walk' ? 'walk' : 'bike';
  } catch {
    return 'bike';
  }
};

/**
 * Everything both layouts share: where the search starts, which parking areas
 * are closest, which one is open, and walk-vs-bike.
 *
 * status: 'idle' | 'locating' | 'ready' | 'error'
 * origin: { lat, lon, kind: 'gps' | 'pin', accuracy? }
 */
export function useMooSpots(resultCount = 5) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setModeState] = useState(readMode);
  // Bumped on every new origin so the map re-frames even if results match.
  const [searchToken, setSearchToken] = useState(0);
  const lastGps = useRef(null);

  const results = useMemo(() => rankZones(origin, resultCount), [origin, resultCount]);
  const farKm = origin && meters(origin, CAMPUS_CENTER) > FAR_M ? meters(origin, CAMPUS_CENTER) / 1000 : 0;

  const resolve = useCallback((next) => {
    setOrigin(next);
    setStatus('ready');
    setError('');
    setSelectedId(null);
    setSearchToken((n) => n + 1);
  }, []);

  const attempt = useRef(0);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError("This browser can't share location. Drop a pin on the map instead.");
      return;
    }
    const id = ++attempt.current;
    let best = null;
    const failures = [];
    setStatus('locating');

    const onFix = (pos) => {
      if (id !== attempt.current) return;
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, kind: 'gps', accuracy: pos.coords.accuracy };
      if (!best) {
        best = p;
        lastGps.current = p;
        resolve(p);
      } else if (p.accuracy < best.accuracy / 2 && meters(best, p) > 15) {
        // A much better fix landed after we'd already shown results: move the
        // dot and re-rank, but don't throw the rider out of a spot they opened.
        best = p;
        lastGps.current = p;
        setOrigin((o) => (o && o.kind === 'gps' ? p : o));
      }
    };
    const onFail = (err) => {
      if (id !== attempt.current) return;
      failures.push(err);
      if (best || failures.length < 2) return;
      // Both failed. A denial outranks a timeout in what we tell the user.
      const code = failures.some((e) => e.code === 1) ? 1 : failures[0].code;
      setStatus('error');
      setError(GEO_ERRORS[code] || 'Something went wrong getting your location.');
    };

    navigator.geolocation.getCurrentPosition(onFix, onFail, QUICK);
    navigator.geolocation.getCurrentPosition(onFix, onFail, PRECISE);
  }, [resolve]);

  const dropPin = useCallback(
    (p) => {
      attempt.current++; // a pin wins over a location request still in flight
      resolve({ lat: p.lat, lon: p.lon, kind: 'pin' });
    },
    [resolve]
  );

  const clear = useCallback(() => {
    attempt.current++;
    setOrigin(null);
    setStatus('idle');
    setSelectedId(null);
    setError('');
  }, []);

  const setMode = useCallback((m) => {
    setModeState(m);
    try {
      localStorage.setItem('moo-mode', m);
    } catch {
      /* private mode — fine, it just won't stick */
    }
  }, []);

  return {
    status,
    error,
    origin,
    results,
    farKm,
    selectedId,
    select: setSelectedId,
    mode,
    setMode,
    searchToken,
    locate,
    dropPin,
    clear,
    lastGps
  };
}
