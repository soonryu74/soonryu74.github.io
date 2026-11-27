export type FacilityType = '체육관' | '수영장' | '게이트볼장' | '파크골프장' | '육상경기장' | '테니스장' | '풋살장' | '구기장(축구·야구 등)' | '장애인 체육시설' | string;

export interface Facility {
  id: string;
  name: string;
  region: string;
  type: FacilityType;
  lat: number;
  lng: number;
  indoor: boolean;
  barrierFree: boolean;
  /** 어르신 친화 종목(게이트볼·파크골프) */
  senior: boolean;
  /** 장애인 강좌(장애인스포츠강좌이용권 가맹 또는 장애인 체육시설) */
  disabledProg: boolean;
  address?: string;
  /** 좌표 정확도: addr=주소, area=동·리 중심, name=시설명 검색, sgg=시군 중심 */
  geoLevel?: string;
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
