/* 제작 크레딧 — 이 사이트 모든 페이지 맨 아래 한 줄.
   문구·날짜는 아래 CREDIT 하나만 고친다. 페이지에는 <script src="/assets/credit.js" defer></script> 한 줄만 있으면 된다.
   (newsletter/ 는 자체 site-config.json 으로 같은 줄을 만든다) */
(function () {
  var CREDIT = { org: "지음웍스", url: "https://jieumworks.com", urlLabel: "jieumworks.com", date: "2026년 9월" };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function put() {
    if (!document.getElementById("site-credit-style")) {
      var st = document.createElement("style"); st.id = "site-credit-style";
      st.textContent =
        ".site-credit{display:block;margin:28px auto 0;padding:12px 12px 0;text-align:center;" +
        "font-size:.76rem;line-height:1.6;letter-spacing:.01em;color:#8a8f9a;word-break:keep-all;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box}" +
        "footer .site-credit{margin-top:14px;padding-top:12px;border-top:1px solid rgba(128,128,128,.22)}" +
        ".site-credit a{color:inherit;text-decoration:underline;text-decoration-color:rgba(138,143,154,.5);text-underline-offset:2px}" +
        "@media print{.site-credit{display:block!important;color:#777;break-inside:avoid}}";
      document.head.appendChild(st);
    }
    if (document.querySelector(".site-credit")) return;            // 이미 있으면 두 번 넣지 않는다
    var el = document.createElement("div"); el.className = "site-credit";
    el.innerHTML = "기획·제작 " + esc(CREDIT.org) + " · <a href=\"" + esc(CREDIT.url) + "\" target=\"_blank\" rel=\"noopener\">" +
                   esc(CREDIT.urlLabel) + "</a> · " + esc(CREDIT.date);
    // 공용 푸터가 있으면 그 마지막 줄에, 없으면 본문 끝에
    var host = document.querySelector(".site-footer .footer-inner") || document.querySelector("footer.site-footer") ||
               document.querySelector("body > footer") || document.querySelector("footer") || document.body;
    host.appendChild(el);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put); else put();
})();
