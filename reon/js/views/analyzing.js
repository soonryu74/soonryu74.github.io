export function view() {
  const steps = ['경력 문장 읽기', '역량 후보 추출', '전환직무 사전과 비교', '추천 이유 작성'];
  return {
    title: '분석 중 — 다시ON AI',
    html: `<div class="loading" role="status" aria-live="polite"><div class="spinner" aria-hidden="true"></div><h1 style="font-size:1.5rem">경력을 다음 직업의 언어로 번역하고 있습니다</h1><ol id="load-steps">${steps.map((s) => `<li>○ ${s}</li>`).join('')}</ol><p class="muted small">입력 내용은 이 브라우저 안에서만 처리됩니다.</p></div>`,
    mount(root) {
      const items = root.querySelectorAll('#load-steps li');
      items.forEach((li, i) => setTimeout(() => { li.classList.add('done'); li.textContent = '✓ ' + steps[i]; }, 220 * (i + 1)));
    },
  };
}
