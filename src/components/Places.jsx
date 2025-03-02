import {
  Lock,
  MapIcon,
  MapPin,
  Navigation,
  Bike,
  LandPlot,
  CircleParking
} from "lucide-react";

import '../components/places.css'
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
                {/* Rack Title Section */}
                <div className="rack-title">
                  <Bike />
                  <h2>{place.title}</h2>
                </div>
                
                {/* Info Container */}
                <div className="info-container">
                  {/* Capacity Info */}
                  <div className="info-row">
                    <CircleParking />
                    <span className="label">Capacity:</span>
                    <span className="value">{place.rack_spaces}</span>
                  </div>
                  
                  {/* Distance Info */}
                  <div className="info-row">
                    <LandPlot />
                    <span className="label">Distance:</span>
                    <span className="value">
                      {place.distance < 1
                        ? `${(place.distance * 1000).toFixed(1)} m`
                        : `${place.distance.toFixed(1)} km`}
                    </span>
                  </div>
                </div>
              </div>
              
              <button onClick={() => onNavigate(place.lat, place.lon)}>
                <Navigation size={16} /> Navigate
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
