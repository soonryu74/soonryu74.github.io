import { useEffect, useState, type ReactNode } from 'react';
import { SAFETY_NOTICE } from '../engine/share';
import { speak, stopSpeaking, ttsSupported } from '../engine/speech';
import { useStore } from '../state/store';
import { STATUS_LABEL, type CardStatus, type Service } from '../types';

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'safety safety-compact' : 'safety'} role="note" data-testid="safety-notice">
      <span className="safety-icon" aria-hidden="true">ⓘ</span> {SAFETY_NOTICE}
    </p>
  );
}

/** 음성 읽기 버튼. 지원하지 않는 브라우저에서는 안내만 한다. */
export function SpeakButton({ text, label = '읽어주기', className = '' }: { text: string; label?: string; className?: string }) {
  const { settings } = useStore();
  const [speaking, setSpeaking] = useState(false);
  const supported = ttsSupported();
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (!supported) return;
    const id = setInterval(() => setSpeaking(window.speechSynthesis.speaking), 400);
    return () => clearInterval(id);
  }, [supported]);
  if (!supported) {
    return <span className="muted small" data-testid="tts-unsupported">이 브라우저는 소리 읽기를 지원하지 않아요.</span>;
  }
  return (
    <button
      type="button"
      className={`btn btn-outline ${className}`}
      data-testid="tts-button"
      aria-pressed={speaking}
      onClick={() => {
        if (speaking) { stopSpeaking(); setSpeaking(false); }
        else { speak(text, settings.ttsRate); setSpeaking(true); }
      }}
    >
      <span aria-hidden="true">{speaking ? '■' : '🔊'}</span> {speaking ? '읽기 멈춤' : label}
    </button>
  );
}

export function PhoneLink({ phone, label, big = false }: { phone: string; label?: string | null; big?: boolean }) {
  return (
    <a className={big ? 'btn btn-primary btn-lg phone' : 'phone-inline'} href={`tel:${phone.replace(/[^\d+]/g, '')}`} aria-label={`${label ? label + ' ' : ''}${phone}에 전화하기`}>
      <span aria-hidden="true">📞</span> {label ? `${label} ` : ''}<b>{phone}</b>
    </a>
  );
}

export function StatusBadge({ status }: { status: CardStatus }) {
  const icon = status === 'check_first' ? '✔' : status === 'needs_condition' ? '?' : '…';
  return (
    <span className={`badge badge-${status}`} data-status={status}>
      <span aria-hidden="true">{icon}</span> {STATUS_LABEL[status]}
    </span>
  );
}

export function OfficialLink({ service, className = 'btn btn-ghost' }: { service: Service; className?: string }) {
  if (!service.official_url) {
    return <span className="pending-link" data-testid="link-pending">공식 링크 확인 중 — 129 또는 신청기관에 문의하세요</span>;
  }
  return (
    <a className={className} href={service.official_url} target="_blank" rel="noopener noreferrer">
      공식 사이트로 이동 <span className="sr-only">(새 창)</span><span aria-hidden="true">↗</span>
    </a>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="back" href={href}>
      <span aria-hidden="true">←</span> {children}
    </a>
  );
}

export function PageTitle({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{children}</h1>
    </>
  );
}
