// 습관 도감: 고정 판의 장부(사람 검수 판)에서 실제로 나온 A등급 오류, 확인 습관, 막는 지시, 회사·지시 방식별 빈도
import { useEffect, useState } from 'react';
import { api, modelName } from '../api.js';

const STYLE_KO = { base: '기본', rough: '한 번에', careful: '잘 맡김', lead: '팀장 모드' };
export default function Patterns() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.patterns().then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <main><p className="error">{error}</p></main>;
  if (!d) return <main><p className="muted">불러오는 중…</p></main>;
  return (
    <main>
      <h1>습관 도감</h1>
      <p>고정 미션의 작업 기록에서 실제로 나온 A등급 오류를 패턴별로 모았습니다. 「사람 검수」는 만든 사람이 원자료와 대조해 확정한 것, 「AI 감사」는 아직 사람 확인 전인 것입니다. 예시는 사람 검수 판에서만 가져오고, 그 판을 결재한 뒤에 열립니다(풀기 전에 정답이 새지 않게).</p>
      {!d.patterns.length && <p className="muted">아직 모인 패턴이 없습니다.</p>}
      {d.patterns.map((p) => (
        <section key={p.pattern} className="sheet pattern">
          <h2>{p.pattern} <span className="small muted">사람 검수 {p.reviewed} · AI 감사 {p.ai}</span></h2>
          <p><b>확인 습관:</b> {p.habit}</p>
          <p className="small muted">작업 모델 회사별 {Object.entries(p.byCompany).map(([k, v]) => `${k} ${v}`).join(' · ')} / 맡긴 방식별 {Object.entries(p.byStyle).map(([k, v]) => `${STYLE_KO[k] ?? k} ${v}`).join(' · ')}</p>
          {p.lockedExamples > 0 && <p className="small notice">이 유형의 실제 예문 {p.lockedExamples}개는 {p.lockedRuns.map((r) => <a key={r} href={`#/r/${r}`}>그 판</a>)}을 결재하면 열립니다.</p>}
          {p.examples.map((e, i) => (
            <div key={i} className="example">
              <p>{e.wrongText ? `「${e.wrongText}」` : <span className="muted">(틀린 문장이 아니라 빠뜨린 내용)</span>} <span className="small muted">({modelName(e.worker)} 판 {e.origin}{e.spread.length ? ` → ${e.spread.join(' → ')}` : ''})</span></p>
              <p className="small">{e.why}</p>
              {e.prevent && <p className="small"><b>막는 지시:</b> {e.prevent}</p>}
              <a className="small" href={`#/r/${e.runId}`}>이 판 검수해 보기</a>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
