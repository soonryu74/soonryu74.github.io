/* Gmail 웹 작성 창 주소 — 브라우저의 mailto 처리기가 Gmail 로 잡혀 있으면 계정 선택 뒤 작성 창이 뜨지 않는 경우가 있어(2026-10-05 소유자 제보)
   mailto 와 별도로 Gmail 작성 화면을 새 탭에서 바로 연다. 로그인·계정 선택을 거쳐도 이 주소(view=cm)는 작성 창으로 이어진다. */
export const gmailCompose = (to, subject, body) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
