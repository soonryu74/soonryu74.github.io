import { PERSONAS } from '../../data/personas.js';
import { esc } from '../ui.js';

export function view(ctx) {
  const personas = PERSONAS.slice(0, 3);
  const html = `
<section class="hero">
  <div class="kicker">RE:ON AI · 경력전환 내비게이터</div>
  <h1>다시ON AI</h1>
  <p class="slogan">경력을 다시 켜다</p>
  <p class="copy">지금까지 해온 일,<br>다음 직업의 자산이 됩니다.</p>
  <div class="actions" style="justify-content:center;margin-top:0">
    <a class="btn btn-primary btn-lg" href="#/input" data-testid="cta-start">3분 만에 내 다음 직업 찾기</a>
    ${ctx.state.judge ? '<button class="btn btn-teal btn-lg" data-action="judge-start" data-testid="judge-start">90초 데모 시작</button>' : ''}
  </div>
  <p class="muted small" style="margin-top:14px">회원가입 없음 · 입력 내용은 이 브라우저에만 머물고 서버에 저장되지 않습니다</p>
</section>

<section class="card">
  <h2 style="margin-top:0">예시로 체험하기</h2>
  <p class="muted">가상의 사례를 한 번에 입력해 전체 흐름을 바로 볼 수 있습니다.</p>
  <div class="persona-row">
    ${personas.map((p) => `<button class="persona-btn" data-action="persona" data-id="${p.id}" data-testid="persona-${p.id}"><b>${esc(p.name)}</b><span>${esc(p.short)}</span></button>`).join('')}
  </div>
</section>

<h2>어떻게 작동하나요?</h2>
<div class="flow">
  ${['경력 입력', 'AI 경력 번역', '전환직무 TOP3', '역량 Gap', '훈련', '채용'].map((s, i, a) => `<div class="step">${s}</div>${i < a.length - 1 ? '<span class="arrow" aria-hidden="true">→</span>' : ''}`).join('')}
</div>
<p class="muted" style="text-align:center">직업 이름을 몰라도 됩니다. "내가 해온 일"에서 시작합니다.</p>

<div class="trust">
  <div><b>설명 가능한 추천</b>점수만 주지 않습니다. 어떤 경험이 어떤 능력과 연결됐는지 문장으로 보여주고, 근거를 열어볼 수 있습니다.</div>
  <div><b>사람이 최종 결정</b>AI가 뽑은 역량을 직접 고치고 지우고 더할 수 있습니다. AI는 제안만 합니다.</div>
  <div><b>개인정보 보호</b>주민번호·주소 같은 민감정보를 묻지 않습니다. 입력은 이 브라우저에만 저장되고 언제든 지울 수 있습니다.</div>
</div>`;
  return {
    title: '다시ON AI — 경력을 다시 켜다',
    html,
    mount(root) {
      root.querySelectorAll('[data-action="persona"]').forEach((b) => b.addEventListener('click', () => ctx.loadPersona(b.dataset.id, { autoRun: true })));
      root.querySelector('[data-action="judge-start"]')?.addEventListener('click', () => ctx.loadPersona('B', { autoRun: true }));
    },
  };
}
