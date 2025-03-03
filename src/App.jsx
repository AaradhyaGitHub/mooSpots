import { useRef, useState, useEffect, useCallback } from "react";
import Places from "./components/Places.jsx";
import { AVAILABLE_BIKE_RACKS } from "./bike-rack.js";
import { sortPlacesByDistance } from "./loc.js";
import Modal from "./components/Modal.jsx";
import DeleteConfirmation from "./components/DeleteConfirmation.jsx";
import logoImg from "/logo8.png";
import Search from "./components/Search.jsx";
import TEST_LOCATIONS from "./test-coords.js";

const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
const storedPlaces = storedIds.map((id) =>
  AVAILABLE_BIKE_RACKS.find((place) => place.id == id)
);

// Test coordinates - replace with coordinates near your bike racks


function App() {
  const positionRef = useRef({ lat: 0, lon: 0 }); // Holds onto position

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const selectedPlace = useRef();
  const [availablePlaces, setAvailablePlaces] = useState([]);
  const [pickedPlaces, setPickedPlaces] = useState(storedPlaces);
  const [searchInitiation, setSearchInitiation] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle"); // 'idle', 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  
  // Test mode state
  const [useTestLocation, setUseTestLocation] = useState(false);
  const [selectedTestLocation, setSelectedTestLocation] = useState(0);

  function handleStartRemovePlace(id) {
    setModalIsOpen(true);
    selectedPlace.current = id;
  }

  function handleStopRemovePlace() {
    setModalIsOpen(false);
  }

  function handleSelectPlace(id) {
    setPickedPlaces((prevPickedPlaces) => {
      if (prevPickedPlaces.some((place) => place.id === id)) {
        return prevPickedPlaces;
      }
      const place = AVAILABLE_BIKE_RACKS.find((place) => place.id === id);
      return [place, ...prevPickedPlaces];
    });
    const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
    if (storedIds.indexOf(id) === -1) {
      localStorage.setItem(
        "selectedPlaces",
        JSON.stringify([id, ...storedIds])
      );
    }
  }

  const handleRemovePlace = useCallback(function handleRemovePlace() {
    setPickedPlaces((prevPickedPlaces) =>
      prevPickedPlaces.filter((place) => place.id !== selectedPlace.current)
    );
    setModalIsOpen(false);
    const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
    localStorage.setItem(
      "selectedPlaces",
      JSON.stringify(storedIds.filter((id) => id !== selectedPlace.current))
    );
  }, []);

  // Toggle test mode
  function toggleTestMode() {
    setUseTestLocation(prev => !prev);
  }

  // Handle test location change
  function handleTestLocationChange(e) {
    setSelectedTestLocation(Number(e.target.value));
  }

  function handleSearchInitiation() {
    setSearchInitiation(true);
    setLocationStatus("loading");
    
    // If in test mode, use test coordinates instead of getting real location
    if (useTestLocation) {
      setTimeout(() => {
        const testLocation = TEST_LOCATIONS[selectedTestLocation];
        positionRef.current = {
          lat: testLocation.lat,
          lon: testLocation.lon
        };
        
        const sortedPlaces = sortPlacesByDistance(
          AVAILABLE_BIKE_RACKS,
          testLocation.lat,
          testLocation.lon
        );
        // Get the closest places
        const closestPlaces = sortedPlaces.slice(0, 6);
        // Update state with the closest places
        setAvailablePlaces(closestPlaces);
        setLocationStatus("success");
      }, 1000); // Fake delay to simulate geolocation API
      
      return;
    }
    
    // Check if geolocation is supported by the browser
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }
    
    // Success callback
    const successCallback = (position) => {
      positionRef.current = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      
      const sortedPlaces = sortPlacesByDistance(
        AVAILABLE_BIKE_RACKS,
        position.coords.latitude,
        position.coords.longitude
      );
      // Get the closest places
      const closestPlaces = sortedPlaces.slice(0, 6);
      // Update state with the closest places
      setAvailablePlaces(closestPlaces);
      setLocationStatus("success");
    };
    
    // Error callback
    const errorCallback = (error) => {
      setLocationStatus("error");
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          setErrorMessage("Location permission was denied. Please enable location services for this site in your browser settings.");
          break;
        case error.POSITION_UNAVAILABLE:
          setErrorMessage("Location information is unavailable. Please try again later.");
          break;
        case error.TIMEOUT:
          setErrorMessage("The request to get your location timed out. Please try again.");
          break;
        default:
          setErrorMessage("An unknown error occurred while trying to get your location.");
          break;
      }
    };
    
    // Options for getCurrentPosition
    const options = {
      enableHighAccuracy: true,  // Use GPS if available
      timeout: 10000,            // Time to wait for a position
      maximumAge: 0              // Don't use a cached position
    };
    
    // Request location
    navigator.geolocation.getCurrentPosition(
      successCallback, 
      errorCallback,
      options
    );
  }

  const handleNavigatePlace = (targetLat, targetLon) => {
    // Construct the URL
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${positionRef.current.lat},${positionRef.current.lon}&destination=${targetLat},${targetLon}&travelmode=bicycling`;
    
    // Open in a new tab
    window.open(googleMapsUrl, '_blank');
  };

  // Helper function to show appropriate content based on location status
  const renderContent = () => {
    if (!searchInitiation) {
      return <Search handleSearchInitiation={handleSearchInitiation} />;
    }
    
    switch (locationStatus) {
      case "loading":
        return <div className="loading-container">
          <p>Mooooooving through the map to find parking...</p>
          <div className="loading-spinner"></div>
        </div>;
      
      case "error":
        return <div className="error-container">
          <h2>Location Error</h2>
          <p>{errorMessage}</p>
          <button onClick={handleSearchInitiation}>Try Again</button>
          <button onClick={() => {
            // Show a list of all places as fallback
            setAvailablePlaces(AVAILABLE_BIKE_RACKS.slice(0, 10));
            setLocationStatus("fallback");
          }}>Show All Bike Racks</button>
        </div>;
      
      case "success":
      case "fallback":
        return <Places
          title={locationStatus === "success" ? "📍 Nearest to You" : "All Bike Racks"}
          places={availablePlaces}
          fallbackText="No bike racks found."
          onSelectPlace={handleSelectPlace}
          onNavigate={handleNavigatePlace}
          onRefresh={handleSearchInitiation}
        />;
        
      default:
        return <div>Something went wrong. Please refresh the page.</div>;
    }
  };

  // Create a dev panel component for testing
  const DevPanel = () => {
    return (
      <div className="dev-panel">
        <h3>Dev Testing Panel</h3>
        <div className="toggle-container">
          <label>
            <input
              type="checkbox"
              checked={useTestLocation}
              onChange={toggleTestMode}
            />
            Use Test Location
          </label>
        </div>
        
        {useTestLocation && (
          <div className="test-location-selector">
            <select value={selectedTestLocation} onChange={handleTestLocationChange}>
              {TEST_LOCATIONS.map((loc, index) => (
                <option key={index} value={index}>
                  {loc.label} ({loc.lat.toFixed(4)}, {loc.lon.toFixed(4)})
                </option>
              ))}
            </select>
            <button onClick={handleSearchInitiation} className="test-search-btn">
              Test Search with Selected Location
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Modal open={modalIsOpen} onClose={handleStopRemovePlace}>
        <DeleteConfirmation
          onCancel={handleStopRemovePlace}
          onConfirm={handleRemovePlace}
        />
      </Modal>

      <header>
        <img src={logoImg} alt="Stylized globe" />
        <h1>mooSpots</h1>
        <p>Herd you can't find a bike rack</p>
      </header>
      
      {/* Dev Panel - only visible in development */}
      {process.env.NODE_ENV !== 'production' && <DevPanel />}
      
      <main>
        {renderContent()}
      </main>
    </>
  );
}

export default App;