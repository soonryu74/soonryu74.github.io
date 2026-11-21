import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'find' }
  | { name: 'map'; region?: string }
  | { name: 'about' };

export function parseHash(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/');
  switch (a) {
    case 'find': return { name: 'find' };
    case 'map': return { name: 'map', region: b ? decodeURIComponent(b) : undefined };
    case 'about': return { name: 'about' };
    default: return { name: 'home' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
