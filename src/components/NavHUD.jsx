import { useEffect } from 'react';
import { TurnIcon, XIcon, CrosshairIcon, BikeIcon, WalkIcon, ExternalIcon } from './Icons.jsx';
import { formatDistance, formatClock, travelMinutes, formatDuration, navigationUrl } from '../lib/format.js';

/**
 * Turn-by-turn chrome: the maneuver banner on top, trip bar on the bottom.
 * Leaving is always one tap (End), Escape, or the phone's back gesture.
 */
export default function NavHUD({ trip, nav, onEnd, following, onRecenter }) {
  const { route, progress, status, notice, position } = nav;

  // Back button / swipe-back ends navigation instead of leaving the app.
  useEffect(() => {
    history.pushState({ mooNav: true }, '');
    const onPop = () => onEnd({ fromHistory: true });
    const onKey = (e) => e.key === 'Escape' && onEnd();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = progress ? progress.remaining : route?.distance ?? null;
  const minutes = remaining != null ? travelMinutes(remaining, trip.mode) : null;
  const eta = minutes != null ? new Date(Date.now() + minutes * 60000) : null;
  const next = progress?.next ?? route?.steps[1];
  const toNext = progress ? progress.toNext : next?.at ?? 0;
  const after = route && progress ? route.steps[progress.stepIndex + 2] : null;
  const now = toNext < 15;

  if (status === 'arrived') {
    return (
      <div className="moo-nav">
        <div className="moo-arrive" role="status">
          <div className="moo-arrive__check" aria-hidden="true">
            <svg viewBox="0 0 52 52" width="52" height="52">
              <circle cx="26" cy="26" r="23" />
              <path d="M15 27l7 7 15-15" />
            </svg>
          </div>
          <h2>You&apos;re here</h2>
          <p>
            {trip.name}
            {trip.rack && (
              <>
                <br />
                <span>
                  {trip.rack.type} · {trip.rack.spaces} spaces
                </span>
              </>
            )}
          </p>
          <button type="button" className="moo-btn moo-btn--blue moo-btn--xl moo-btn--block" onClick={() => onEnd()}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="moo-nav">
      <div className={'moo-turn' + (now ? ' is-now' : '')} role="status" aria-live="polite">
        {!route ? (
          <div className="moo-turn__loading">
            <span className="moo-spinner moo-spinner--light" />
            {status === 'nogps' ? 'Waiting for GPS…' : 'Finding the best path…'}
          </div>
        ) : (
          <>
            <div className="moo-turn__icon">
              <TurnIcon modifier={next?.modifier} kind={next?.kind} size={36} />
            </div>
            <div className="moo-turn__text">
              <p className="moo-turn__dist">{now ? 'Now' : formatDistance(toNext)}</p>
              <p className="moo-turn__instr">{next?.text}</p>
            </div>
          </>
        )}
        {after && route && !now && (
          <p className="moo-turn__then">
            Then <TurnIcon modifier={after.modifier} kind={after.kind} size={14} /> {after.text}
          </p>
        )}
      </div>

      {notice && <div className="moo-nav__notice">{notice}</div>}
      {status === 'nogps' && (
        <div className="moo-nav__notice">
          Location is off, so live directions can&apos;t follow you.{' '}
          <a href={navigationUrl(null, trip.to, trip.mode)} target="_blank" rel="noopener noreferrer">
            Open in Google Maps <ExternalIcon size={11} />
          </a>
        </div>
      )}

      {!following && position && (
        <button type="button" className="moo-btn moo-btn--white moo-nav__recenter" onClick={onRecenter}>
          <CrosshairIcon size={16} /> Re-center
        </button>
      )}

      <div className="moo-tripbar">
        <div className="moo-tripbar__info">
          <p className="moo-tripbar__time">
            {minutes != null ? formatDuration(minutes) : '—'}
            <span className="moo-tripbar__mode">{trip.mode === 'bike' ? <BikeIcon size={15} /> : <WalkIcon size={15} />}</span>
          </p>
          <p className="moo-tripbar__sub">
            {remaining != null ? formatDistance(remaining) : ''}
            {eta ? ' · arrive ' + formatClock(eta) : ''}
          </p>
          <p className="moo-tripbar__to">to {trip.name}</p>
        </div>
        <button type="button" className="moo-btn moo-btn--end" onClick={() => onEnd()} aria-label="End navigation">
          <XIcon size={18} /> End
        </button>
      </div>
    </div>
  );
}
