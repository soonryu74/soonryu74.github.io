import rulesData from '../data/care_gap_rules.json';
import type {
  CareInput, Condition, ConditionTrace, DomainDef, DomainResult, EvaluationResult, FactValue, Facts, Op, Rule, RuleMatch, When,
} from '../types';
import { computeFacts } from './facts';

export const RULES = rulesData.rules as Rule[];
export const DOMAINS = rulesData.domains as DomainDef[];
const FACT_DEFS = rulesData.facts as Record<string, { label: string; unit: string }>;

export function factLabel(fact: string): string {
  return FACT_DEFS[fact]?.label ?? fact;
}

export function formatFact(fact: string, v: FactValue): string {
  const unit = FACT_DEFS[fact]?.unit;
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'string') return v;
  switch (unit) {
    case 'hours': return `주 ${v}시간`;
    case 'days': return `${v}일`;
    case 'meals': return `${v}끼`;
    case 'count': return `${v}회`;
    default: return String(v);
  }
}

const OP_TEXT: Record<Op, string> = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' };

function test(op: Op, actual: FactValue, expected: number | boolean): boolean {
  switch (op) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'gt': return typeof actual === 'number' && actual > (expected as number);
    case 'gte': return typeof actual === 'number' && actual >= (expected as number);
    case 'lt': return typeof actual === 'number' && actual < (expected as number);
    case 'lte': return typeof actual === 'number' && actual <= (expected as number);
  }
}

function isCondition(x: Condition | When): x is Condition {
  return (x as Condition).fact !== undefined;
}

/** 조건 트리를 평가하고, 설명용으로 각 조건의 실제 값을 기록한다. */
function evalWhen(when: When, facts: Facts, trace: ConditionTrace[]): boolean {
  const items = 'all' in when ? when.all : when.any;
  const results = items.map((c) => {
    if (!isCondition(c)) return evalWhen(c, facts, trace);
    if (!(c.fact in facts)) throw new Error(`규칙이 존재하지 않는 사실을 참조합니다: ${c.fact}`);
    const actual = facts[c.fact];
    const passed = test(c.op, actual, c.value);
    trace.push({
      fact: c.fact, label: factLabel(c.fact), op: c.op, expected: c.value, actual,
      actualText: formatFact(c.fact, actual), expectedText: `${OP_TEXT[c.op]} ${formatFact(c.fact, c.value)}`, passed,
    });
    return passed;
  });
  return 'all' in when ? results.every(Boolean) : results.some(Boolean);
}

export function fillTemplate(tpl: string, facts: Facts): string {
  return tpl.replace(/\{([\w.]+)\}/g, (_, k: string) => (k in facts ? formatFact(k, facts[k]) : `{${k}}`));
}

export function evaluateFacts(facts: Facts): EvaluationResult {
  const domains: DomainResult[] = DOMAINS.map((domain) => {
    const matches: RuleMatch[] = [];
    for (const rule of RULES.filter((r) => r.domain === domain.id)) {
      const trace: ConditionTrace[] = [];
      if (evalWhen(rule.when, facts, trace)) {
        // any 안에서 통과하지 못한 조건은 설명에서 뺀다(실제 근거만 보여주기)
        const shown = trace.filter((t) => t.passed);
        matches.push({ ruleId: rule.id, result: rule.result, reason: fillTemplate(rule.reason, facts), conditions: shown });
      }
    }
    const checks = matches.filter((m) => m.result === 'check');
    if (checks.length) return { domain, status: 'check', reason: checks[0].reason, matches: checks };
    const covered = matches.filter((m) => m.result === 'covered');
    if (covered.length) return { domain, status: 'covered', reason: covered[0].reason, matches: covered };
    return { domain, status: 'no_gap', reason: domain.noGapText, matches: [] };
  });
  // 확인 필요 → 확인됨 → 공백 발견 안 됨 순서(같은 상태 안에서는 정의 순서 유지)
  const order = { check: 0, covered: 1, no_gap: 2 } as const;
  domains.sort((a, b) => order[a.status] - order[b.status]);
  return { facts, domains, checkCount: domains.filter((d) => d.status === 'check').length };
}

export function evaluate(input: CareInput): EvaluationResult {
  return evaluateFacts(computeFacts(input));
}

/** 설명 화면용: 한 영역의 모든 규칙을 조건별 통과 여부와 함께 돌려준다(일치하지 않은 규칙 포함). */
export function traceDomain(domainId: string, facts: Facts): { rule: Rule; matched: boolean; conditions: ConditionTrace[] }[] {
  return RULES.filter((r) => r.domain === domainId).map((rule) => {
    const conditions: ConditionTrace[] = [];
    const matched = evalWhen(rule.when, facts, conditions);
    return { rule, matched, conditions };
  });
}
