// AI 출력 검증 현황. 숫자는 모두 서버 세션 상태(state.metrics)의 실제 집계다.
const ITEMS = [
  { k: 'llm_calls', label: '호출', unit: '회', help: '이 세션에서 Claude API를 부른 횟수' },
  { k: 'citations_shown', label: '인용 원문 대조 통과', unit: '건', help: '매뉴얼 원문과 글자 하나까지 맞아 화면에 올린 인용(사건이 갱신될 때마다 다시 대조, 누적)' },
  { k: 'citations_blocked', label: '막은 인용', unit: '건', help: '원문과 글자가 달라 화면에 올리지 않은 인용', bad: true },
  { k: 'facts_verified', label: '사실 근거 구절 확인', unit: '건', help: 'AI가 신호에서 뽑은 사실 중 본문에 근거 구절이 그대로 있는 것' },
  { k: 'facts_rejected', label: '버린 사실', unit: '건', help: '본문에 근거 구절이 없어 버린 사실', bad: true },
  { k: 'draft_claims_checked', label: '초안 수치·시각 대조', unit: '개', help: '보고 초안의 수치와 시각을 근거 신호와 대조한 개수' },
  { k: 'draft_warnings', label: '초안 경고', unit: '건', help: '두 번째 답에서도 근거 없는 수치·내부 코드가 남아 초안에 경고를 단 건수', bad: true },
  { k: 'check_failures', label: '검증에 걸린 답', unit: '건', help: 'AI 답이 검증에 걸린 횟수. 걸리면 사유를 붙여 한 번 다시 묻고, 그래도 걸리면 막거나 경고를 답니다', warn: true },
];

export default function VerifyBar({ session }) {
  const m = session?.metrics;
  if (!m) return null;
  const n = (k) => m[k] ?? 0;
  return (
    <div className="verify-bar" aria-label="AI 검증 현황">
      <span className="vb-title" title="AI가 쓴 내용을 원문과 근거 신호에 대조한 결과입니다. 숫자는 모두 실제 집계입니다.">AI 검증</span>
      {ITEMS.map((it) => {
        const v = n(it.k);
        return (
          <span key={it.k} className={`vb-item ${it.bad && v ? 'bad' : ''} ${it.warn && v ? 'warn' : ''}`} title={it.help}>
            {it.label} <b key={v}>{v}</b>{it.unit}
          </span>
        );
      })}
      {n('ai_errors') > 0 && <span className="vb-item bad" title="AI 호출이 실패한 횟수. 실패해도 기준 판정과 권고 등급은 규칙표 결과로 유지됩니다">AI 실패 <b>{n('ai_errors')}</b>건</span>}
    </div>
  );
}
