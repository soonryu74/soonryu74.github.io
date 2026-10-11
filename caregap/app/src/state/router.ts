import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'start'; step: number }
  | { name: 'map' }
  | { name: 'result' }
  | { name: 'services'; domain?: string }
  | { name: 'share' }
  | { name: 'about' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  switch (a) {
    case 'start': return { name: 'start', step: Math.min(4, Math.max(1, Number(b) || 1)) };
    case 'map': return { name: 'map' };
    case 'result': return { name: 'result' };
    case 'services': return { name: 'services', domain: b || undefined };
    case 'share': return { name: 'share' };
    case 'about': return { name: 'about' };
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
