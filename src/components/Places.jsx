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
                <img src={place.image.src} alt={place.image.alt} />
                <h3>{place.title}</h3>
                {/* Display the latitude and longitude */}
                <p>Lat: {place.lat}, Lon: {place.lon}</p>
                {
                  console.log(`The Latitude is: ${place.lat}. The Longitute is ${place.lon}`)
                }
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
