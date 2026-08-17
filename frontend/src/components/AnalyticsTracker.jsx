// frontend/src/components/AnalyticsTracker.jsx
// Fires a Google Analytics page_view event on every client-side route
// change. gtag.js (see index.html's inline snippet) only counts a page
// view on its own initial script load by default - since this is a
// single-page app with no full browser reload between routes, navigating
// Dashboard -> a Group -> a Bill would otherwise register as a single
// page view instead of three, undercounting real usage. Renders nothing;
// mounted once inside <BrowserRouter> so useLocation has Router context.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Guards against an ad blocker (common for Google Tag Manager
    // specifically) having kept gtag.js from ever loading/defining itself.
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
