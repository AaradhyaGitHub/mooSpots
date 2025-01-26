## Thankfully, the fix is simple 
We have a hook that the funciton that we use is not being recreated everysingle time. 

---

## Intro To `useCallback` hook:
**Idea behing `useCallback`**
- Wrapper hook 
- We wrap it around the function that we don't want to be re-created every single re-render cycle
- Lets go the function in `App.jsx`:
```jsx
const handleRemovePlace = useCallback(
  function handleRemovePlace() {
    setPickedPlaces((prevPickedPlaces) =>
      prevPickedPlaces.filter((place) => place.id !== selectedPlace.current)
    );
    setModalIsOpen(false);
    const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
    localStorage.setItem(
      "selectedPlaces",
      JSON.stringify(storedIds.filter((id) => id !== selectedPlace.current))
    );
  }
  , []
);
```
**Understanding `useCallback` hook**
1. Wrap the function in `useCallback` as a first argument
2. It takes a second argument - **Dependency Array**
3. useCallback returns a value which we can hold in a `const`
4. This value is the function that has been wrapped but now, it's not recreated anytime the Component fiction gets re-executed 
5. The fuction is stored in the internal memory and used when needed 
6. Use callback when passing functions to useEffect's Effect 
dependency array 

---

## useCallback() has has a **dependency array**
- This array works exactly as useEffect's 
- Any prop or state used inside the wrapped function must be defined in the array. In this case, there is none 
- We just have state updating function and browser features which also don't have to be included as they don't trigger a re-render 
- It's props, state values ad any other values that in the end depend on state values like context values and other functions 
- So an empty array here is fine. 
- So now, React only recreates this function is the dependency array changes which in this case it does not because it's empty 

---

## Next -> Cleanup function 
- Our functionality runs a timer behind the scene which removes selected place after 3 seconds 
- The user is not getting any hints or display 
- So let's add a progress bar to show that the place will be removed after a certain time. 

Back in <DeleteConfirmation> Component :
- We add a TIMER const of 3000 
- We add a progressbar in the return statement 
- We set it's time interval using setInterval:
```jsx
import { useEffect, useState } from "react";
const TIMER = 3000;
export default function DeleteConfirmation({ onConfirm, onCancel }) {
  const [remainingTime, setRemainingTime] = useState(TIMER);

  setInterval(() => {
    setRemainingTime((prevTime) => prevTime - 10);
  }, 10);

  useEffect(() => {
    const timer = setTimeout(() => {
      onConfirm();
    }, 3000);

    return () => {
      clearTimeout(TIMER);
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
      <progress value={remainingTime} max={TIMER}/>
    </div>
  );
}
```
- But there is a slight problem which is that setInterval is in the component function. This creates a infinite loop 
- We should utilize the `useEffect() `hook here again  
```jsx
useEffect(
  ()=>{
     setInterval(() => {
    setRemainingTime((prevTime) => prevTime - 10);
  }, 10);
  }, 
  []
);
```
- Still there is a problem 
- Even after the timer expires, the INTERVAL continues being locked 
- That happens because we never stop this interval. **Same as before**

## Solution -> Same as before! 
- We gotta use a cleanup function 
- Then, we store a reference to this interval in a constant whcih we can call `interval`


```jsx
useEffect(
  ()=>{
   const interval = setInterval(() => {
    setRemainingTime((prevTime) => prevTime - 10);
  }, 10);
  return () => {
    clearInterval(interval)

  };
  }, 
  []
);
```