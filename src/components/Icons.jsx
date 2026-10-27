// Lucide-style inline icons on a 24x24 grid. Size is set by the caller.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

const icon = (children) =>
  function Icon({ size = 16, strokeWidth }) {
    return (
      <svg {...base} width={size} height={size} strokeWidth={strokeWidth ?? base.strokeWidth}>
        {children}
      </svg>
    );
  };

export const RefreshIcon = icon(
  <>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </>
);

export const CrosshairIcon = icon(
  <>
    <line x1="2" x2="5" y1="12" y2="12" />
    <line x1="19" x2="22" y1="12" y2="12" />
    <line x1="12" x2="12" y1="2" y2="5" />
    <line x1="12" x2="12" y1="19" y2="22" />
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="3" />
  </>
);

export const LocateIcon = icon(<polygon points="3 11 22 2 13 21 11 13 3 11" />);
export const NavigateIcon = LocateIcon;

export const BikeIcon = icon(
  <>
    <circle cx="18.5" cy="17.5" r="3.5" />
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="15" cy="5" r="1" />
    <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
  </>
);

export const WalkIcon = icon(
  <>
    <circle cx="13" cy="4" r="1.6" />
    <path d="m11 20 2-5-3-3 1-4 3 3 2 1" />
    <path d="m9 12-2 8" />
  </>
);

export const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);

export const PinIcon = icon(
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </>
);

export const XIcon = icon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);

export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />);
export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);

export const PlusIcon = icon(
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>
);

export const MinusIcon = icon(<path d="M5 12h14" />);

export const LayersIcon = icon(
  <>
    <path d="m12 2 10 5-10 5L2 7l10-5Z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </>
);

export const ExternalIcon = icon(
  <>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </>
);

export const ArrowUpIcon = icon(
  <>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </>
);

export const SpacesIcon = icon(
  <>
    <path d="M3 20h18" />
    <path d="M6 20v-9" />
    <path d="M10 20v-9" />
    <path d="M14 20v-9" />
    <path d="M18 20v-9" />
    <path d="M4 11h16" />
  </>
);

// GitHub mark, filled — it's a logo, not a line icon.
export function GitHubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

// Turn arrows for the navigation banner, keyed by OSRM modifier.
const TURN_PATHS = {
  straight: ['M12 21V4', 'm6 10 6-6 6 6'],
  left: ['M17 21v-8a4 4 0 0 0-4-4H5', 'm9 5-4 4 4 4'],
  right: ['M7 21v-8a4 4 0 0 1 4-4h8', 'm15 5 4 4-4 4'],
  'slight left': ['M15 21v-6L8 8', 'M8 14V8h6'],
  'slight right': ['M9 21v-6l7-7', 'M10 8h6v6'],
  'sharp left': ['M16 4v9a4 4 0 0 1-4 4H6', 'M5 10v7h7'],
  'sharp right': ['M8 4v9a4 4 0 0 0 4 4h6', 'M19 10v7h-7'],
  uturn: ['M8 21V9a5 5 0 0 1 10 0v4', 'm14 10 4 4 4-4']
};

export function TurnIcon({ modifier = 'straight', kind, size = 34 }) {
  if (kind === 'arrive') {
    return (
      <svg {...base} width={size} height={size}>
        <path d="M5 21V4h11l-2 4 2 4H5" />
      </svg>
    );
  }
  // A departure has no turn to make yet, whatever OSRM's modifier says.
  const paths = (kind !== 'depart' && TURN_PATHS[modifier]) || TURN_PATHS.straight;
  return (
    <svg {...base} width={size} height={size}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
