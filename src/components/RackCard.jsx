import RackGlyph from './RackGlyph.jsx';
import { BikeIcon, ClockIcon, WalkIcon, NavigateIcon } from './Icons.jsx';
import { formatDistance, formatMinutes, navigationUrl, WALK_KMH, BIKE_KMH } from '../lib/format.js';

export default function RackCard({ place, rank, selected, origin, onSelect }) {
  const navigate = (e) => {
    e.stopPropagation();
    if (origin) window.open(navigationUrl(origin, place), '_blank', 'noopener');
  };

  const activate = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <li className="moo-card-item">
      <div
        className={'moo-card' + (selected ? ' is-selected' : '')}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={activate}
      >
        <div className="moo-card__thumb">
          <div className="moo-card__glyph">
            <RackGlyph type={place.rack_type} />
          </div>
          <div className="moo-card__rank">{rank}</div>
        </div>

        <div className="moo-card__body">
          <div className="moo-card__head">
            <h3 className="moo-card__title">{place.title || place.rack_type}</h3>
            <p className="moo-card__distance">{formatDistance(place.distance)}</p>
          </div>

          <div className="moo-chips">
            <span className="moo-chip moo-chip--blue">
              <BikeIcon />
              {place.rack_spaces} spaces
            </span>
            <span className="moo-chip moo-chip--gold">
              <ClockIcon />
              {formatMinutes(place.distance, BIKE_KMH)} ride
            </span>
            <span className="moo-chip moo-chip--sage">
              <WalkIcon />
              {formatMinutes(place.distance, WALK_KMH)} walk
            </span>
          </div>

          <button type="button" className="moo-btn moo-btn--gold moo-btn--block" onClick={navigate}>
            <NavigateIcon />
            Navigate
          </button>
        </div>
      </div>
    </li>
  );
}
