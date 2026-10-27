import L from 'leaflet';

// Keyless basemaps. Esri's street map has the campus paths and building names
// riders need; CSS filters (see .moo-tiles--*) mute it into a quiet, Uber-ish
// canvas so our data reads first, or flip it dark for the GIS view.
const ESRI_STREETS = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
export const BASEMAPS = {
  light: { label: 'Streets', url: ESRI_STREETS, attribution: 'Tiles &copy; Esri', className: 'moo-tiles--light' },
  dark: { label: 'Dark', url: ESRI_STREETS, attribution: 'Tiles &copy; Esri', className: 'moo-tiles--dark' },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar',
    className: 'moo-tiles--sat'
  }
};

export function basemapLayer(key) {
  const b = BASEMAPS[key] || BASEMAPS.light;
  return L.tileLayer(b.url, {
    attribution: b.attribution,
    className: b.className,
    maxZoom: 20,
    maxNativeZoom: 19
  });
}

const ll = (p) => L.latLng(p.lat, p.lon);

/**
 * Frame a set of points inside the part of the map that isn't covered by UI.
 *
 * Deliberately NOT fitBounds/getBoundsZoom: both need a settled container and
 * silently no-op on a first render, leaving the map stuck. map.project() only
 * needs the CRS, so this works whenever the container has a size at all.
 *
 * pad: { top, right, bottom, left } in px — the panel or sheet on that side.
 */
export function frameTo(map, points, { pad = {}, maxZoom = 18, minZoom = 13, duration = 0, minSpanM = 60 } = {}) {
  if (!map || !points.length) return;
  map.invalidateSize({ animate: false });
  const size = map.getSize();
  const p = { top: 24, right: 24, bottom: 24, left: 24, ...pad };
  const w = Math.max(80, size.x - p.left - p.right);
  const h = Math.max(80, size.y - p.top - p.bottom);

  const px = points.map((pt) => map.project(ll(pt), 0));
  const minX = Math.min(...px.map((q) => q.x));
  const maxX = Math.max(...px.map((q) => q.x));
  const minY = Math.min(...px.map((q) => q.y));
  const maxY = Math.max(...px.map((q) => q.y));

  // Never zoom in past a minimum real-world span, so one point isn't street-level.
  const lat = points[0].lat;
  const mPerPx0 = 156543.03392 * Math.cos((lat * Math.PI) / 180);
  const minSpan0 = minSpanM / mPerPx0;
  const spanX = Math.max(maxX - minX, minSpan0);
  const spanY = Math.max(maxY - minY, minSpan0);

  let z = Math.log2(Math.min(w / spanX, h / spanY));
  if (!Number.isFinite(z)) z = maxZoom;
  const snap = map.options.zoomSnap || 1;
  z = Math.floor(z / snap) * snap;
  z = Math.max(minZoom, Math.min(maxZoom, z));

  // Center of the points at zoom z, shifted so they sit in the uncovered area.
  const scale = 2 ** z;
  const cx = ((minX + maxX) / 2) * scale + (p.right - p.left) / 2;
  const cy = ((minY + maxY) / 2) * scale + (p.bottom - p.top) / 2;
  const center = map.unproject(L.point(cx, cy), z);

  if (duration > 0) map.flyTo(center, z, { duration, easeLinearity: 0.2 });
  else map.setView(center, z, { animate: false });
}

// Pan so a point sits in the middle of the uncovered area, keeping zoom.
export function centerIn(map, point, { pad = {}, zoom, animate = true } = {}) {
  const p = { top: 0, right: 0, bottom: 0, left: 0, ...pad };
  const z = zoom ?? map.getZoom();
  const c = map.project(ll(point), z).add([(p.right - p.left) / 2, (p.bottom - p.top) / 2]);
  map.setView(map.unproject(c, z), z, { animate });
}

// --- Markers -------------------------------------------------------------------

export const meIcon = (heading) =>
  L.divIcon({
    className: 'moo-leaf',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html:
      '<div class="moo-me">' +
      (heading != null ? '<div class="moo-me__cone" style="transform:rotate(' + Math.round(heading) + 'deg)"></div>' : '') +
      '<div class="moo-me__pulse"></div><div class="moo-me__dot"></div></div>'
  });

export const pinIcon = (drop = true) =>
  L.divIcon({
    className: 'moo-leaf',
    iconSize: [36, 48],
    iconAnchor: [18, 46],
    html:
      '<div class="moo-droppin' + (drop ? ' is-dropping' : '') + '">' +
      '<svg viewBox="0 0 36 48" width="36" height="48" aria-hidden="true">' +
      '<path class="moo-droppin__body" d="M18 2C9.2 2 2 9 2 17.6 2 29.4 18 46 18 46s16-16.6 16-28.4C34 9 26.8 2 18 2z"/>' +
      '<circle class="moo-droppin__eye" cx="18" cy="17.5" r="6"/></svg>' +
      '<div class="moo-droppin__shadow"></div></div>'
  });

// The scan: rings, sweep and grid that radiate out of a dropped pin.
export const scanIcon = (racks, zones) =>
  L.divIcon({
    className: 'moo-leaf moo-leaf--scan',
    iconSize: [560, 560],
    iconAnchor: [280, 280],
    html:
      '<div class="moo-scan">' +
      '<div class="moo-scan__grid"></div>' +
      '<div class="moo-scan__sweep"></div>' +
      '<div class="moo-scan__ring"></div><div class="moo-scan__ring"></div><div class="moo-scan__ring"></div>' +
      '<div class="moo-scan__tick moo-scan__tick--n"></div><div class="moo-scan__tick moo-scan__tick--e"></div>' +
      '<div class="moo-scan__tick moo-scan__tick--s"></div><div class="moo-scan__tick moo-scan__tick--w"></div>' +
      '<div class="moo-scan__label"><span>Scanning ' + racks + ' racks</span><span>' + zones + ' areas</span></div>' +
      '</div>'
  });

export const destIcon = () =>
  L.divIcon({
    className: 'moo-leaf',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: '<div class="moo-dest"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 21V4h11l-2 4 2 4H5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div>'
  });

export const rankIcon = (n, state = '') =>
  L.divIcon({
    className: 'moo-leaf',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: '<div class="moo-rankpin ' + state + '">' + n + '</div>'
  });

// Zone dots grow with capacity: area ∝ spaces.
export const zoneDotRadius = (spaces) => Math.max(4, Math.min(13, Math.sqrt(spaces) * 0.45));
