import { useEffect, useState } from "react";
export default function Progressbar({ timer }) {
  const [remainingTime, setRemainingTime] = useState(TIMER);
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prevTime) => prevTime - 10);
    }, 10);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <progress value={remainingTime} max={timer} />;
}
