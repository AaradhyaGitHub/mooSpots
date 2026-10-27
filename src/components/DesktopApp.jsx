import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MooMap from './MooMap.jsx';
import NavHUD from './NavHUD.jsx';
import { GitHubLink, ModeToggle, ZoneRow, ZoneStats, RackList } from './Shared.jsx';
import {
  LocateIcon, PinIcon, ChevronLeftIcon, XIcon, ExternalIcon, LayersIcon, PlusIcon, MinusIcon, TurnIcon, CrosshairIcon
} from './Icons.jsx';
import { useNavigation } from '../hooks/useNavigation.js';
import { fetchRoute } from '../lib/route.js';
import { zoneById, pickDestination, ZONE_META, shortType } from '../lib/zones.js';
import { BASEMAPS } from '../lib/map.js';
import { formatCount, formatCoord, formatDistance, formatDuration, navigationUrl } from '../lib/format.js';

const PANEL_W = 392;
const SCAN_MS = 900;

export default function DesktopApp({ app, logoSrc }) {
  const { status, error, origin, results, selectedId, select, mode, setMode, searchToken, locate, dropPin, clear } = app;
  const mapRef = useRef(null);
  const [basemap, setBasemap] = useState('light');
  const [showRacks, setShowRacks] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [scanKey, setScanKey] = useState(0);
  const [pinDropKey, setPinDropKey] = useState(0);
  const [revealed, setRevealed] = useState(true);
  const [preview, setPreview] = useState(null); // { zone, rack, route }
  const [trip, setTrip] = useState(null);
  const [following, setFollowing] = useState(true);
  const nav = useNavigation(trip);

  // Right padding leaves room for the result labels, which sit right of their pins.
  const pad = useMemo(() => ({ top: 90, right: 250, bottom: 70, left: PANEL_W + 56 }), []);
  const selected = selectedId ? zoneById[selectedId] : null;
  const selectedResult = results.find((r) => r.zone.id === selectedId) || null;

  const drop = useCallback(
    (p) => {
      setPinMode(false);
      setPreview(null);
      setScanKey((k) => k + 1);
      setPinDropKey((k) => k + 1);
      dropPin(p);
    },
    [dropPin]
  );

  // Reveal: scan first, then results fly in while the map glides to fit them.
  useEffect(() => {
    if (!origin || !results.length) return;
    const pts = [...(app.farKm ? [] : [origin]), ...results.map((r) => r.nearest)];
    if (origin.kind === 'pin') {
      setRevealed(false);
      const t = setTimeout(() => {
        setRevealed(true);
        mapRef.current?.frame(pts, { duration: 1.8, maxZoom: 18 });
      }, SCAN_MS);
      return () => clearTimeout(t);
    }
    setRevealed(true);
    mapRef.current?.frame(pts, { duration: 1.2, maxZoom: 18 });
  }, [searchToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected || preview || trip) return;
    mapRef.current?.frame(origin ? [origin, ...selected.racks] : selected.racks, { duration: 0.9, maxZoom: 18, minSpanM: 300 });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Route preview for the GIS view: draw it, list the turns.
  const showDirections = useCallback(
    (zone, rack) => {
      const from = origin;
      const dest = rack || pickDestination(zone, from);
      const p = { zone, rack: dest, route: null, failed: false };
      setPreview(p);
      if (!from) return;
      const ctl = new AbortController();
      fetchRoute(from, dest, mode, { destinationName: zone.name, signal: ctl.signal })
        .then((route) => {
          setPreview((cur) => (cur && cur.rack.id === dest.id ? { ...cur, route } : cur));
          mapRef.current?.frame(route.coords, { duration: 1, maxZoom: 18.5 });
        })
        .catch(() => setPreview((cur) => (cur ? { ...cur, failed: true } : cur)));
    },
    [origin, mode]
  );

  // Mode changes re-route an open preview.
  useEffect(() => {
    if (preview) showDirections(preview.zone, preview.rack);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const startLive = () => {
    if (!preview) return;
    setTrip({
      to: { lat: preview.rack.lat, lon: preview.rack.lon },
      rack: preview.rack,
      name: preview.zone.name,
      zoneId: preview.zone.id,
      mode,
      from: origin?.kind === 'gps' || new URLSearchParams(location.search).has('sim') ? origin : null
    });
  };
  const endTrip = useCallback(({ fromHistory } = {}) => {
    setTrip(null);
    if (!fromHistory && history.state?.mooNav) history.back();
  }, []);

  // Escape backs out one level.
  useEffect(() => {
    if (trip) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (pinMode) setPinMode(false);
      else if (layersOpen) setLayersOpen(false);
      else if (preview) setPreview(null);
      else if (selectedId) select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinMode, layersOpen, preview, selectedId, select, trip]);

  // The dark basemap flips the chrome too.
  useEffect(() => {
    document.documentElement.dataset.theme = basemap === 'dark' ? 'dark' : 'light';
    return () => delete document.documentElement.dataset.theme;
  }, [basemap]);

  const view = preview ? 'directions' : selected ? 'zone' : origin && results.length ? 'results' : 'home';
  const routeShown = trip ? nav.route : preview?.route || null;

  return (
    <div className={'moo-desk' + (pinMode ? ' is-pinning' : '') + (trip ? ' is-navigating' : '')}>
      <MooMap
        ref={mapRef}
        className={pinMode ? 'is-crosshair' : ''}
        basemap={basemap}
        pad={pad}
        showRacks={showRacks}
        origin={origin}
        pinDropKey={pinDropKey}
        scanKey={scanKey}
        results={revealed && !trip ? results : []}
        labels={!selected && !preview}
        mode={mode}
        selectedId={trip ? trip.zoneId : preview ? preview.zone.id : selectedId}
        route={routeShown}
        routeProgress={trip ? nav.progress : null}
        navPosition={trip ? nav.position : null}
        navHeading={nav.heading}
        destination={trip ? trip.to : preview ? preview.rack : null}
        follow={!!trip && following}
        onPointer={setCursor}
        onUserMove={() => trip && setFollowing(false)}
        onMapClick={(p) => {
          if (pinMode) drop(p);
          setLayersOpen(false);
        }}
        onContextMenu={(p) => !trip && drop(p)}
        onZoneClick={(id) => {
          if (pinMode || trip) return;
          setPreview(null);
          select(id);
        }}
      />

      {trip ? (
        <div className="moo-desk__nav">
          <NavHUD trip={trip} nav={nav} onEnd={endTrip} following={following} onRecenter={() => setFollowing(true)} />
        </div>
      ) : (
        <aside className="moo-panel" style={{ width: PANEL_W }}>
          <header className="moo-panel__head">
            <img src={logoSrc} alt="" className="moo-panel__logo" />
            <div className="moo-panel__brand">
              <h1>mooSpots</h1>
              <p>UC Davis bike parking map</p>
            </div>
            <GitHubLink label className="moo-gh--chip" />
          </header>

          <div className="moo-tools" role="toolbar" aria-label="Search">
            <button type="button" className={'moo-tool' + (status === 'locating' ? ' is-busy' : '')} onClick={locate}>
              {status === 'locating' ? <span className="moo-spinner" /> : <LocateIcon size={17} />}
              <span>
                <b>Near me</b>
                <small>Use my location</small>
              </span>
            </button>
            <button
              type="button"
              className={'moo-tool' + (pinMode ? ' is-active' : '')}
              onClick={() => setPinMode((x) => !x)}
              aria-pressed={pinMode}
            >
              <PinIcon size={17} />
              <span>
                <b>Drop a pin</b>
                <small>{pinMode ? 'Click the map…' : 'Anywhere on campus'}</small>
              </span>
            </button>
          </div>
          {status === 'error' && <p className="moo-alert moo-panel__alert">{error}</p>}

          <div className="moo-panel__body" key={view + (selectedId || '') + (preview?.rack.id || '')}>
            {view === 'home' && <DeskHome />}
            {view === 'results' && (
              <>
                <OriginLine origin={origin} onClear={clear} />
                {app.farKm > 0 && (
                  <p className="moo-alert">
                    You&apos;re {Math.round(app.farKm)} km from campus. Drop a pin on campus to plan a trip.
                  </p>
                )}
                <div className="moo-panel__row">
                  <h2 className="moo-h3">Closest parking</h2>
                  <ModeToggle mode={mode} setMode={setMode} />
                </div>
                {revealed ? (
                  <ol className="moo-zlist">
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
                    Scanning {formatCount(ZONE_META.racksKept)} racks in {ZONE_META.zoneCount} areas…
                  </div>
                )}
              </>
            )}
            {view === 'zone' && (
              <DeskZone
                zone={selected}
                result={selectedResult}
                origin={origin}
                mode={mode}
                setMode={setMode}
                onBack={() => select(null)}
                onDirections={showDirections}
              />
            )}
            {view === 'directions' && (
              <Directions
                preview={preview}
                origin={origin}
                mode={mode}
                setMode={setMode}
                onBack={() => setPreview(null)}
                onLive={startLive}
              />
            )}
          </div>

          <footer className="moo-panel__foot">
            Right-click anywhere to search there · <kbd>Esc</kbd> to go back
          </footer>
        </aside>
      )}

      {pinMode && (
        <div className="moo-hint" role="status">
          <PinIcon size={15} /> Click anywhere to drop a pin
          <button type="button" onClick={() => setPinMode(false)}>
            Esc
          </button>
        </div>
      )}

      {!trip && (
        <div className="moo-layers">
          <button
            type="button"
            className={'moo-ctl' + (layersOpen ? ' is-active' : '')}
            onClick={() => setLayersOpen((x) => !x)}
            aria-expanded={layersOpen}
            aria-label="Map layers"
            title="Map layers"
          >
            <LayersIcon size={18} />
          </button>
          {layersOpen && (
            <div className="moo-layers__pop" role="dialog" aria-label="Map layers">
              <p className="moo-eyebrow">Basemap</p>
              <div className="moo-basemaps">
                {Object.entries(BASEMAPS).map(([key, b]) => (
                  <button
                    key={key}
                    type="button"
                    className={'moo-basemap moo-basemap--' + key + (basemap === key ? ' is-active' : '')}
                    onClick={() => setBasemap(key)}
                    aria-pressed={basemap === key}
                  >
                    <span className="moo-basemap__swatch" />
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="moo-eyebrow">Overlays</p>
              <label className="moo-check">
                <input type="checkbox" checked readOnly disabled />
                <span>
                  Parking spots <small>{ZONE_META.zoneCount} areas, sized by spaces</small>
                </span>
              </label>
              <label className="moo-check">
                <input type="checkbox" checked={showRacks} onChange={(e) => setShowRacks(e.target.checked)} />
                <span>
                  Individual racks <small>{formatCount(ZONE_META.racksKept)} points</small>
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="moo-zoom">
        <button type="button" className="moo-ctl" onClick={() => mapRef.current?.zoomBy(1)} aria-label="Zoom in">
          <PlusIcon size={18} />
        </button>
        <button type="button" className="moo-ctl" onClick={() => mapRef.current?.zoomBy(-1)} aria-label="Zoom out">
          <MinusIcon size={18} />
        </button>
        <button
          type="button"
          className="moo-ctl moo-ctl--gap"
          onClick={() => (trip ? setFollowing(true) : origin ? mapRef.current?.center(origin, { zoom: 18 }) : locate())}
          aria-label="Center on location"
          title="Center on location"
        >
          <CrosshairIcon size={17} />
        </button>
      </div>

      <div className="moo-status" style={{ left: trip ? 16 : PANEL_W + 32 }}>
        <span className="moo-status__coord">{cursor ? formatCoord(cursor.lat, cursor.lon) : '—'}</span>
        <span>z{cursor ? cursor.zoom.toFixed(1) : '15.5'}</span>
        <span className="moo-status__sep" />
        <span>{ZONE_META.zoneCount} areas</span>
        <span>{formatCount(ZONE_META.racksKept)} racks</span>
        <span>{formatCount(ZONE_META.totalSpaces)} spaces</span>
      </div>
    </div>
  );
}

function DeskHome() {
  return (
    <div className="moo-dhome">
      <dl className="moo-tiles">
        <div>
          <dt>Spots</dt>
          <dd>{ZONE_META.zoneCount}</dd>
        </div>
        <div>
          <dt>Racks</dt>
          <dd>{formatCount(ZONE_META.racksKept)}</dd>
        </div>
        <div>
          <dt>Spaces</dt>
          <dd>{formatCount(ZONE_META.totalSpaces)}</dd>
        </div>
      </dl>
      <ol className="moo-how">
        <li>
          <b>Pick a starting point.</b> Your location, or drop a pin on any building.
        </li>
        <li>
          <b>We scan every rack</b> and rank the closest parking spots, each a cluster of racks within ~140 m.
        </li>
        <li>
          <b>Choose one.</b> We route you to its best rack. Individual racks are one click deeper.
        </li>
      </ol>
      <div className="moo-legend">
        <p className="moo-eyebrow">Legend</p>
        <ul>
          <li>
            <span className="moo-legend__dot" /> Parking spot, sized by spaces
          </li>
          <li>
            <span className="moo-legend__rank">1</span> Closest result
          </li>
          <li>
            <span className="moo-legend__hull" /> Spot footprint (zoom in)
          </li>
        </ul>
      </div>
      <p className="moo-muted moo-small">
        Dropped {ZONE_META.dropped.noSpaces + ZONE_META.dropped.removed} inventory entries with no usable spaces.
        Distances are straight-line; directions use OpenStreetMap paths.
      </p>
    </div>
  );
}

function OriginLine({ origin, onClear }) {
  return (
    <div className="moo-origin">
      <span className={'moo-origin__badge' + (origin.kind === 'pin' ? ' is-pin' : '')}>
        {origin.kind === 'pin' ? <PinIcon size={13} /> : <LocateIcon size={13} />}
        {origin.kind === 'pin' ? 'Pin' : 'You'}
      </span>
      <code>{formatCoord(origin.lat, origin.lon)}</code>
      {origin.accuracy ? <span className="moo-muted moo-small">±{Math.round(origin.accuracy)} m</span> : null}
      <button type="button" className="moo-iconbtn moo-iconbtn--ghost moo-iconbtn--sm" onClick={onClear} aria-label="Clear search">
        <XIcon size={14} />
      </button>
    </div>
  );
}

function DeskZone({ zone, result, origin, mode, setMode, onBack, onDirections }) {
  const dest = pickDestination(zone, origin);
  return (
    <div className="moo-zone">
      <div className="moo-zone__head">
        <button type="button" className="moo-iconbtn" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon size={20} />
        </button>
        <div className="moo-zone__title">
          <h2 className="moo-h2">{zone.name}</h2>
          <p className="moo-muted moo-small">
            {zone.area ? zone.area + ' · ' : ''}
            Mostly {shortType(zone.mainType).toLowerCase()} racks · {zone.radius * 2} m across
          </p>
        </div>
      </div>
      <ZoneStats result={result} zone={zone} mode={mode} />
      {origin ? (
        <div className="moo-zone__go">
          <ModeToggle mode={mode} setMode={setMode} />
          <button type="button" className="moo-btn moo-btn--blue moo-btn--lg moo-zone__start" onClick={() => onDirections(zone)}>
            <TurnIcon modifier="right" size={16} /> Directions
          </button>
        </div>
      ) : (
        <p className="moo-muted moo-small">Search from your location or a pin to get directions here.</p>
      )}
      {origin && (
        <p className="moo-zone__pick">
          Best rack: {shortType(dest.type).toLowerCase()}, {dest.spaces} spaces.
        </p>
      )}
      <RackList zone={zone} from={origin} destinationId={dest.id} onGo={(r) => onDirections(zone, r)} defaultOpen mode={mode} />
    </div>
  );
}

function Directions({ preview, origin, mode, setMode, onBack, onLive }) {
  const { zone, rack, route, failed } = preview;
  return (
    <div className="moo-dirs">
      <div className="moo-zone__head">
        <button type="button" className="moo-iconbtn" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon size={20} />
        </button>
        <div className="moo-zone__title">
          <p className="moo-eyebrow">Directions to</p>
          <h2 className="moo-h2">{zone.name}</h2>
          <p className="moo-muted moo-small">
            {shortType(rack.type)} rack · {rack.spaces} spaces
          </p>
        </div>
      </div>
      <div className="moo-panel__row">
        <p className="moo-dirs__total">
          {route ? (
            <>
              <b>{formatDuration(route.duration)}</b> · {formatDistance(route.distance)}
            </>
          ) : failed ? (
            'Route unavailable'
          ) : (
            <span className="moo-shimmer">Routing…</span>
          )}
        </p>
        <ModeToggle mode={mode} setMode={setMode} />
      </div>
      {route && (
        <ol className="moo-steps">
          {route.steps.map((s, i) => (
            <li key={i} style={{ '--i': i }}>
              <span className="moo-steps__icon">
                <TurnIcon modifier={s.modifier} kind={s.kind} size={18} />
              </span>
              <span className="moo-steps__text">{s.text}</span>
              <span className="moo-steps__dist">
                {i < route.steps.length - 1 ? formatDistance(route.steps[i + 1].at - s.at) : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
      {route && !route.routed && <p className="moo-muted moo-small">No path data here, so this is a straight line.</p>}
      <div className="moo-dirs__actions">
        <button type="button" className="moo-btn moo-btn--blue moo-btn--block" onClick={onLive} disabled={!route}>
          <LocateIcon size={15} /> Start live directions
        </button>
        <a className="moo-btn moo-btn--outline moo-btn--block" href={navigationUrl(origin, rack, mode)} target="_blank" rel="noopener noreferrer">
          Google Maps <ExternalIcon size={13} />
        </a>
      </div>
    </div>
  );
}
