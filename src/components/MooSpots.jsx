import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RackCard from './RackCard.jsx';
import { RefreshIcon, CrosshairIcon } from './Icons.jsx';
import { useNearestRacks } from '../hooks/useNearestRacks.js';
import { CAMPUS_CENTER } from '../lib/geo.js';
import { formatDistance, navigationUrl } from '../lib/format.js';
import '../styles/tokens.css';
import '../styles/moospots.css';

const TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

const meIcon = () =>
  L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="moo-pin-me"></div>' });

const rackIcon = (n, selected) =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: '<div class="moo-pin' + (selected ? ' is-selected' : '') + '">' + n + '</div>'
  });

export default function MooSpots({ racks = [], resultCount = 6, logoSrc = '/logo8.png' }) {
  const {
    status, errorMessage, position, places, count, hasResults,
    selectedId, setSelectedId, frameToken, locate, useCampusSpot
  } = useNearestRacks(racks, resultCount);

  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const meRef = useRef(null);

  // Keep the click handler current without tearing down markers every render.
  const selectRef = useRef(setSelectedId);
  selectRef.current = setSelectedId;

  // Read-only latest values for use inside marker callbacks and popup content.
  const positionRef = useRef(position);
  positionRef.current = position;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // A rack pin's popup: distance, spaces and a Navigate button. Built with the
  // DOM so the button can carry a real click handler.
  const buildPopup = (place, rank) => {
    const el = document.createElement('div');
    el.className = 'moo-popup';
    const title = place.title || place.rack_type || 'Bike rack';
    el.innerHTML =
      '<div class="moo-popup__head">' +
        '<span class="moo-popup__rank">' + rank + '</span>' +
        '<div class="moo-popup__meta">' +
          '<p class="moo-popup__title"></p>' +
          '<p class="moo-popup__sub">' + (place.rack_spaces ?? '?') + ' spaces</p>' +
        '</div>' +
        '<span class="moo-popup__distance">' + formatDistance(place.distance) + '</span>' +
      '</div>';
    el.querySelector('.moo-popup__title').textContent = title;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'moo-btn moo-btn--gold moo-btn--block moo-popup__nav';
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg><span>Navigate</span>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pos = positionRef.current;
      if (pos) window.open(navigationUrl(pos, place), '_blank', 'noopener');
    });
    el.appendChild(btn);
    return el;
  };

  useEffect(() => {
    if (mapRef.current || !nodeRef.current) return;
    const map = L.map(nodeRef.current, { zoomControl: true, attributionControl: true })
      .setView([CAMPUS_CENTER.lat, CAMPUS_CENTER.lon], 15);
    L.tileLayer(TILES, { attribution: 'Tiles &copy; Esri', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build the me-pin and one marker per rack. Not tied to selection, so an open
  // popup survives a selection change (which only restyles the pins below).
  // Each marker carries a bound popup; Leaflet opens it on click and closes it
  // when you click the map, another pin, or anywhere outside the popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];
    if (meRef.current) {
      meRef.current.remove();
      meRef.current = null;
    }
    if (!position || !places.length) return;

    meRef.current = L.marker([position.lat, position.lon], {
      icon: meIcon(),
      interactive: false,
      zIndexOffset: -500
    }).addTo(map);

    places.forEach((p, i) => {
      const selected = p.id === selectedIdRef.current;
      const marker = L.marker([p.lat, p.lon], {
        icon: rackIcon(i + 1, selected),
        zIndexOffset: selected ? 1200 : 600,
        keyboard: false
      }).addTo(map);
      marker.bindPopup(buildPopup(p, i + 1), {
        closeButton: false,
        offset: [0, -6],
        className: 'moo-popup-wrap',
        autoPanPadding: [24, 24]
      });
      marker.on('click', () => selectRef.current(p.id));
      markersRef.current.push({ id: p.id, marker });
    });
  }, [places, position]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect the current selection on the pins without rebuilding them.
  useEffect(() => {
    markersRef.current.forEach(({ id, marker }, i) => {
      const selected = id === selectedId;
      marker.setIcon(rackIcon(i + 1, selected));
      marker.setZIndexOffset(selected ? 1200 : 600);
    });
  }, [selectedId, places]);

  // Frame the whole result set.
  //
  // Deliberately NOT fitBounds/getBoundsZoom: both need a settled container and
  // silently no-op on the first results render, which leaves the map stuck at
  // the initial zoom. Web-Mercator math has no such dependency.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !places.length) return;

    const frame = () => {
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      const half = Math.max(60, Math.min(size.x, size.y) / 2 - 34);
      const maxKm = places.reduce((a, p) => Math.max(a, p.distance || 0), 0);
      const metersPerPixel = Math.max(40, maxKm * 1000 * 1.1) / half;
      const z = Math.log2(
        (156543.03392 * Math.cos((position.lat * Math.PI) / 180)) / metersPerPixel
      );
      map.setView(
        [position.lat, position.lon],
        Math.min(19, Math.max(14, Math.round(Number.isFinite(z) ? z : 17))),
        { animate: false }
      );
    };

    const raf = requestAnimationFrame(frame);
    const settle = setTimeout(frame, 260); // second pass once fonts/layout land
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [frameToken, position, places]);

  // Pan to whichever rack is selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const p = places.find((x) => x.id === selectedId);
    if (p) map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17), { animate: true });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenter = () => {
    if (mapRef.current && position) {
      mapRef.current.setView([position.lat, position.lon], 18, { animate: true });
    }
  };

  const veil = {
    idle: {
      title: 'Find the closest bike rack',
      text: "Share your location and we'll rank the " + count + ' nearest racks on campus.'
    },
    loading: { title: 'Finding your spot', text: 'Checking which racks are closest to you.' },
    error: { title: "Couldn't get your location", text: errorMessage }
  }[status] || { title: '', text: '' };

  return (
    <div className="moo">
      <header className="moo-header">
        <img className="moo-header__logo" src={logoSrc} alt="" />
        <div className="moo-header__text">
          <h1 className="moo-header__title">mooSpots</h1>
          <p className="moo-header__sub">Bike parking near you · UC Davis</p>
        </div>
        {hasResults && (
          <button type="button" className="moo-btn moo-btn--outline moo-header__action" onClick={locate}>
            <RefreshIcon />
            Refresh
          </button>
        )}
      </header>

      <div className="moo-map">
        <div className="moo-map__canvas" ref={nodeRef} />

        {hasResults && (
          <div className="moo-map__controls">
            <button type="button" className="moo-btn moo-btn--gold" onClick={recenter}>
              <CrosshairIcon />
              Recenter
            </button>
          </div>
        )}

        {!hasResults && (
          <div className="moo-veil">
            {status === 'loading' && <div className="moo-spinner" />}
            <h2 className="moo-veil__title">{veil.title}</h2>
            <p className="moo-veil__text">{veil.text}</p>
            {status !== 'loading' && (
              <div className="moo-veil__actions">
                <button type="button" className="moo-btn moo-btn--blue moo-btn--lg" onClick={locate}>
                  <CrosshairIcon size={18} />
                  {status === 'error' ? 'Try again' : 'Use my location'}
                </button>
                <button type="button" className="moo-btn moo-btn--outline moo-btn--lg" onClick={useCampusSpot}>
                  Use a campus spot
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {hasResults && (
        <section>
          <div className="moo-results__head">
            <h2 className="moo-results__title">
              {status === 'demo' ? 'Racks near that spot' : count + ' closest racks'}
            </h2>
            <p className="moo-results__sub">
              {status === 'demo'
                ? 'Sample location on the west side of campus'
                : 'Straight-line distance from where you are'}
            </p>
          </div>

          <ul className="moo-cards">
            {places.map((p, i) => (
              <RackCard
                key={p.id}
                place={p}
                rank={i + 1}
                selected={p.id === selectedId}
                origin={position}
                onSelect={() => setSelectedId(p.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <footer className="moo-footer">
        Rack data from the UC Davis bike parking inventory · {racks.length} racks mapped
      </footer>
    </div>
  );
}
