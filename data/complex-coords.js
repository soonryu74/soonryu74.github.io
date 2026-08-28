/* 단지 좌표 미리 계산본 — 지도(jido-search)가 런타임 지오코딩 없이 즉시 핀을 찍기 위한 시드.
   형식: window.COORDS = { "단지명": [위도, 경도], ... }
   생성: KAKAO_REST_KEY=<카카오 REST 키> python3 scripts/build_coords.py
   (키가 없으면 비어 있고, 브라우저가 이전 방문에서 찾은 좌표를 localStorage에 캐시해 재방문 시 지오코딩을 생략합니다.) */
window.COORDS = {};
