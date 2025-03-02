export default function Places({ title, places, fallbackText, onSelectPlace }) {
  return (
    <section className="places-category">
      <h2>{title}</h2>
      {places.length === 0 && <p className="fallback-text">{fallbackText}</p>}
      {places.length > 0 && (
        <ul className="places">
          {places.map((place) => (
            <li key={place.id} className="place-item">
              <div className="place-info" onClick={() => onSelectPlace(place.id)}>
                <h1>🚲 {place.title}</h1>
                <div>
                  <h1>
                    📍 Distance:{" "}
                    {place.distance < 1
                      ? `${(place.distance * 1000).toFixed(1)} m`
                      : `${place.distance.toFixed(2)} km`}
                  </h1>
                </div>
              </div>
              <button>Navigate</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
