import type { Reason, Status } from './engine';
import type { StoredLog } from './storage';

// 색만으로 구분하지 않는다. 글자와 기호를 함께 쓴다.
export const STATUS: Record<Status, { label: string; icon: string; hint: string }> = {
  idle: { label: '대기', icon: '○', hint: '감시를 시작하지 않았습니다.' },
  normal: { label: '정상', icon: '♥', hint: '심박을 받고 있습니다.' },
  unworn: { label: '미착용', icon: '⌚', hint: '워치를 차 주세요.' },
  disconnected: { label: '연결 끊김', icon: '⇄', hint: '워치 신호를 기다리는 중입니다. 경보가 아닙니다.' },
  checking: { label: '본인 확인', icon: '?', hint: '괜찮으시면 버튼을 눌러 주세요.' },
  alert: { label: '경보', icon: '!', hint: '경보 상태입니다.' },
};

export const REASON: Record<Reason, string> = {
  STARTED: '감시 시작',
  STOPPED: '감시 종료',
  HR_OK: '심박 수신',
  NO_CONTACT: '접촉 미감지',
  HR_ZERO: '심박 0 수신',
  NO_SIGNAL: '10초 이상 수신 없음',
  LINK_LOST: '연결 해제',
  LOW_HR_SUSTAINED: '낮은 심박 지속',
  SUDDEN_DROP: '심박 급락',
  SUDDEN_DROP_LOGGED: '심박 급락(기록만)',
  NO_RESPONSE: '본인 확인 무응답',
  MANUAL_SOS: '직접 SOS',
  USER_OK: '본인이 괜찮다고 응답',
  USER_DISMISS: '본인이 해제',
  GUARDIAN_DISMISS: '보호자가 해제',
};

const pad = (n: number) => String(n).padStart(2, '0');
export function formatTime(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function toCsv(log: StoredLog[]): string {
  const head = ['시각', '이전 상태', '새 상태', '심박', '사유', '사유 코드', '원래 사유 코드', '모의 여부'];
  const rows = log.map((e) => [
    formatTime(e.t),
    STATUS[e.from].label,
    STATUS[e.to].label,
    e.bpm ?? '',
    REASON[e.reason],
    e.reason,
    e.cause ?? '',
    e.mock ? '모의' : '실제',
  ]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  // 엑셀에서 한글이 깨지지 않게 맨 앞에 BOM을 붙인다.
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}
