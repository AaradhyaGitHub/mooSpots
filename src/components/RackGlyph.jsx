// Schematic side-elevation of each rack profile, drawn on Lucide's 24x24 grid.
// Every glyph shares the y=20 ground line so the set reads as one family.
const GLYPHS = {
  'Lightning Bolt Rack': ['M3 20h18', 'M4 20 8 8l4 12 4-12 4 12'],
  'Coat Hanger Rack': ['M3 20h18', 'M6 20v-5a2.5 2.5 0 0 1 5 0v5', 'M13 20v-5a2.5 2.5 0 0 1 5 0v5'],
  'Bike Stall': ['M3 20h18', 'M4 20V8h16v12', 'M12 20V8'],
  'Playground Rack': ['M3 20h18', 'M12 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M20 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  'Varsity Rack': ['M3 20h18', 'M5 20l3-10 3 10', 'M13 20l3-10 3 10'],
  'Wave Rack': ['M3 20h18', 'M3 20a4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1 9 0'],
  'Concrete Pod': ['M3 20h18', 'M4 20a8 8 0 0 1 16 0', 'M9 20v-4', 'M15 20v-4'],
  'Bike Locker': ['M3 20h18', 'M4 20V6h16v14', 'M12 6v14', 'M8 13h1.5', 'M14.5 13H16']
};

const FALLBACK = [
  'M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  'M22 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  'M12 18V13l-3-3 4-3 2 3h2'
];

export default function RackGlyph({ type, size = 42 }) {
  const paths = GLYPHS[type] || FALLBACK;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
