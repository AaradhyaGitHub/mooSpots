# Modal Component Evolution: Imperative to Declarative

## Initial Imperative Implementation
```jsx
import { forwardRef, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = forwardRef(function Modal({ children }) {
  const dialog = useRef();

  useImperativeHandle(ref, () => {
    return {
      open: () => {
        dialog.current.showModal();
      },
      close: () => {
        dialog.current.close();
      },
    };
  });

  return createPortal(
    <dialog className="modal" ref={dialog}>
      {children}
    </dialog>,
    document.getElementById('modal')
  );
});

export default Modal;
```

## Transition to Declarative Approach

### Key Changes
- Replace `useImperativeHandle` with prop-based control
- Use `open` prop to control dialog state
- Remove ref-based imperative methods

### Declarative Modal Implementation
```jsx
import { useRef } from "react";
import { createPortal } from "react-dom";

function Modal({ open, children }) {
  const dialog = useRef();

  return createPortal(
    <dialog className="modal" ref={dialog} open={open}>
      {children}
    </dialog>,
    document.getElementById("modal")
  );
}

export default Modal;
```

## Motivation for Change
- Move from imperative to declarative programming
- Use `useState` for state management
- Simplify component interaction
- Improve code readability and maintainability

### State Management Approach
- `setModalIsOpen(true)` to open modal
- `setModalIsOpen(false)` to close modal

## Benefits of Declarative Approach
- More predictable state management
- Easier to understand and debug
- Aligns with React's component philosophy
- Reduces complex imperative logic

## Syncing with Browser APIs
- Now, our modal is working as expected BUT 
- The background does not get grayed out as before 
- We'll tackle this next
