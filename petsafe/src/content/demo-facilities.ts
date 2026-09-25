// 예시 시설 데이터. 실제 업체가 아니며 화면에 '예시 데이터'로 표시된다.
// 좌표는 서울시청 인근을 기준으로 임의 배치했다.
export type DemoFacility = {
  sourceId: string;
  facilityType: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  businessStatus: "open" | "closed" | "suspended" | "unknown";
  hours: Record<string, string>;
  petAccess: Record<string, string | boolean | null>;
  emergencyStatus: "verified" | "unverified" | "disputed";
  hoursStatus: "verified" | "unverified" | "disputed";
};

export const DEMO_FACILITIES: DemoFacility[] = [
  { sourceId: "demo-h1", facilityType: "animal_hospital", name: "예시 동물병원 A", address: "서울특별시 중구 예시로 1 (예시 데이터)", lat: 37.5672, lng: 126.9794, phone: "02-000-0001", businessStatus: "open", hours: { note: "운영시간 미확인" }, petAccess: {}, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-h2", facilityType: "animal_hospital", name: "예시 동물병원 B", address: "서울특별시 중구 예시로 22 (예시 데이터)", lat: 37.5641, lng: 126.9752, phone: "02-000-0002", businessStatus: "open", hours: { weekday: "09:00-19:00" }, petAccess: {}, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-h3", facilityType: "animal_hospital", name: "예시 동물병원 C (폐업 이력)", address: "서울특별시 종로구 예시길 3 (예시 데이터)", lat: 37.5701, lng: 126.9820, phone: null, businessStatus: "closed", hours: {}, petAccess: {}, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-p1", facilityType: "animal_pharmacy", name: "예시 동물약국", address: "서울특별시 중구 예시로 5 (예시 데이터)", lat: 37.5655, lng: 126.9810, phone: "02-000-0003", businessStatus: "open", hours: {}, petAccess: {}, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-s1", facilityType: "shelter", name: "예시 동물보호센터", address: "서울특별시 종로구 예시길 10 (예시 데이터)", lat: 37.5730, lng: 126.9760, phone: "02-000-0004", businessStatus: "open", hours: { weekday: "10:00-17:00" }, petAccess: {}, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-c1", facilityType: "pet_cafe", name: "예시 반려동물 동반 카페", address: "서울특별시 중구 예시로 30 (예시 데이터)", lat: 37.5620, lng: 126.9840, phone: "02-000-0005", businessStatus: "open", hours: { daily: "11:00-21:00" }, petAccess: { indoor: true, outdoor: false, size_limit: "미확인", carrier: null, leash: true, vaccination_proof: null, extra_fee: "미확인", last_confirmed_at: null }, emergencyStatus: "unverified", hoursStatus: "unverified" },
  { sourceId: "demo-k1", facilityType: "park", name: "예시 공원 반려견 놀이터", address: "서울특별시 중구 예시로 50 (예시 데이터)", lat: 37.5600, lng: 126.9700, phone: null, businessStatus: "open", hours: { daily: "06:00-22:00" }, petAccess: { indoor: false, outdoor: true, size_limit: "미확인", leash: true, vaccination_proof: "미확인", extra_fee: "무료(미확인)", last_confirmed_at: null }, emergencyStatus: "unverified", hoursStatus: "unverified" },
];
