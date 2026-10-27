import { useState } from 'react';
import Splash from './components/Splash.jsx';
import PhoneApp from './components/PhoneApp.jsx';
import DesktopApp from './components/DesktopApp.jsx';
import { useMooSpots } from './hooks/useMooSpots.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import './styles/tokens.css';
import './styles/moospots.css';

// Phone and desktop are different products over the same data: a guided,
// one-thumb flow on phones; a full-screen GIS map on a real screen.
export default function App() {
  const app = useMooSpots(5);
  const desktop = useMediaQuery('(min-width: 900px) and (min-height: 560px)');
  const [splash, setSplash] = useState(true);
  const props = { app, logoSrc: '/logo8.png' };

  return (
    <>
      {desktop ? <DesktopApp {...props} /> : <PhoneApp {...props} />}
      {splash && <Splash onDone={() => setSplash(false)} />}
    </>
  );
}
