import type { GeoMap } from '../types';

export function project(map: GeoMap, lat: number, lng: number): [number, number] {
  const { minx, maxy, k, s } = map.proj;
  return [(lng - minx) * k * s, (maxy - lat) * s];
}
