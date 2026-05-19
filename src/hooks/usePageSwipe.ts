import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Orden de páginas que se pueden navegar deslizando horizontalmente
const SWIPE_ROUTES = ['/', '/qr', '/catalog', '/library', '/profile'];

const THRESHOLD = 70; // px mínimos de desplazamiento horizontal
const RATIO = 1.6; // horizontal debe ser >1.6x vertical para considerarse swipe horizontal
const MAX_TIME = 600; // ms

/**
 * Detecta swipes horizontales y navega entre páginas principales.
 * Ignora el gesto si comienza dentro de un contenedor scrollable horizontalmente
 * o de elementos marcados con [data-no-swipe].
 */
export function usePageSwipe() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const idx = SWIPE_ROUTES.indexOf(location.pathname);
    if (idx === -1) return; // ruta actual no participa del swipe

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let ignore = false;

    const isHorizontallyScrollable = (el: Element | null): boolean => {
      let node: Element | null = el;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowX = style.overflowX;
        if (
          (overflowX === 'auto' || overflowX === 'scroll') &&
          node.scrollWidth > node.clientWidth + 1
        ) {
          return true;
        }
        if ((node as HTMLElement).dataset?.noSwipe !== undefined) return true;
        node = node.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        ignore = true;
        return;
      }
      const t = e.touches[0];
      const target = document.elementFromPoint(t.clientX, t.clientY);
      ignore = isHorizontallyScrollable(target);
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    };

    const onEnd = (e: TouchEvent) => {
      if (ignore) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      if (dt > MAX_TIME) return;
      if (Math.abs(dx) < THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * RATIO) return;

      if (dx < 0 && idx < SWIPE_ROUTES.length - 1) {
        navigate(SWIPE_ROUTES[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        navigate(SWIPE_ROUTES[idx - 1]);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [location.pathname, navigate]);
}
