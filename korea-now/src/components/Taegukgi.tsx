// 태극기 — 도안을 눈대중으로 그리면 태극 곡선이 틀어지므로,
// 공개 표준 도안(위키미디어 Flag of South Korea, 퍼블릭 도메인)의 좌표를 그대로 쓴다.
//   깃면 144×96 (3:2) · 원점이 깃면 중심 · 태극 지름 48 (= 세로의 1/2)
//   태극과 4괘 모두 깃면 대각선(33.69°) 기준으로 돌아가 있다.
//   4괘: 건 ☰ 좌상 · 감 ☵ 우상 · 리 ☲ 좌하 · 곤 ☷ 우하

const ANGLE = 33.69006752598

export default function Taegukgi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-72 -48 144 96" role="img" aria-label="Flag of Korea">
      <path fill="#fff" d="M-72-48v96H72v-96z" />
      {/* 4괘 — 효는 굵기 4의 선분으로 그린다 */}
      <g stroke="#000" strokeWidth="4">
        {/* 건(좌상) · 곤(우하) */}
        <path
          transform={`rotate(${ANGLE})`}
          d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11"
        />
        {/* 리(좌하) · 감(우상) */}
        <path
          transform={`rotate(${-ANGLE})`}
          d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11"
        />
      </g>
      {/* 태극 */}
      <g transform={`rotate(${ANGLE})`}>
        <path fill="#cd2e3a" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0" />
        <path fill="#0047a0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0" />
      </g>
    </svg>
  )
}
