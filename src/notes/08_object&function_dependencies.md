# Understanding `useEffect` Dependencies in React

When using `useEffect`, incorporating props or values often requires adding them to the dependencies array. However, handling objects and functions as dependencies is slightly different. Let’s dive into an example and analyze potential pitfalls.

## Adding `onConfirm` to `useEffect`

```jsx
import { useEffect } from "react";
export default function DeleteConfirmation({ onConfirm, onCancel }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onConfirm();
    }, 3000);

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
    </div>
  );
}
```

Adding functions like `onConfirm` to the dependency array can lead to unintended behavior, such as infinite loops. Why does this happen?

### Understanding Dependency Behavior
Here’s another `useEffect` example for comparison:

```jsx
useEffect(() => {
  if (open) {
    dialog.current.showModal();
  } else {
    dialog.current.close();
  }
}, [open]);
```

In this case:
- The effect is re-executed whenever the value in the dependency array changes (e.g., `open` changes).
- This works as expected because `open` is a primitive value.

However, functions like `onConfirm` behave differently:

### The `onConfirm` Scenario

```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    onConfirm();
  }, 3000);

  return () => {
    clearTimeout(timer);
  };
}, [onConfirm]);
```

Here, `onConfirm` is defined in the `App` component:

```jsx
<Modal open={modalIsOpen} onClose={handleStopRemovePlace}>
  <DeleteConfirmation
    onCancel={handleStopRemovePlace}
    onConfirm={handleRemovePlace}
  />
</Modal>
```

The `onConfirm` prop is assigned to `handleRemovePlace`:

```jsx
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
```

### Why Functions Cause Re-Executions

Functions in JavaScript are objects, and they’re recreated every time the parent component re-renders. For example:

```jsx
const hello = () => console.log('Hello');
const helloAgain = () => console.log('Hello');

hello !== helloAgain; // true
```

Although `hello` and `helloAgain` look identical, they are distinct objects. Similarly, `handleRemovePlace` is recreated during each render of the `App` component. 

When React compares the new `onConfirm` function to the previous one in the dependency array, they’re seen as different, triggering the effect again. 

### Digging Deeper
What happens if the `onConfirm` function manipulates state? Here’s what happens with `handleRemovePlace`:

1. **State Manipulation**:
   ```jsx
   setPickedPlaces((prevPickedPlaces) =>
     prevPickedPlaces.filter((place) => place.id !== selectedPlace.current)
   );
   ```
   This updates `pickedPlaces` by filtering out the `selectedPlace`.

2. **Modal Closure**:
   ```jsx
   setModalIsOpen(false);
   ```
   This closes the modal.

3. **Local Storage Update**:
   ```jsx
   const storedIds = JSON.parse(localStorage.getItem("selectedPlaces")) || [];
   localStorage.setItem(
     "selectedPlaces",
     JSON.stringify(storedIds.filter((id) => id !== selectedPlace.current))
   );
   ```
   The function updates the browser’s `localStorage` to reflect the changes.

---

## What's the problem 
**Infinite Loop**

### When `useEffect` runs:
1. `useEffect` executes after the render cycle or when a dependency in the dependency array changes.
2. React compares the current value of the dependency to its previous value to decide whether to re-run the effect.

### How functions behave:
1. Functions in JavaScript are first-class objects, meaning they are recreated every time the parent component re-renders.
2. Even if the logic of the function hasn’t changed, its reference is different because it’s a newly created object.
```jsx
const handleSomething = () => console.log('Action'); // A new function every render!
```

### React's perspective:
- `useEffect` relies on strict equality **(===)** to compare dependencies. 
- Since the function reference changes on each render, React thinks it’s a brand-new value.
- As far as React is concerned, the function in the previous render no longer exists, so it re-runs the `useEffect`.

### The result:
`useEffect` triggers again unnecessarily, potentially causing performance issues or even infinite loops if the effect itself triggers state updates that re-render the parent component.

---


## The loop: 

### Round 1
**State is updated** in `handleRemovePlace`.

**User clicks a button to remove a place, triggering this function.
**As a result, `App` component function re-renders.

**Since state changed, React re-renders the component.
**As a result, a brand new `handleRemovePlace` function is created and passed to `DeleteConfirmation`.

**React recreates the function because it’s declared inside the `App` component.
**As a result, in the `DeleteConfirmation` component, `useEffect()` runs.

**`useEffect()` depends on `onConfirm` (which is the new `handleRemovePlace` function), so it runs again.
**As a result, `onConfirm` is triggered, which updates the state in `App`.

### Repeat from Step 1.
The loop continues, causing infinite re-renders.

---

## We are saved by a hanging thread in this app luckily 
**WHY!**
- We so not enter the infinite loop in this case because of what's happening in <DeleteConfirmation />
especially in the useEffect section. 

```jsx
useEffect(() => {
    const timer = setTimeout(() => {
      onConfirm();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [onConfirm]);
```
- When `onConfirm` is called, a state update is triggered in `App.jsx`
- But the `setModalIsOpen(false)` line saves us
- This line removes <DeleteConfirmation /> component from the DOM 
- <DeleteConfirmation /> is called in `Modal` and `Modal` is a wrapper components
- `Modal` dynamically renders it's children props which is <DeleteConfirmation />
```jsx
<dialog className="modal" ref={dialog} onClose={onClose}>
      {open ? children : null}
    </dialog>,
```
- So here, <DeleteConfirmation /> disappers so we avoid a infinite loop 
- So the `setModalIsOpen(false)` leads to <DeleteConfirmation /> never getting rendered 
- If we disable `//setModalIsOpen(false)`, we run into a loop 
- We see that every 3 seconds a new `timer` is set  
- This keeps going until we hit `No` and remove the `Modal`
- While hiding the compoennt is a solution, we have a hook to help us. 

---

## Summary
Using functions as dependencies in `useEffect` can lead to:
- **Re-executions**: Since functions are re-created on every render, they appear different to React.
- **State Dependency Issues**: If the function manipulates state, it can inadvertently trigger further re-renders and potentially create loops.

---

# Next Up!
useCallback Hook






