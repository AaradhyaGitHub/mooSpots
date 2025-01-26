There is something that can be optimized in this application. 

The interval is managed in DeleteConfirmation.js Component.

In the interval, we are updateing the state every 10 milliseconds. 

So this component runs every 10 milli seconds 
Every 10 milliseconds: 
- React has to compare onConfirm value 
- Re-evaluate thee entier JSX return block 
- Works fine but it's not optimal 
- Better to outsource progress indicator, state logic and the useEffect hook to a separate component 

So, let's just export that to a separate componenet. 

DeleteConfirmation.jsx:
```jsx
import { useEffect } from "react";
import Progressbar from "./ProgressBar.jsx";
const TIMER = 3000;
export default function DeleteConfirmation({ onConfirm, onCancel }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onConfirm();
    }, TIMER);

    return () => {
      clearTimeout(timer);
    };
  }, [onConfirm]);

  return (
    <div id="delete-confirmation">
      <h2>Are you sure?</h2>
      <p>Do you really want to remove this place?</p>
      <div id="confirmation-actions">
        <button onClick={onCancel} className="button-text">
          No
        </button>
        <button onClick={onConfirm} className="button">
          Yes
        </button>
      </div>
      <Progressbar timer={TIMER} />
    </div>
  );
}

```

New Progressbar.jsx:
```jsx
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

```

