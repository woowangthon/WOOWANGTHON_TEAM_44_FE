// 내 실력(F5): 오류 유형별 숙련도(표본이 적으면 「아직 이르다」), 근거 대조·짧은 연습, 판별 기록. 순위표는 두지 않는다
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Me() {
  const [h, setH] = useState(null);
  const [skill, setSkill] = useState(null);
  const [drill, setDrill] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.history().then((r) => { setH(r.history); setSkill(r.skill ?? null); }).catch((e) => setError(e.message));
    api.drill('history').then(setDrill).catch(() => {});
  }, []);
  if (error) return <main><p className="error">{error}</p></main>;
  if (!h) return <main><p className="muted">불러오는 중…</p></main>;
  const shadow = h.filter((x) => x.kind === 'shadow');
  const lead = h.filter((x) => x.kind === 'lead');
  return (
    <main>
      <h1>내 실력</h1>
      <p className="small muted">이 브라우저의 무작위 번호로만 모읍니다. 남과 견주는 순위는 두지 않고, 내 변화만 보여 줍니다. 표본이 적으면 「아직 이릅니다」라고 그대로 적습니다.</p>
      <section className="sheet" aria-label="오류 유형별 숙련도">
        <h2 style={{ marginTop: 0 }}>오류 유형별로 찾은 정도</h2>
        {skill?.patterns?.length ? (<>
          <ul className="skill-list">{[...skill.patterns].sort((a, b) => a.mastery - b.mastery).map((p) => (
            <li key={p.pattern}><span>{p.pattern}</span><span className="skill-bar" aria-hidden="true"><span style={{ width: `${Math.round(p.mastery * 100)}%` }} /></span><span className="skill-n">찾음 {p.found}/{p.n}{p.early ? ' · 아직 이름' : ''}</span></li>
          ))}</ul>
          <p className="small muted">막대 = (찾음 + 1) ÷ (만난 수 + 2). 처음엔 절반에서 시작해 판이 쌓일수록 실제 비율에 가까워집니다. {skill.runs}판 기준, 최신 사람 검수 장부로 다시 셉니다.</p>
          {(() => { const weak = [...skill.patterns].filter((p) => !p.early).sort((a, b) => a.mastery - b.mastery)[0]; return weak ? <p>다음 추천: <b>{weak.pattern}</b>이 가장 약합니다. <a href="#/patterns">습관 도감</a>에서 이 유형의 확인 습관을 보고, <a href="#/drill">짧은 연습</a>으로 이어 가세요.</p> : <p className="small">아직 판단하기 이릅니다(유형마다 3번 이상 만나야 추천합니다).</p>; })()}
        </>) : <p className="muted">아직 판을 풀지 않았습니다. <a href="#/">오늘의 연습</a>에서 시작하세요.</p>}
      </section>
      {drill?.summary?.n > 0 && (
        <section className="sheet" style={{ marginTop: 14 }} aria-label="짧은 연습">
          <h2 style={{ marginTop: 0 }}>짧은 연습 {drill.summary.n}문항</h2>
          <p>맞힘 {drill.summary.correct}/{drill.summary.n} · 맞는 문장을 틀렸다고 함 {drill.summary.okAsError} · 틀린 문장을 맞다고 함 {drill.summary.errorAsOk}</p>
          <p className="small muted">{drill.summary.errorAsOk > drill.summary.okAsError ? '틀린 문장을 그대로 믿는 쪽으로 빗나갑니다. 조건·기간이 원자료와 같은지 한 번 더 보세요.' : drill.summary.okAsError > drill.summary.errorAsOk ? '맞는 문장도 의심하는 쪽으로 빗나갑니다. 원자료 문단을 짚어 근거를 확인한 뒤에 틀렸다고 해 보세요.' : '두 방향으로 고르게 빗나갑니다.'}</p>
        </section>
      )}
      <h2>판 검수 기록(사수 모드) {shadow.length}판</h2>
      {shadow.length ? (
        <table className="eval-table">
          <thead><tr><th>#</th><th>판</th><th>A 찾음</th><th>헛짚음</th><th>판정</th><th>근거 보고 그음</th><th>시간</th></tr></thead>
          <tbody>{shadow.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td><a href={`#/r/${x.runId}`}>{x.runId}</a></td><td>{x.A != null ? `${x.foundA}/${x.A}` : '검수 대기'}</td><td>{x.falseMarks ?? '—'}</td><td>{x.decisionOk == null ? '—' : x.decisionOk ? '맞음' : '틀림'}</td><td>{x.evidence ? `${x.evidence.checked ?? 0}/${x.evidence.found ?? 0}` : '—'}</td><td>{x.elapsedSec ? `${Math.round(x.elapsedSec / 60)}분` : '—'}</td></tr>)}</tbody>
        </table>
      ) : <p className="muted">아직 없습니다. <a href="#/">오늘의 연습</a>에서 시작하세요.</p>}
      {shadow.length >= 3 && <Trend rows={shadow.filter((x) => x.A)} />}
      <h2>직접 맡기기(팀장 모드) {lead.length}판</h2>
      {lead.length ? (
        <table className="eval-table">
          <thead><tr><th>#</th><th>미션</th><th>최종본 A(AI 감사)</th><th>반려로 막은 A</th><th>원자료 대조</th><th>뒤 단계에 원자료</th><th>근거 요구</th><th>날짜 기준</th></tr></thead>
          <tbody>{lead.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td>{x.missionId}</td><td>{x.Afinal}</td><td>{x.blocked}</td><td>{x.sourceViews}</td><td>{x.habits?.sourcesToLater ? '○' : '×'}</td><td>{x.habits?.evidence ? '○' : '×'}</td><td>{x.habits?.date ? '○' : '×'}</td></tr>)}</tbody>
        </table>
      ) : <p className="muted">아직 없습니다.</p>}
    </main>
  );
}

function Trend({ rows }) {
  const half = Math.floor(rows.length / 2);
  const rate = (xs) => (xs.length ? Math.round((100 * xs.reduce((s, x) => s + (x.A - x.foundA), 0)) / Math.max(1, xs.reduce((s, x) => s + x.A, 0))) : null);
  const a = rate(rows.slice(0, half)), b = rate(rows.slice(half));
  return <p>놓친 A 비율: 앞의 {half}판 {a}% → 뒤의 {rows.length - half}판 {b}%. 판이 적어 우연일 수 있습니다.</p>;
}
