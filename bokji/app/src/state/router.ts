import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'start'; step: number }
  | { name: 'result' }
  | { name: 'service'; id: string }
  | { name: 'today' }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'emergency' };

export const STEPS = 7;

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  switch (a) {
    case 'start': return { name: 'start', step: Math.min(STEPS, Math.max(1, Number(b) || 1)) };
    case 'result': return { name: 'result' };
    case 'service': return b ? { name: 'service', id: decodeURIComponent(b) } : { name: 'result' };
    case 'today': return { name: 'today' };
    case 'settings': return { name: 'settings' };
    case 'about': return { name: 'about' };
    case 'emergency': return { name: 'emergency' };
    default: return { name: 'home' };
  }
}

export function go(path: string) {
  window.location.hash = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
