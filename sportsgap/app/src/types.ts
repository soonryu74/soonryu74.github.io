export type FacilityType = '체육관' | '수영장' | '생활체육공원' | '게이트볼장' | '파크골프장' | '다목적구장' | '장애인체육관' | '걷기길' | string;

export interface Facility {
  id: string;
  name: string;
  region: string;
  type: FacilityType;
  lat: number;
  lng: number;
  indoor: boolean;
  barrierFree: boolean;
  /** 어르신 대상 프로그램이 있는지 */
  senior: boolean;
  /** 장애인 대상 프로그램이 있는지 */
  disabledProg: boolean;
  address?: string;
}

export interface RegionStat {
  name: string;
  pop: number;
  age65: number;
  disabled: number;
}

export interface Dataset {
  /** 'demo'면 화면 전체에 예시 데이터 표시 */
  source: 'demo' | 'public';
  asOf: string;
  regions: RegionStat[];
  facilities: Facility[];
  sources?: { name: string; org: string; url: string }[];
}

export interface MapRegion { name: string; d: string; cx: number; cy: number }
export interface GeoMap {
  w: number;
  h: number;
  proj: { minx: number; maxy: number; k: number; s: number };
  regions: MapRegion[];
}
