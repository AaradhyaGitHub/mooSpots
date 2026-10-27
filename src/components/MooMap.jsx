import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { zones, allRacks, ZONE_META } from '../lib/zones.js';
import { CAMPUS_CENTER } from '../lib/geo.js';
import { formatTravel, formatCount } from '../lib/format.js';
import {
  basemapLayer, frameTo, centerIn, meIcon, pinIcon, scanIcon, destIcon, rankIcon, zoneDotRadius
} from '../lib/map.js';

const ll = (p) => [p.lat, p.lon];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

/**
 * The one Leaflet map. Everything is drawn imperatively from props; the parent
 * drives framing through the ref: frame(points, opts), center(point, opts),
 * pointToLatLng(x, y), map.
 */
const MooMap = forwardRef(function MooMap(
  {
    basemap = 'light',
    pad = {},
    showRacks = false,
    origin = null,
    pinDropKey = 0,
    scanKey = 0,
    results = [],
    mode = 'bike',
    selectedId = null,
    labels = false,
    route = null,
    routeProgress = null,
    navPosition = null,
    navHeading = null,
    destination = null,
    follow = false,
    onZoneClick,
    onMapClick,
    onContextMenu,
    onPointer,
    onUserMove,
    className = ''
  },
  ref
) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({});
  const handlers = useRef({});
  handlers.current = { onZoneClick, onMapClick, onContextMenu, onPointer, onUserMove };
  const padRef = useRef(pad);
  padRef.current = pad;

  useImperativeHandle(ref, () => ({
    get map() {
      return mapRef.current;
    },
    frame: (points, opts = {}) => frameTo(mapRef.current, points, { pad: padRef.current, ...opts }),
    center: (point, opts = {}) => centerIn(mapRef.current, point, { pad: padRef.current, ...opts }),
    pointToLatLng: (x, y) => {
      const p = mapRef.current.containerPointToLatLng([x, y]);
      return { lat: p.lat, lon: p.lng };
    },
    zoomBy: (d) => mapRef.current.setZoom(mapRef.current.getZoom() + d)
  }));

  // --- Map + static zone layer ------------------------------------------------
  useEffect(() => {
    const map = L.map(nodeRef.current, {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      minZoom: 12,
      maxZoom: 20,
      maxBounds: [[38.48, -121.84], [38.6, -121.66]],
      maxBoundsViscosity: 0.8
    }).setView(ll(CAMPUS_CENTER), 15.5);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;

    const racksCanvas = L.canvas({ padding: 0.3 });

    // Hulls: the footprint of each parking area. Only drawn when zoomed in.
    const hulls = {};
    const dots = {};
    zones.forEach((z) => {
      hulls[z.id] = L.polygon(z.hull, {
        className: 'moo-hull',
        weight: 1.5,
        interactive: true,
        smoothFactor: 0.5
      })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handlers.current.onZoneClick?.(z.id);
        })
        .addTo(map);
      dots[z.id] = L.circleMarker(ll(z.center), {
        className: 'moo-zdot',
        radius: zoneDotRadius(z.spaces),
        weight: 2
      })
        .bindTooltip(
          '<strong>' + esc(z.name) + '</strong>' + (z.area ? '<em>' + esc(z.area) + '</em>' : '') +
            '<span>' + formatCount(z.spaces) + ' spaces · ' + z.racks.length + ' racks</span>',
          { direction: 'top', offset: [0, -8], className: 'moo-tip', opacity: 1 }
        )
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handlers.current.onZoneClick?.(z.id);
        })
        .addTo(map);
    });
    layers.current.hulls = hulls;
    layers.current.dots = dots;

    // Every rack, as a tiny dot — for the GIS view's "Individual racks" layer.
    layers.current.racks = L.layerGroup(
      allRacks.map((r) =>
        L.circleMarker(ll(r), {
          renderer: racksCanvas,
          radius: 2.6,
          weight: 1,
          color: '#ffffff',
          fillColor: '#3d4f66',
          fillOpacity: 0.9,
          interactive: false
        })
      )
    );

    const zoomClass = () => {
      const z = map.getZoom();
      const el = nodeRef.current;
      el.classList.toggle('z-near', z >= 16);
      el.classList.toggle('z-close', z >= 17.5);
      el.classList.toggle('z-far', z < 14.5);
    };
    map.on('zoomend', zoomClass);
    zoomClass();

    map.on('click', (e) => handlers.current.onMapClick?.({ lat: e.latlng.lat, lon: e.latlng.lng }));
    map.on('contextmenu', (e) => handlers.current.onContextMenu?.({ lat: e.latlng.lat, lon: e.latlng.lng }));
    map.on('mousemove', (e) => handlers.current.onPointer?.({ lat: e.latlng.lat, lon: e.latlng.lng, zoom: map.getZoom() }));
    map.on('zoomend', () => {
      const c = map.getCenter();
      handlers.current.onPointer?.({ lat: c.lat, lon: c.lng, zoom: map.getZoom(), fromZoom: true });
    });
    map.on('dragstart', () => handlers.current.onUserMove?.());

    // Fonts or panels can settle after mount; nudge Leaflet to re-measure.
    const settle = setTimeout(() => map.invalidateSize(), 260);
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(nodeRef.current);

    return () => {
      clearTimeout(settle);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Basemap --------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const tiles = basemapLayer(basemap).addTo(map);
    tiles.bringToBack();
    nodeRef.current.dataset.basemap = basemap;
    return () => tiles.remove();
  }, [basemap]);

  // --- Individual racks layer -------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const g = layers.current.racks;
    if (showRacks) g.addTo(map);
    else g.remove();
  }, [showRacks]);

  // --- Zone highlight state ---------------------------------------------------
  useEffect(() => {
    const ids = new Set(results.map((r) => r.zone.id));
    const any = ids.size > 0;
    for (const z of zones) {
      const cls = (any && !ids.has(z.id) ? ' is-dim' : '') + (ids.has(z.id) ? ' is-result' : '') + (z.id === selectedId ? ' is-selected' : '');
      const h = layers.current.hulls[z.id];
      const d = layers.current.dots[z.id];
      // Leaflet only applies className at creation; patch the SVG node.
      h.getElement()?.setAttribute('class', 'leaflet-interactive moo-hull' + cls);
      d.getElement()?.setAttribute('class', 'leaflet-interactive moo-zdot' + cls);
      if (z.id === selectedId) {
        h.bringToFront();
        d.bringToFront();
      }
    }
  }, [results, selectedId]);

  // --- Origin: GPS dot or dropped pin ------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!origin || navPosition) return;
    const isPin = origin.kind === 'pin';
    const marker = L.marker(ll(origin), {
      icon: isPin ? pinIcon(true) : meIcon(),
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000
    }).addTo(map);
    let halo;
    if (!isPin && origin.accuracy && origin.accuracy < 400) {
      halo = L.circle(ll(origin), { radius: origin.accuracy, className: 'moo-accuracy', interactive: false }).addTo(map);
    }
    return () => {
      marker.remove();
      halo?.remove();
    };
    // pinDropKey replays the drop animation on repeated drops at the same spot.
  }, [origin, pinDropKey, navPosition]);

  // --- Scan effect -------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!scanKey || !origin) return;
    const fx = L.marker(ll(origin), {
      icon: scanIcon(formatCount(ZONE_META.racksKept), ZONE_META.zoneCount),
      interactive: false,
      keyboard: false,
      zIndexOffset: -100
    }).addTo(map);
    const t = setTimeout(() => fx.remove(), 2400);
    return () => {
      clearTimeout(t);
      fx.remove();
    };
  }, [scanKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Results: rank pins, beams and labels -----------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!results.length || route) return;
    const items = [];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    results.forEach((r, i) => {
      const delay = reduce ? 0 : (labels ? 900 : 250) + i * 140;
      const selected = r.zone.id === selectedId;
      // A beam from the origin to each result — only in the GIS reveal.
      if (labels && origin) {
        const beam = L.polyline([ll(origin), ll(r.nearest)], {
          className: 'moo-beam',
          weight: 1.5,
          interactive: false
        }).addTo(map);
        beam.getElement()?.style.setProperty('animation-delay', delay - 300 + 'ms');
        items.push(beam);
      }
      const pin = L.marker(ll(r.zone.center), {
        icon: rankIcon(i + 1, (selected ? 'is-selected ' : '') + (reduce ? '' : 'is-entering')),
        zIndexOffset: selected ? 1600 : 1400 - i,
        keyboard: false,
        riseOnHover: true
      })
        .on('click', () => handlers.current.onZoneClick?.(r.zone.id))
        .addTo(map);
      pin.getElement()?.style.setProperty('--d', delay + 'ms');
      if (labels || selected) {
        pin.bindTooltip(
          '<div class="moo-label" style="--d:' + (delay + 120) + 'ms">' +
            '<strong>' + esc(r.zone.name) + '</strong>' +
            '<span>' + formatTravel(r.dist, mode) + ' ' + mode + ' · ' + formatCount(r.zone.spaces) + ' spaces</span></div>',
          { permanent: true, direction: 'right', offset: [14, 0], className: 'moo-labelwrap', interactive: true }
        );
        pin.getTooltip()?.on?.('click', () => handlers.current.onZoneClick?.(r.zone.id));
      }
      items.push(pin);
    });
    return () => items.forEach((m) => m.remove());
  }, [results, selectedId, labels, mode, route]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Route --------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!route) return;
    const pts = route.coords.map(ll);
    const casing = L.polyline(pts, { className: 'moo-route-casing', weight: 11, interactive: false }).addTo(map);
    const line = L.polyline(pts, {
      className: 'moo-route' + (route.routed ? '' : ' is-straight'),
      weight: 6,
      interactive: false
    }).addTo(map);
    layers.current.route = { casing, line };
    return () => {
      casing.remove();
      line.remove();
      layers.current.route = null;
      layers.current.done?.remove();
      layers.current.done = null;
    };
  }, [route]);

  // Travelled part of the route, greyed out.
  useEffect(() => {
    const map = mapRef.current;
    layers.current.done?.remove();
    layers.current.done = null;
    if (!route || !routeProgress || routeProgress.along < 2) return;
    const pts = [];
    for (let i = 0; i < route.coords.length && route.cum[i] <= routeProgress.along; i++) pts.push(ll(route.coords[i]));
    if (navPosition) pts.push(ll(navPosition));
    if (pts.length > 1) {
      layers.current.done = L.polyline(pts, { className: 'moo-route-done', weight: 6, interactive: false }).addTo(map);
    }
  }, [route, routeProgress, navPosition]);

  // --- Destination rack ------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!destination) return;
    const m = L.marker(ll(destination), { icon: destIcon(), interactive: false, zIndexOffset: 1800 }).addTo(map);
    return () => m.remove();
  }, [destination]);

  // --- Live position while navigating ---------------------------------------------
  const navMarker = useRef(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!navPosition) {
      navMarker.current?.remove();
      navMarker.current = null;
      return;
    }
    if (!navMarker.current) {
      navMarker.current = L.marker(ll(navPosition), { icon: meIcon(navHeading), interactive: false, zIndexOffset: 2200 }).addTo(map);
    } else {
      navMarker.current.setLatLng(ll(navPosition));
      navMarker.current.setIcon(meIcon(navHeading));
    }
    if (follow) centerIn(map, navPosition, { pad: padRef.current, zoom: Math.max(map.getZoom(), 17.5), animate: true });
  }, [navPosition, navHeading, follow]);

  useEffect(
    () => () => {
      navMarker.current?.remove();
      navMarker.current = null;
    },
    []
  );

  return <div className={'moo-map ' + className} ref={nodeRef} />;
});

export default MooMap;
