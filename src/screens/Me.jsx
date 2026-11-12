// 내 기록: 판마다 결과 지표의 추세. 사람이 적으면 추세를 말하지 않고 그대로 보여 준다
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Me() {
  const [h, setH] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.history().then((r) => setH(r.history)).catch((e) => setError(e.message)); }, []);
  if (error) return <main><p className="error">{error}</p></main>;
  if (!h) return <main><p className="muted">불러오는 중…</p></main>;
  const shadow = h.filter((x) => x.kind === 'shadow');
  const lead = h.filter((x) => x.kind === 'lead');
  return (
    <main>
      <h1>내 기록</h1>
      <p className="small muted">이 브라우저의 무작위 번호로만 모읍니다. 판이 3개 이상 쌓이기 전에는 추세를 말하지 않습니다.</p>
      <h2>검수(사수 모드) {shadow.length}판</h2>
      {shadow.length ? (
        <table className="eval-table">
          <thead><tr><th>#</th><th>판</th><th>A 찾음</th><th>헛짚음</th><th>판정</th><th>원자료 대조</th><th>시간</th></tr></thead>
          <tbody>{shadow.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td><a href={`#/r/${x.runId}`}>{x.runId}</a></td><td>{x.A != null ? `${x.foundA}/${x.A}` : '검수 대기'}</td><td>{x.falseMarks ?? '—'}</td><td>{x.decisionOk == null ? '—' : x.decisionOk ? '맞음' : '틀림'}</td><td>{x.sourceViews}</td><td>{x.elapsedSec ? `${Math.round(x.elapsedSec / 60)}분` : '—'}</td></tr>)}</tbody>
        </table>
      ) : <p className="muted">아직 없습니다. <a href="#/">미션</a>에서 시작하세요.</p>}
      {shadow.length >= 3 && <Trend rows={shadow.filter((x) => x.A)} />}
      <h2>맡기기(팀장 모드) {lead.length}판</h2>
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
