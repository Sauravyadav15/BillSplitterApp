// frontend/src/hooks/useHideOnScroll.js

import { useEffect, useRef, useState } from 'react';

// Hides the header on scroll-down, reveals it on scroll-up - keeps it
// available without it permanently eating screen space on long pages
// (settlement history, landing page sections, etc).
export default function useHideOnScroll(threshold = 8) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Clamp negative values: iOS/macOS rubber-band overscroll can report
    // scrollY < 0 momentarily, which would otherwise throw the diff off.
    lastY.current = Math.max(0, window.scrollY);

    const update = () => {
      ticking.current = false;
      const y = Math.max(0, window.scrollY);
      const diff = y - lastY.current;

      if (Math.abs(diff) < threshold) return;

      setVisible(y < 80 || diff < 0);
      lastY.current = y;
    };

    // rAF-throttled: scroll fires far more often than the browser can
    // paint, so acting on every event causes redundant state updates and
    // can make the show/hide feel like it's lagging or half-triggering.
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return visible;
}
