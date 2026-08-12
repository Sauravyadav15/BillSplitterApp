// frontend/src/hooks/useCountUp.js

import { useEffect, useRef, useState } from 'react';

// Animates a numeric value from its previous value up/down to `target` over
// `duration`ms - used on stat tiles (balances, totals) so a page load or a
// balance change reads as something happening, not just a number swap.
export default function useCountUp(target, duration = 700) {
  const numericTarget = Number(target) || 0;
  const [value, setValue] = useState(numericTarget);
  const fromRef = useRef(numericTarget);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const delta = numericTarget - from;
    if (delta === 0) return;

    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic - fast start, gentle settle, no overshoot.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = numericTarget;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [numericTarget, duration]);

  return value;
}
