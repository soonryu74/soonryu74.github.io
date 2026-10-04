/* 개인정보 처리 안내 설정 (모심)
 *
 * 아래 세 값과 version 은 운영자가 확정해야 하는 항목이다. 임의의 사업자 정보나
 * 법적 고지를 코드에 채워 넣지 않는다. 비어 있는 동안에는 화면에
 * '확인 중' 안내가 표시되고, 동의 버전은 기록되지 않는다.
 *
 * 값을 채우는 방법:
 *   version  — 동의서 개정일을 'YYYY-MM-DD' 로 적는다. 내용이 바뀌면 날짜를 올린다.
 *   운영주체  — 공개할 법적 명칭(필요하면 사업자등록번호).
 *   보유기간  — 보관 기간과 파기 시점.
 *   문의처    — 열람·정정·삭제 요청을 받을 창구(메일 또는 전화).
 *
 * 채워진 뒤에는 등록 시 PRIVACY.version 이 caregivers.consent_version 에 저장되어
 * '어느 버전의 안내에 동의했는지'를 남길 수 있다.
 */
window.PRIVACY = {
  version:  '',
  운영주체: '',
  보유기간: '',
  문의처:   ''
};

window.privacyReady = function(){
  var p = window.PRIVACY || {};
  return !!(p.version && p.운영주체 && p.보유기간 && p.문의처);
};

/* 안내 블록을 그린다. el 은 컨테이너, opts.수집항목 은 이 화면이 받는 항목 설명. */
window.renderPrivacyNotice = function(el, opts){
  if (!el) return;
  var o = opts || {};
  var 항목 = o.수집항목 || '화면에 입력하신 항목';
  var esc = function(s){ return String(s||'').replace(/[<>&]/g, function(m){
    return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[m]; }); };

  if (window.privacyReady()){
    var p = window.PRIVACY;
    el.innerHTML =
      '<div class="callout law" style="font-size:.9rem">' +
      '<span class="t">개인정보 수집·이용 안내 <span style="font-weight:400;opacity:.7">(' + esc(p.version) + ')</span></span>' +
      '<ul style="margin:6px 0 0;padding-left:1.1em;line-height:1.7">' +
      '<li>수집 주체: ' + esc(p.운영주체) + '</li>' +
      '<li>수집 항목: ' + esc(항목) + '</li>' +
      '<li>이용 목적: ' + esc(o.목적 || '프로필 공개 및 구인·구직 연결') + '</li>' +
      '<li>보유·파기: ' + esc(p.보유기간) + '</li>' +
      '<li>열람·정정·삭제 요청: ' + esc(p.문의처) + '</li>' +
      '</ul></div>';
  } else {
    el.innerHTML =
      '<div class="callout warn" style="font-size:.9rem">' +
      '<span class="t">개인정보 안내가 아직 확정되지 않았습니다</span>' +
      '운영 주체·보유기간·삭제 요청 창구를 공개한 뒤 정식 운영합니다. 그때까지는 ' +
      '<b>공개를 원하는 최소한의 정보만</b> 입력해 주세요. 실명·전화번호 전체처럼 ' +
      '꼭 필요하지 않은 정보는 적지 않으시는 편이 안전합니다. 등록 후 삭제를 원하시면 ' +
      '아래 문의 창구로 알려주세요.' +
      '</div>';
  }
};
