// 다른 사람들의 누적 기록(만든 사람 제외, 같은 기기·같은 판은 첫 풀이만). 순위가 아니라 분포만 보여 준다
/** 가로 막대 분포. hist[k] = k개를 맞힌(찾은) 사람 수. mine = 내 값(없으면 null) */
export function CrowdHist({ hist, mine = null, unit = '개', label = '찾음', mineLabel = '나' }) {
  const max = Math.max(1, ...hist);
  const rows = hist.map((n, k) => ({ k, n })).reverse();
  return (
    <ul className="crowd-hist" aria-label="다른 사람들의 분포">
      {rows.map(({ k, n }) => (
        <li key={k} className={mine === k ? 'me' : undefined}>
          <span className="ch-k">{k}{unit} {label}</span>
          <span className="ch-bar" aria-hidden="true"><span style={{ width: `${(n / max) * 100}%` }} /></span>
          <span className="ch-n">{n}명{mine === k ? ` · ${mineLabel}` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/** 사수 모드 결과: 이 판을 처음 푼 다른 사람들 */
export function RunCrowd({ crowd, mine, maker, retried = false }) {
  if (!crowd || !crowd.n) return null;
  const { n, A, hist, avgFound, decisionOk, approvedWrongly } = crowd;
  return (
    <section className="crowd" aria-label="다른 사람들은 어땠나">
      <h2>다른 사람들은 어땠나</h2>
      <p className="small muted">이 판을 처음 푼 사람 {n}명{maker ? '' : retried ? '(내 첫 풀이 포함, 이번에 다시 푼 기록은 빠짐)' : '(나 포함)'}의 기록입니다. 만든 사람은 빼고, 같은 브라우저는 첫 풀이만 셉니다. 순위는 두지 않습니다.</p>
      <CrowdHist hist={hist} mine={mine} mineLabel={retried ? '이번 풀이' : '나'} />
      <p>평균 A {avgFound}/{A}개 · 결재를 맞힌 사람 {decisionOk}/{n}명{approvedWrongly ? ` · 반려해야 할 판을 승인한 사람 ${approvedWrongly}명` : ''}.{crowd.maker ? ` 만든 사람도 정답표를 보기 전 처음 풀 때 ${crowd.maker.foundA}/${A}개를 찾았습니다.` : ''}</p>
      {n < 5 && <p className="small muted">아직 {n}명이라 우연이 큽니다. 사람이 늘면 그대로 다시 셉니다.</p>}
    </section>
  );
}
