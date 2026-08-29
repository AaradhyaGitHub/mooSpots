import MooSpots from './components/MooSpots.jsx';
import { AVAILABLE_BIKE_RACKS } from './bike-rack.js';

export default function App() {
  return <MooSpots racks={AVAILABLE_BIKE_RACKS} resultCount={6} />;
}
