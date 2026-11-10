// 심박 입력원. 모의 모드와 (4단계에서 추가할) 블루투스 워치가 같은 모양을 쓴다.
import { scenarioById, type ScenarioId } from './scenarios';

export interface SourceHandlers {
  onSample: (bpm: number, contact: boolean | null) => void;
  onLinkLost: () => void;
}

export interface HrSource {
  readonly kind: 'mock' | 'bluetooth';
  start(handlers: SourceHandlers): void;
  stop(): void;
}

export class MockSource implements HrSource {
  readonly kind = 'mock' as const;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sec = 0;
  private scenario: ScenarioId;
  private handlers: SourceHandlers | null = null;

  constructor(scenario: ScenarioId = 'normal') {
    this.scenario = scenario;
  }

  /** 시나리오를 바꾸면 처음(0초)부터 다시 재생한다. */
  setScenario(id: ScenarioId) {
    this.scenario = id;
    this.sec = 0;
  }

  start(handlers: SourceHandlers) {
    this.stop();
    this.handlers = handlers;
    this.sec = 0;
    this.emit();
    this.timer = setInterval(() => this.emit(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.handlers = null;
  }

  private emit() {
    const m = scenarioById(this.scenario).at(this.sec);
    this.sec += 1;
    if (m && this.handlers) this.handlers.onSample(m.bpm, m.contact);
  }
}
