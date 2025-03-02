import {
  Lock,
  MapIcon,
  MapPin,
  Navigation,
  Bike,
  LandPlot,
  CircleParking
} from "lucide-react";
export default function Places({
  title,
  places,
  fallbackText,
  onSelectPlace,
  onNavigate
}) {
  return (
    <section className="places-category">
      <h2>{title}</h2>
      {places.length === 0 && <p className="fallback-text">{fallbackText}</p>}
      {places.length > 0 && (
        <ul className="places">
          {places.map((place) => (
            <li key={place.id} className="place-item">
              {console.log(`Latitude: ${place.lat}, Longitude: ${place.lon}`)}
              <div className="place-info">
                <h1>
                  <Bike />
                  {place.title}
                  <p>Detected!</p>
                </h1>
                <h1>
                  <CircleParking />
                  <p>Capacity: </p>

                  {place.rack_spaces}
                </h1>

                <h1>
                  <LandPlot />
                  <p>Distance: </p>
                  {place.distance < 1
                    ? `${(place.distance * 1000).toFixed(1)} m`
                    : `${place.distance.toFixed(2)} km`}
                </h1>
              </div>
              <button onClick={() => onNavigate(place.lat, place.lon)}>
                <Navigation size={15} /> Navigate
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
