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

export function RefreshIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

export function CrosshairIcon({ size = 16 }) {
  return (
    <svg {...base} width={size} height={size}>
      <line x1="2" x2="5" y1="12" y2="12" />
      <line x1="19" x2="22" y1="12" y2="12" />
      <line x1="12" x2="12" y1="2" y2="5" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function BikeIcon({ size = 13 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  );
}

export function ClockIcon({ size = 13 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function WalkIcon({ size = 13 }) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="13" cy="4" r="1.6" />
      <path d="m11 20 2-5-3-3 1-4 3 3 2 1" />
      <path d="m9 12-2 8" />
    </svg>
  );
}

export function NavigateIcon({ size = 15 }) {
  return (
    <svg {...base} width={size} height={size}>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
