import { useRef, useState, useEffect, useCallback } from "react";
import Places from "./components/Places.jsx";
import { AVAILABLE_BIKE_RACKS } from "./bike-rack.js";
import { sortPlacesByDistance } from "./loc.js";
import Modal from "./components/Modal.jsx";
import DeleteConfirmation from "./components/DeleteConfirmation.jsx";
import logoImg from "/logo8.png";
import Search from "./components/Search.jsx";

const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
const storedPlaces = storedIds.map((id) =>
  AVAILABLE_BIKE_RACKS.find((place) => place.id == id)
);

function App() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const selectedPlace = useRef();
  const [availablePlaces, setAvailablePlaces] = useState([]);

  const [pickedPlaces, setPickedPlaces] = useState(storedPlaces);
  const [searchInitiation, setSearchInitiation] = useState(false);

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

  function handleSearchInitiation() {
    console.log("clicked");
    setSearchInitiation(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const sortedPlaces = sortPlacesByDistance(
        AVAILABLE_BIKE_RACKS,
        position.coords.latitude,
        position.coords.longitude
      );
      // Get the 4 closest places
      const closestFourPlaces = sortedPlaces.slice(0, 6); // Slice the first 4 items
      // Update state with the 4 closest places
      setAvailablePlaces(closestFourPlaces);
    });
  }

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
      <main>
        {searchInitiation ? (
          <Places
            title="📍 Nearest to You"
            places={availablePlaces}
            fallbackText="Mooooooving through the map to find parking..."
            onSelectPlace={handleSelectPlace}
          />
        ) : (
          <Search handleSearchInitiation={handleSearchInitiation} />
        )}
      </main>
    </>
  );
}

export default App;
