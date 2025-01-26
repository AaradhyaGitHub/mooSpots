# React useEffect Dependencies: A Practical Guide

## What are Effect Dependencies?

Effect dependencies are:
- Prop or state values used inside the effect function
- Functions or context values that depend on state or props
- Any value that would cause the component to re-execute

### Key Insights

#### What Counts as a Dependency?
- State values
- Props
- Derived values from state or props

#### What Doesn't Count?
- Refs
- Browser built-in objects/methods
- Values that don't trigger component re-render

## Why Dependencies Matter

```jsx
useEffect(() => {
  // This effect depends on 'count'
  console.log(count);
}, [count]); // 'count' is a dependency
```

### Dependency Array Behavior
- Empty array `[]`: Effect runs only once
- With dependencies `[open]`: Effect runs when dependency changes
- No array: Effect runs after every render

## Real-World Example

```jsx
function Modal({ open }) {
  useEffect(() => {
    if (open) {
      // Do something when modal opens
    }
  }, [open]); // 'open' prop is a dependency
}
```

### Critical Principle
> Your effect function should execute when its dependencies change

## Best Practices
- Be explicit about dependencies
- Only include values that trigger re-render
- Avoid unnecessary re-renders
- Use dependency linters in your IDE

💡 **Pro Tip**: Always ask, "Would this value cause my component to re-render?"