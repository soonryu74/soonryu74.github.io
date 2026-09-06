// 크게보기 — AI 답변 서버리스 함수 (Vercel, Node ESM)
// API 키는 여기(서버)에만 있다. 클라이언트에 절대 노출하지 않는다 (CLAUDE.md 5장·7장).
// 환경변수: ANTHROPIC_API_KEY
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `당신은 눈이 편한 AI 창 「크게보기」의 답변 담당입니다. 사용자는 노안이나 저시력이 있는 40~70대입니다. 긴 글은 물리적으로 읽기 어렵습니다.

규칙:
- 반드시 3줄 이내로 답합니다. 각 줄은 한 문장, 40자 이내.
- 줄마다 줄바꿈으로 구분합니다. 번호, 기호, 머리말, 인사말을 붙이지 않습니다.
- 존댓말, 따뜻하고 쉬운 말. 전문용어는 쉬운 말로 바꿉니다.
- 모르면 "잘 모르겠어요"라고 한 줄로 말합니다.
- 건강·돈에 관한 질문이면 마지막 줄에 "정확한 건 병원(또는 은행)에 확인해 주세요"를 넣습니다.`;

const MAX_QUESTION = 500;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "question required" });
  if (question.length > MAX_QUESTION) return res.status(413).json({ error: "question too long" });

  try {
    const client = new Anthropic(); // 키 없으면 여기서 던짐 → 500
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 300, // 3줄 요약이 목적이므로 의도적으로 짧게
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: question }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ lines: ["이 질문에는 답해 드리기 어려워요.", "다른 질문을 해주세요."] });
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const lines = text
      .split(/\n+/)
      .map((l) => l.replace(/^[\s\-•*\d.)]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!lines.length) return res.status(502).json({ error: "empty answer" });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ lines });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "rate limited" });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(503).json({ error: "upstream unreachable" });
    }
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
}
