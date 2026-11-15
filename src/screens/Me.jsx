// 내 실력(F5): 오류 유형별 숙련도(표본이 적으면 「아직 이르다」), 근거 대조·짧은 연습, 판별 기록. 순위표는 두지 않는다
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Me() {
  const [h, setH] = useState(null);
  const [skill, setSkill] = useState(null);
  const [others, setOthers] = useState(null);
  const [habits, setHabits] = useState({});
  const [drill, setDrill] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.history().then((r) => { setH(r.history); setSkill(r.skill ?? null); setOthers(r.others ?? null); setHabits(r.habits ?? {}); }).catch((e) => setError(e.message));
    api.drill('history').then(setDrill).catch(() => {});
  }, []);
  if (error) return <main><p className="error">{error}</p></main>;
  if (!h) return <main><p className="muted">불러오는 중…</p></main>;
  const shadow = h.filter((x) => x.kind === 'shadow');
  const lead = h.filter((x) => x.kind === 'lead');
  return (
    <main>
      <h1>내 실력</h1>
      <p className="small muted">이 브라우저의 무작위 번호로만 모읍니다. 순위표는 두지 않고, 다른 사람들의 누적 기록(만든 사람 제외, 판마다 첫 풀이만)과 나란히 보여 줍니다. 표본이 적으면 「아직 이릅니다」라고 그대로 적습니다. 다른 기기에서 이어 보려면 <a href="#/account">기록 보관</a>에서 기록 코드를 쓰거나 계정을 만드세요.</p>
      <Compare shadow={h.filter((x) => x.kind === 'shadow' && x.A != null)} others={others} mock={drill?.mock} />
      <section className="sheet" aria-label="오류 유형별 숙련도">
        <h2 style={{ marginTop: 0 }}>오류 유형별로 찾은 정도</h2>
        {skill?.patterns?.length ? (<>
          <ul className="skill-list">{[...skill.patterns].sort((a, b) => (a.early - b.early) || (a.mastery - b.mastery)).map((p) => (
            <li key={p.pattern} className={p.early ? 'early' : undefined}><span>{p.pattern}</span><span className="skill-bar" aria-hidden="true"><span style={{ width: `${Math.round(p.mastery * 100)}%` }} /></span><span className="skill-n">찾음 {p.found}/{p.n}{p.early ? ' · 아직 이름' : ''}{(() => { const o = others?.patterns?.find((x) => x.pattern === p.pattern); return o?.n ? <em className="muted"> · 다른 사람 {o.rate}%({o.found}/{o.n})</em> : null; })()}</span></li>
          ))}</ul>
          <p className="small muted">막대 = (찾음 + 1) ÷ (만난 수 + 2). 처음엔 절반에서 시작해 판이 쌓일수록 실제 비율에 가까워집니다. 3번 미만 만난 유형은 회색 막대로 둡니다. {skill.runs}판 기준, 최신 사람 검수 장부로 다시 셉니다.</p>
          <Tips patterns={skill.patterns} habits={habits} />
          {(() => { const weak = [...skill.patterns].filter((p) => !p.early).sort((a, b) => a.mastery - b.mastery)[0]; return weak ? <p>다음 추천: <b>{weak.pattern}</b>이 가장 약합니다. <a href="#/patterns">습관 도감</a>에서 이 유형의 확인 습관을 보고, <a href="#/drill">짧은 연습</a>으로 이어 가세요.</p> : <p className="small">아직 판단하기 이릅니다(유형마다 3번 이상 만나야 추천합니다).</p>; })()}
        </>) : <p className="muted">아직 판을 풀지 않았습니다. <a href="#/mock">모의 문제집</a>(약 5분)이나 <a href="#/">오늘의 연습</a>에서 시작하세요.</p>}
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
          <tbody>{shadow.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td><a href={`#/r/${x.runId}`}>{x.runId}</a>{x.first === false ? <span className="small muted"> · 다시 풂</span> : null}</td><td>{x.A != null ? `${x.foundA}/${x.A}` : '검수 대기'}</td><td>{x.falseMarks ?? '—'}</td><td>{x.decisionOk == null ? '—' : x.decisionOk ? '맞음' : '틀림'}</td><td>{x.evidence ? `${x.evidence.checked ?? 0}/${x.evidence.found ?? 0}` : '—'}</td><td>{x.elapsedSec ? `${Math.round(x.elapsedSec / 60)}분` : '—'}</td></tr>)}</tbody>
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

/** 나와 다른 사람들 견주기: A를 찾은 비율, 결재를 맞힌 비율, 모의 문제집 */
function Compare({ shadow, others, mock }) {
  shadow = shadow.filter((x) => x.first !== false);
  const found = shadow.reduce((s, x) => s + (x.foundA ?? 0), 0); const all = shadow.reduce((s, x) => s + (x.A ?? 0), 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  if (!shadow.length && !others?.plays && !mock?.n) return null;
  return (
    <section className="sheet compare" aria-label="나와 다른 사람들">
      <h2 style={{ marginTop: 0 }}>나와 다른 사람들</h2>
      <table className="eval-table">
        <thead><tr><th></th><th>A등급 오류 찾은 비율</th><th>결재 맞힘</th></tr></thead>
        <tbody>
          <tr><td><b>나</b> ({shadow.length}판)</td>{shadow.length ? <><td>{`${pct(found, all)}% (${found}/${all})`}</td><td>{`${shadow.filter((x) => x.decisionOk).length}/${shadow.length}`}</td></> : <td colSpan={2} className="muted">아직 채점된 판이 없습니다</td>}</tr>
          <tr><td>다른 사람 {others?.people ?? 0}명 ({others?.plays ?? 0}판)</td><td>{others?.foundRate != null ? `${others.foundRate}%` : '—'}</td><td>{others?.decisionOkRate != null ? `${others.decisionOkRate}%` : '—'}</td></tr>
        </tbody>
      </table>
      {mock?.n > 0 && <p className="small">모의 문제집: {mock.n}문항 중 {mock.correct}개 맞힘(문항마다 처음 답 기준). 다른 사람들 분포는 <a href="#/mock">모의 문제집</a> 끝 화면에 있습니다.</p>}
      <p className="small muted">처음 하는 사람은 대개 최종본만 읽고 「틀린 데가 없다」고 봅니다. 다른 사람 숫자가 낮은 것도 그래서입니다. {(others?.people ?? 0) < 5 ? `아직 ${others?.people ?? 0}명이라 우연이 큽니다.` : ''}</p>
    </section>
  );
}

/** 요령: 내가 놓친 유형의 확인 습관(놓친 횟수가 많은 순, 최대 3개). 표본이 적어도 놓친 적이 있으면 보여 준다 */
function Tips({ patterns, habits }) {
  const weak = [...patterns].filter((p) => p.missed > 0).sort((a, b) => b.missed - a.missed || a.mastery - b.mastery).slice(0, 3);
  if (!weak.length) return null;
  return (
    <div className="learned">
      <h3 style={{ marginTop: 0 }}>요령 · 다음 판에서 먼저 볼 것</h3>
      <ul>{weak.map((p) => <li key={p.pattern}><b>{p.pattern}</b>(놓침 {p.missed}번): {habits[p.pattern] ?? ''}</li>)}</ul>
    </div>
  );
}
