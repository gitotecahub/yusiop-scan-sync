import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const KEY_PREV = 'nav:prev';
const KEY_CURR = 'nav:curr';

/**
 * Tracks the previous in-app pathname (with search) in sessionStorage so
 * pages can implement a reliable "back" button that returns to the actual
 * previous page even when browser history is empty (e.g. fresh load or
 * external redirect like Stripe).
 */
export function useNavHistoryTracker() {
  const location = useLocation();
  useEffect(() => {
    try {
      const curr = sessionStorage.getItem(KEY_CURR);
      const next = location.pathname + location.search;
      if (curr && curr !== next) {
        sessionStorage.setItem(KEY_PREV, curr);
      }
      sessionStorage.setItem(KEY_CURR, next);
    } catch {
      // ignore
    }
  }, [location.pathname, location.search]);
}

export function getPreviousPath(fallback = '/'): string {
  try {
    return sessionStorage.getItem(KEY_PREV) || fallback;
  } catch {
    return fallback;
  }
}
