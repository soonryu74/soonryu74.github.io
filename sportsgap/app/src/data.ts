import dataset from './data/dataset.json';
import geo from './data/gg_map.json';
import type { Dataset, GeoMap } from './types';

export const DATA = dataset as Dataset;
export const MAP = geo as GeoMap;
export const IS_DEMO = DATA.source === 'demo';
export const REGION_NAMES = DATA.regions.map((r) => r.name).sort((a, b) => a.localeCompare(b, 'ko'));
