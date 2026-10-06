/* 다시ON AI 런타임 설정 (빌드 없이 정적 배포 → .env 대신 이 파일을 쓴다)
   - 비밀키는 절대 여기에 넣지 않는다. AI_ENDPOINT 는 키를 보관한 "본인 서버/서버리스 함수" 주소다.
   - 비워 두면 브라우저 안 규칙 기반 DEMO 분석기로 동작한다(화면에 DEMO 표시).
   - CACHE_BASE: GitHub Actions 등이 고용24 OPEN API로 수집해 둔 JSON 캐시 위치(없으면 DEMO 데이터). */
window.REON_CONFIG = {
  AI_ENDPOINT: '',
  CACHE_BASE: 'data/cache',
  VERSION: '0.1.0',
};
