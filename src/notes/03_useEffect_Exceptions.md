# Overusing `useEffect()`: React Best Practices

## Side Effects in React

### What is a Side Effect?

- Operations unrelated to direct component rendering
- Tasks that don't immediately impact the current render cycle
- Examples include:
  - Fetching user location
  - Saving data to local storage
  - Browser API interactions

## When to Avoid `useEffect()`

- Not every side effect requires `useEffect()`
- `useEffect()` introduces an extra render cycle
- Use only when absolutely necessary

## Local Storage Example

### Scenario: Saving Selected Places

```jsx
function handleSelectPlace(id) {
  // State update (rendering-related)
  setPickedPlaces((prevPickedPlaces) => {
    if (prevPickedPlaces.some((place) => place.id === id)) {
      return prevPickedPlaces;
    }
    const place = AVAILABLE_PLACES.find((place) => place.id === id);
    return [place, ...prevPickedPlaces];
  });

  // Side effect: Local storage interaction
  const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
  if (storedIds.indexOf(id) === -1) {
    localStorage.setItem("selectedPlaces", JSON.stringify([id, ...storedIds]));
  }
}
```

## Improving on the local storage feature

- Just storing items is not enough, it need to update when we remove place
- We also want to load the data so that the UI for selected places gets pre populated

### Let's start with deletion:

```jsx
function handleRemovePlace() {
  setPickedPlaces((prevPickedPlaces) =>
    prevPickedPlaces.filter((place) => place.id !== selectedPlace.current)
  );
  modal.current.close();
  const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
  localStorage.setItem(
    "selectedPlaces",
    JSON.stringify(storedIds.filter((id) => id !== selectedPlace.current))
  );
}
```

---

### Next, let's fetch it when the app starts - use useEffect()? NO!

- We could use useEffect so we can get our loaded places with help of local storage:

```jsx
useEffect(() => {
  const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
  const stpredPlaces = storedIds.map((id) =>
    AVAILABLE_PLACES.find((place) => place.id == id)
  );
  setPickedPlaces(storePlaces);
}, []);
```
- this code will give us an array of place objects based on that array of id's 
- this only runs once after App runs, we don't get into infinite loop and this works. 

--- 

So why is this not a recommended approach? Why is it redundant?
- This code, runs Synchronously unlike the code to generate user's location
- That means it finishes instantly and once it's done, it's done 
- This was not the case for getcurrentPosition. That only ran after the callback function got executed.
- But for local storage, we don't have a callback function. It is instant 
- Therefore, the app component doesn't finish it's execution cycle before fetching the data 
- So we can get rid of useEffect and state updating fucntion 
- We can move it in front of state initialization
- And use the storedPlaces array as our initial array for pickedPlaces
- This works because this code runs synchronously and doesn't take time to finish during which App's execution would finish 
- We can even move it out of App component so that it only runs once in the entire application life cycle. 
- It's enough to run this once and we can still use it. 


### Using `localStorage`

- Browser-provided memory storage
- `.setItem()` saves data persistently
- Data must be converted to string
- Example: `localStorage.setItem("selectedPlaces", JSON.stringify([]))`

### Breaking Down the Side Effect

- State update: Top part of the function
- Local storage interaction: Side effect
- Not inherently bad, just unrelated to rendering

## Why Not Use `useEffect()` Here?

- Function runs only on user interaction
- Not on every re-render
- Hooks can only be used at the root level of a function
- No risk of infinite loop

## Key Considerations

- Side effects aren't always problematic
- Choose the right approach based on specific use case
- Prioritize clean, readable code
- Minimize unnecessary render cycles

### Best Practices

- Use `useEffect()` sparingly
- Consider alternative patterns
- Keep rendering logic separate from side effects
- Optimize component performance

## Important Reminder

Not every side effect requires `useEffect()`.
Choose the most appropriate and efficient method for your specific scenario.
