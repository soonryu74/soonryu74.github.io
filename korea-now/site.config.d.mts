// site.config.mjs 는 빌드 스크립트와 vite.config 양쪽에서 쓰이는 순수 자바스크립트라
// 타입만 따로 적어 둔다.
export declare const ORIGIN: string
export declare const BASE: string
export declare const BASE_SLASH: string
export declare function url(path?: string): string
