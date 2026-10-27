import { useState } from 'react';
import RackGlyph from './RackGlyph.jsx';
import {
  ArrowUpIcon, BikeIcon, WalkIcon, GitHubIcon, ChevronDownIcon, NavigateIcon, ExternalIcon
} from './Icons.jsx';
import { formatDistance, formatTravel, formatCount, navigationUrl } from '../lib/format.js';
import { compass, meters } from '../lib/geo.js';
import { racksByDistance, shortType } from '../lib/zones.js';

export const REPO_URL = 'https://github.com/AaradhyaGitHub/mooSpots';

export function GitHubLink({ className = '', label = false }) {
  return (
    <a
      className={'moo-gh ' + className}
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="mooSpots on GitHub (open source)"
      title="Open source on GitHub"
    >
      <GitHubIcon size={label ? 15 : 18} />
      {label && <span>GitHub</span>}
    </a>
  );
}

export function ModeToggle({ mode, setMode, size = '' }) {
  return (
    <div className={'moo-seg ' + size} role="radiogroup" aria-label="Travel mode">
      <span className="moo-seg__thumb" data-mode={mode} aria-hidden="true" />
      <button type="button" role="radio" aria-checked={mode === 'bike'} onClick={() => setMode('bike')}>
        <BikeIcon size={15} /> Bike
      </button>
      <button type="button" role="radio" aria-checked={mode === 'walk'} onClick={() => setMode('walk')}>
        <WalkIcon size={15} /> Walk
      </button>
    </div>
  );
}

export function Direction({ deg }) {
  return (
    <span className="moo-dir" title={'Toward the ' + compass(deg)}>
      <span className="moo-dir__arrow" style={{ transform: 'rotate(' + Math.round(deg) + 'deg)' }}>
        <ArrowUpIcon size={11} strokeWidth={3} />
      </span>
      {compass(deg)}
    </span>
  );
}

/** One parking area in a results list. */
export function ZoneRow({ result, rank, mode, selected, onSelect, style }) {
  const { zone, dist, bearing } = result;
  return (
    <li className="moo-zrow-item" style={style}>
      <button type="button" className={'moo-zrow' + (selected ? ' is-selected' : '')} onClick={onSelect}>
        <span className={'moo-zrow__rank' + (rank === 1 ? ' is-first' : '')}>{rank}</span>
        <span className="moo-zrow__main">
          <span className="moo-zrow__name">{zone.name}</span>
          <span className="moo-zrow__meta">
            {zone.area && <span className="moo-zrow__area">{zone.area} · </span>}
            {formatCount(zone.spaces)} spaces · {zone.racks.length} {zone.racks.length === 1 ? 'rack' : 'racks'}
          </span>
        </span>
        <span className="moo-zrow__trip">
          {/* Off campus, minutes stop meaning anything; just say how far. */}
          <span className="moo-zrow__time">{dist > 4000 ? formatDistance(dist) : formatTravel(dist, mode)}</span>
          <span className="moo-zrow__dist">
            {dist > 4000 ? '' : formatDistance(dist)} <Direction deg={bearing} />
          </span>
        </span>
      </button>
    </li>
  );
}

/** Stat strip for an open parking area. */
export function ZoneStats({ result, zone, mode }) {
  return (
    <dl className="moo-stats">
      {result && (
        <>
          <div>
            <dt>{mode === 'bike' ? 'Ride' : 'Walk'}</dt>
            <dd>{formatTravel(result.dist, mode)}</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>
              {formatDistance(result.dist)} <Direction deg={result.bearing} />
            </dd>
          </div>
        </>
      )}
      <div>
        <dt>Spaces</dt>
        <dd>{formatCount(zone.spaces)}</dd>
      </div>
      <div>
        <dt>Racks</dt>
        <dd>{zone.racks.length}</dd>
      </div>
    </dl>
  );
}

/**
 * Racks inside one area, closest first. Folded away by default: people pick
 * an area, the app picks the rack. This is for when you care which one.
 */
export function RackList({ zone, from, destinationId, onGo, mode, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const racks = racksByDistance(zone, from);
  return (
    <div className={'moo-racks' + (open ? ' is-open' : '')}>
      <button type="button" className="moo-racks__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>
          Individual racks <em>{racks.length}</em>
        </span>
        <ChevronDownIcon size={16} />
      </button>
      {open && (
        <ul className="moo-racks__list">
          {racks.map((r) => (
            <li key={r.id} className={r.id === destinationId ? 'is-dest' : ''}>
              <span className="moo-racks__glyph">
                <RackGlyph type={r.type} size={26} strokeWidth={2} />
              </span>
              <span className="moo-racks__info">
                <span className="moo-racks__type">
                  {shortType(r.type)}
                  {r.id === destinationId && <i>Our pick</i>}
                </span>
                <span className="moo-racks__meta">
                  {r.spaces} {r.spaces === 1 ? 'space' : 'spaces'}
                  {from ? ' · ' + formatDistance(r.dist ?? meters(from, r)) : ''}
                  {r.comment ? ' · ' + r.comment : ''}
                </span>
              </span>
              <button
                type="button"
                className="moo-iconbtn moo-iconbtn--sm"
                onClick={() => onGo(r)}
                aria-label={'Directions to this ' + shortType(r.type) + ' rack, ' + r.spaces + ' spaces'}
                title="Directions to this rack"
              >
                <NavigateIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && from && mode && (
        <a className="moo-racks__ext" href={navigationUrl(from, zone.center, mode)} target="_blank" rel="noopener noreferrer">
          Open area in Google Maps <ExternalIcon size={12} />
        </a>
      )}
    </div>
  );
}
