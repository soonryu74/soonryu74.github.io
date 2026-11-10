// 이 단계에서는 모든 자료를 이 기기(브라우저)에만 저장한다. 서버 전송 없음.
import { DEFAULT_THRESHOLDS, type Thresholds } from './config';
import type { LogEntry } from './engine';

export interface StoredLog extends LogEntry {
  /** 모의 모드에서 나온 기록인지 */
  mock: boolean;
}

const K = { consent: 'hg.consent', settings: 'hg.settings', log: 'hg.log' };
const MAX_LOG = 2000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 공간이 막힌 환경(사생활 보호 창 등)에서도 화면은 동작해야 한다 */
  }
}

export const loadConsent = () => read<boolean>(K.consent, false);
export const saveConsent = (v: boolean) => write(K.consent, v);

export const loadSettings = (): Thresholds => ({
  ...DEFAULT_THRESHOLDS,
  ...read<Partial<Thresholds>>(K.settings, {}),
});
export const saveSettings = (t: Thresholds) => write(K.settings, t);

export const loadLog = () => read<StoredLog[]>(K.log, []);
export const saveLog = (l: StoredLog[]) => write(K.log, l.slice(-MAX_LOG));
