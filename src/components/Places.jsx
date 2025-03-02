export default function Places({ title, places, fallbackText, onSelectPlace }) {
  return (
    <section className="places-category">
      <h2>{title}</h2>
      {places.length === 0 && <p className="fallback-text">{fallbackText}</p>}
      {places.length > 0 && (
        <ul className="places">
          {places.map((place) => (
            <li key={place.id} className="place-item">
              <button onClick={() => onSelectPlace(place.id)}>
                <h1>{place.title}</h1>
                <h1>Distance: {place.distance.toFixed(3)} km</h1>
                <h1>
                  Lat: {place.lat}, Lon: {place.lon}
                </h1>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
