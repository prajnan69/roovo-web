import { useEffect, useRef } from 'react';

// Android hardware-back support for overlays (drawers, sheets, login,
// search). Open overlays register a close handler here; the global back
// button listener in App.tsx consults closeTopmostOverlay() BEFORE doing
// history.back(), so a back press closes the topmost overlay instead of
// leaving the page.
//
// Module-level (not React context) on purpose: the Capacitor backButton
// callback lives outside the React tree and needs synchronous access.

type CloseFn = () => void;

const stack: CloseFn[] = [];

// Called by the backButton listener. Returns true if an overlay consumed the
// press (its close handler was invoked), false if the back press should fall
// through to normal history navigation. The entry is NOT popped here — it
// unregisters itself via the hook's cleanup once the overlay actually closes,
// so a close that fails to change state can't desync the stack.
export function closeTopmostOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

// Register `close` for the hardware back button while `isOpen` is true.
// Overlays that are only mounted while visible can pass isOpen = true.
export function useBackCloseable(isOpen: boolean, close: CloseFn): void {
  // Latest-ref so a new `close` identity each render doesn't churn the stack.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!isOpen) return;
    const entry = () => closeRef.current();
    stack.push(entry);
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [isOpen]);
}
