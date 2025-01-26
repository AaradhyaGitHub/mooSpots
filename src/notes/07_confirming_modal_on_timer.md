# 🕰️ The Sneaky Timer Trap: A Dev's Debugging Adventure

Hey there, fellow React adventurer! Ever found yourself in a coding pickle where a simple timer turns into a wild debugging chase? Buckle up, because I'm about to share a story that might save you hours of head-scratching.

## The Initial "Seems Simple" Moment 🤔

Picture this: You're building a delete confirmation modal. Sounds straightforward, right? Just add a timeout, and boom – automatic confirmation. But wait... there's a twist!

### The Gotcha Code

```jsx
// Looks innocent, but watch out!
export default function DeleteConfirmation({ onConfirm, onCancel }) {
  setTimeout(() => {
    onConfirm(); // Surprise! I'm running whenever I want
  }, 3000);
}
```

## What Could Possibly Go Wrong? 🙃

- **Render Cycle Surprise**: This timer starts EVERY time the component renders
- **No Off Switch**: Click "No" to cancel? Too bad, it'll still delete after 3 seconds
- **Memory Leak Potential**: Timers just hanging around like uninvited party guests

## The Developer's Toolkit 🛠️

### Approach 1: Conditional Rendering Magic

```jsx
// Hey, only show me when you really need me!
{
  modalIsOpen && (
    <DeleteConfirmation
      onCancel={handleStopRemovePlace}
      onConfirm={handleRemovePlace}
    />
  );
}
```

### Approach 2: The Hero We Need - useEffect

```jsx
import { useEffect } from "react";
export default function DeleteConfirmation({ onConfirm, onCancel }) {
  useEffect(() => {
    setTimeout(() => {
      onConfirm();
    }, 3000);
  }, []);

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

## Pro Tips That'll Save Your Bacon 🥓

- Timers are sneaky – always have an escape route
- `useEffect` is your new best friend
- `useEffect` along with the effect function, also allows for a cleanup function which runs before the Effect function runs again
OR Right before the component is dismounted or removed from the DOM 