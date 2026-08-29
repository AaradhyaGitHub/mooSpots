import { useCallback, useMemo, useRef, useState } from 'react';
import { sortPlacesByDistance, DEMO_POSITION } from '../lib/geo.js';

const GEO_ERRORS = {
  1: 'Location is blocked. Allow location for this site, or browse from a campus spot instead.',
  2: "Your location isn't available right now. Try again, or browse from a campus spot.",
  3: 'That took too long. Try again, or browse from a campus spot.'
};

/**
 * Owns every piece of state the screen needs: where the user is, which racks
 * are nearest, and which one is selected.
 *
 * status: 'idle' | 'loading' | 'located' | 'demo' | 'error'
 */
export function useNearestRacks(racks, resultCount = 6) {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [position, setPosition] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Bumped on every resolve so the map re-frames even when a re-locate lands on
  // a spot that produces an identical result list.
  const [frameToken, setFrameToken] = useState(0);

  const racksRef = useRef(racks);
  racksRef.current = racks;

  const count =
    Number.isFinite(Number(resultCount)) && Number(resultCount) > 0 ? Math.round(Number(resultCount)) : 6;

  const places = useMemo(() => {
    if (!position) return [];
    return sortPlacesByDistance(racksRef.current || [], position.lat, position.lon).slice(0, count);
  }, [position, count]);

  const resolveAt = useCallback((lat, lon, nextStatus = 'located') => {
    setPosition({ lat, lon });
    setStatus(nextStatus);
    setErrorMessage('');
    setSelectedId(null);
    setFrameToken((n) => n + 1);
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage("This browser doesn't support location. You can still browse from a campus spot.");
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolveAt(pos.coords.latitude, pos.coords.longitude, 'located'),
      (err) => {
        setStatus('error');
        setErrorMessage(GEO_ERRORS[err.code] || 'Something went wrong getting your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [resolveAt]);

  const useCampusSpot = useCallback(() => {
    resolveAt(DEMO_POSITION.lat, DEMO_POSITION.lon, 'demo');
  }, [resolveAt]);

  const hasResults = status === 'located' || status === 'demo';

  return {
    status,
    errorMessage,
    position,
    places,
    count,
    hasResults,
    // Default the selection to the nearest rack without an extra render pass.
    selectedId: selectedId ?? (places.length ? places[0].id : null),
    setSelectedId,
    frameToken,
    locate,
    useCampusSpot,
    resolveAt
  };
}
