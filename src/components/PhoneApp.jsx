import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import MooMap from './MooMap.jsx';
import NavHUD from './NavHUD.jsx';
import { GitHubLink, ModeToggle, ZoneRow, ZoneStats, RackList } from './Shared.jsx';
import { LocateIcon, PinIcon, ChevronLeftIcon, XIcon, ExternalIcon, RefreshIcon } from './Icons.jsx';
import { useNavigation } from '../hooks/useNavigation.js';
import { zoneById, pickDestination, ZONE_META, shortType } from '../lib/zones.js';
import { formatCount, formatTravel, navigationUrl } from '../lib/format.js';
import { meters } from '../lib/geo.js';

const SCAN_MS = 1100;

export default function PhoneApp({ app, logoSrc }) {
  const { status, error, origin, results, selectedId, select, mode, setMode, searchToken, locate, dropPin, clear } = app;
  const mapRef = useRef(null);
  const sheetRef = useRef(null);
  const [sheetH, setSheetH] = useState(260);
  const [expanded, setExpanded] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [pinDropKey, setPinDropKey] = useState(0);
  const [revealed, setRevealed] = useState(true);
  const [trip, setTrip] = useState(null);
  const [following, setFollowing] = useState(true);
  const [overview, setOverview] = useState(false);

  const nav = useNavigation(trip);
  const navigating = !!trip;

  // Map padding follows the sheet so framed things are never hidden behind it.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [navigating]);

  const pad = useMemo(
    () => (navigating ? { top: 150, bottom: 130, left: 24, right: 24 } : { top: 84, bottom: sheetH + 20, left: 36, right: 76 }),
    [navigating, sheetH]
  );

  const selected = selectedId ? zoneById[selectedId] : null;
  const selectedResult = results.find((r) => r.zone.id === selectedId) || null;

  // Frame the results whenever a new search lands (after the scan, for pins).
  useEffect(() => {
    if (!origin || !results.length) return;
    const go = () =>
      mapRef.current?.frame([...(app.farKm ? [] : [origin]), ...results.slice(0, 4).map((r) => r.nearest)], {
        duration: origin.kind === 'pin' ? 1.4 : 0.9,
        maxZoom: 18
      });
    if (origin.kind === 'pin') {
      setRevealed(false);
      const t = setTimeout(() => {
        setRevealed(true);
        go();
      }, SCAN_MS);
      return () => clearTimeout(t);
    }
    setRevealed(true);
    const raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [searchToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening an area frames it with the origin.
  useEffect(() => {
    if (!selected || navigating) return;
    const pts = origin && !app.farKm ? [origin, ...selected.racks] : selected.racks;
    const t = setTimeout(() => mapRef.current?.frame(pts, { duration: 0.8, maxZoom: 18, minSpanM: 260 }), 60);
    return () => clearTimeout(t);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation framing: route overview first, then follow the rider.
  useEffect(() => {
    if (!nav.route) return;
    setOverview(true);
    mapRef.current?.frame(nav.route.coords, { duration: 0.8, maxZoom: 18 });
    const t = setTimeout(() => setOverview(false), 1800);
    return () => clearTimeout(t);
  }, [nav.route]);

  const startPin = () => {
    select(null);
    setExpanded(false);
    setPinMode(true);
  };

  // The pin sits in the middle of the visible map (above the sheet).
  const confirmPin = () => {
    const map = mapRef.current?.map;
    if (!map) return;
    const size = map.getSize();
    const p = mapRef.current.pointToLatLng(size.x / 2, (size.y - sheetH) / 2 + 8);
    setPinMode(false);
    setScanKey((k) => k + 1);
    setPinDropKey((k) => k + 1);
    dropPin(p);
  };

  const go = useCallback(
    (zone, rack) => {
      const from = origin?.kind === 'gps' ? origin : app.lastGps.current;
      const dest = rack || pickDestination(zone, from || origin);
      setTrip({
        to: { lat: dest.lat, lon: dest.lon },
        rack: dest,
        name: zone.name,
        zoneId: zone.id,
        mode,
        from: from ? { lat: from.lat, lon: from.lon } : new URLSearchParams(location.search).has('sim') ? origin : null
      });
      setExpanded(false);
    },
    [origin, mode, app.lastGps]
  );

  const endTrip = useCallback(({ fromHistory } = {}) => {
    setTrip(null);
    if (!fromHistory && history.state?.mooNav) history.back();
  }, []);

  // --- Sheet drag ---------------------------------------------------------------
  const drag = useRef(null);
  const onDragStart = (e) => {
    drag.current = { y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 6) drag.current.moved = true;
    sheetRef.current.style.setProperty('--drag', Math.max(-40, dy) + 'px');
  };
  const onDragEnd = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    sheetRef.current.style.setProperty('--drag', '0px');
    if (!drag.current.moved) setExpanded((x) => !x);
    else if (dy < -40) setExpanded(true);
    else if (dy > 40) setExpanded(false);
    drag.current = null;
  };

  const sheetState = pinMode ? 'pin' : selected ? 'zone' : origin && results.length ? 'results' : 'home';

  return (
    <div className={'moo-phone' + (navigating ? ' is-navigating' : '') + (pinMode ? ' is-pinning' : '')}>
      <MooMap
        ref={mapRef}
        pad={pad}
        origin={pinMode ? null : origin}
        pinDropKey={pinDropKey}
        scanKey={scanKey}
        results={navigating || pinMode || !revealed ? [] : results}
        mode={mode}
        selectedId={navigating ? trip.zoneId : selectedId}
        route={nav.route && navigating ? nav.route : null}
        routeProgress={navigating ? nav.progress : null}
        navPosition={navigating ? nav.position : null}
        navHeading={nav.heading}
        destination={navigating ? trip.to : null}
        follow={navigating && following && !overview}
        onUserMove={() => {
          if (navigating) {
            setFollowing(false);
            setOverview(false);
          }
          if (pinMode) setMapMoving(true);
        }}
        onZoneClick={(id) => !navigating && !pinMode && select(id)}
      />

      {!navigating && (
        <header className="moo-topbar">
          <button type="button" className="moo-brand" onClick={() => (clear(), setExpanded(false))} aria-label="mooSpots home">
            <img src={logoSrc} alt="" />
            <span>mooSpots</span>
          </button>
          <GitHubLink className="moo-gh--float" />
        </header>
      )}

      {pinMode && (
        <div className="moo-centerpin" style={{ bottom: sheetH }} aria-hidden="true">
          <div className={'moo-centerpin__pin' + (mapMoving ? ' is-lifted' : '')} onTransitionEnd={() => setMapMoving(false)}>
            <PinIcon size={40} strokeWidth={2.25} />
          </div>
          <div className="moo-centerpin__shadow" />
        </div>
      )}

      {navigating ? (
        <NavHUD
          key={trip.to.lat + ',' + trip.to.lon}
          trip={trip}
          nav={nav}
          onEnd={endTrip}
          following={following}
          onRecenter={() => setFollowing(true)}
        />
      ) : (
        <>
          {!pinMode && (
            <button
              type="button"
              className="moo-fab"
              style={{ bottom: sheetH + 14 }}
              onClick={locate}
              aria-label="Find parking near my location"
            >
              {status === 'locating' ? <span className="moo-spinner" /> : <LocateIcon size={20} />}
            </button>
          )}

          <section
            ref={sheetRef}
            className={'moo-sheet is-' + sheetState + (expanded ? ' is-expanded' : '')}
            aria-label="Parking"
          >
            <div
              className="moo-sheet__handle"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              role="button"
              tabIndex={0}
              aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((x) => !x)}
            >
              <span />
            </div>

            <div className="moo-sheet__body" key={sheetState + (selectedId || '')}>
              {sheetState === 'home' && <Home status={status} error={error} locate={locate} startPin={startPin} />}

              {sheetState === 'pin' && (
                <div className="moo-pinbar">
                  <div>
                    <h2 className="moo-h2">Drop a pin</h2>
                    <p className="moo-muted">Drag the map until the pin is where you&apos;re headed.</p>
                  </div>
                  <div className="moo-pinbar__actions">
                    <button type="button" className="moo-btn moo-btn--ghost" onClick={() => setPinMode(false)}>
                      Cancel
                    </button>
                    <button type="button" className="moo-btn moo-btn--blue moo-btn--lg" onClick={confirmPin}>
                      <PinIcon size={16} /> Search here
                    </button>
                  </div>
                </div>
              )}

              {sheetState === 'results' && (
                <Results
                  origin={origin}
                  results={results}
                  revealed={revealed}
                  mode={mode}
                  setMode={setMode}
                  select={select}
                  expanded={expanded}
                  locate={locate}
                  startPin={startPin}
                  farKm={app.farKm}
                />
              )}

              {sheetState === 'zone' && (
                <ZoneSheet
                  zone={selected}
                  result={selectedResult}
                  origin={origin}
                  mode={mode}
                  setMode={setMode}
                  onBack={() => select(null)}
                  onGo={go}
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Home({ status, error, locate, startPin }) {
  const locating = status === 'locating';
  return (
    <div className="moo-home">
      <h2 className="moo-h1">Where are you parking?</h2>
      <p className="moo-muted">
        {formatCount(ZONE_META.racksKept)} racks across campus, grouped into {ZONE_META.zoneCount} spots.
      </p>
      {status === 'error' && <p className="moo-alert">{error}</p>}
      <button type="button" className="moo-btn moo-btn--blue moo-btn--xl moo-btn--block" onClick={locate} disabled={locating}>
        {locating ? <span className="moo-spinner moo-spinner--light" /> : <LocateIcon size={18} />}
        {locating ? 'Finding you…' : status === 'error' ? 'Try again' : 'Find parking near me'}
      </button>
      <button type="button" className="moo-linkbtn" onClick={startPin}>
        <PinIcon size={15} /> or drop a pin somewhere else
      </button>
    </div>
  );
}

function Results({ origin, results, revealed, mode, setMode, select, expanded, locate, startPin, farKm }) {
  const fromPin = origin.kind === 'pin';
  return (
    <div className="moo-results">
      <div className="moo-results__head">
        <div>
          <h2 className="moo-h2">{fromPin ? 'Parking near your pin' : 'Parking near you'}</h2>
          <p className="moo-muted moo-small">
            {farKm ? "You're " + Math.round(farKm) + ' km from campus — drop a pin to plan ahead' : 'Closest ' + results.length + ' spots · straight-line'}
          </p>
        </div>
        <ModeToggle mode={mode} setMode={setMode} />
      </div>
      {revealed ? (
        <ol className={'moo-zlist' + (expanded ? '' : ' is-peek')}>
          {results.map((r, i) => (
            <ZoneRow
              key={r.zone.id}
              result={r}
              rank={i + 1}
              mode={mode}
              onSelect={() => select(r.zone.id)}
              style={{ '--i': i }}
            />
          ))}
        </ol>
      ) : (
        <div className="moo-scanning">
          <span className="moo-scanning__bar" />
          Scanning {formatCount(ZONE_META.racksKept)} racks…
        </div>
      )}
      <div className="moo-results__foot">
        <button type="button" className="moo-linkbtn" onClick={locate}>
          <RefreshIcon size={14} /> {fromPin ? 'Use my location' : 'Refresh'}
        </button>
        <button type="button" className="moo-linkbtn" onClick={startPin}>
          <PinIcon size={14} /> Drop a pin
        </button>
      </div>
    </div>
  );
}

function ZoneSheet({ zone, result, origin, mode, setMode, onBack, onGo }) {
  const dest = pickDestination(zone, origin);
  const into = origin ? meters(origin, dest) : null;
  return (
    <div className="moo-zone">
      <div className="moo-zone__head">
        <button type="button" className="moo-iconbtn" onClick={onBack} aria-label="Back to results">
          <ChevronLeftIcon size={20} />
        </button>
        <div className="moo-zone__title">
          <h2 className="moo-h2">{zone.name}</h2>
          {zone.area && <p className="moo-muted moo-small">{zone.area}</p>}
        </div>
        <button type="button" className="moo-iconbtn moo-iconbtn--ghost" onClick={onBack} aria-label="Close">
          <XIcon size={18} />
        </button>
      </div>

      <ZoneStats result={result} zone={zone} mode={mode} />

      <div className="moo-zone__go">
        <ModeToggle mode={mode} setMode={setMode} size="is-lg" />
        <button type="button" className="moo-btn moo-btn--blue moo-btn--xl moo-zone__start" onClick={() => onGo(zone)}>
          <LocateIcon size={18} />
          Go{result ? ' · ' + formatTravel(result.dist, mode) : ''}
        </button>
      </div>
      <p className="moo-zone__pick">
        We&apos;ll take you to the {shortType(dest.type).toLowerCase()} rack with {dest.spaces} spaces
        {into != null && result ? (into - result.dist > 10 ? ', just past the closest one' : ', the closest in this spot') : ''}.
        {origin && (
          <>
            {' '}
            <a href={navigationUrl(origin, dest, mode)} target="_blank" rel="noopener noreferrer">
              Google Maps <ExternalIcon size={11} />
            </a>
          </>
        )}
      </p>

      <RackList zone={zone} from={origin} destinationId={dest.id} onGo={(r) => onGo(zone, r)} />
    </div>
  );
}
