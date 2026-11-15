// F4 짧은 연습: 판의 문장 하나와 원자료 문단을 보고 「맞다 / 틀렸다」를 고른다. 사람이 검수한 장부로 바로 확인한다(복습형: 결재한 판의 문장만)
// mode='mock'이면 모의 문제집: 판을 풀지 않아도 되는 고정 문항(서버 data/mock.json). 문항마다, 끝에 다른 사람들 분포를 보여 준다
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { PATTERNS } from '../ui/work.jsx';
import { CrowdHist } from '../ui/Crowd.jsx';

const INPUT_KO = { sources: '원자료', brief: '팀장 지시' };

export default function Drill({ mode = 'daily' }) {
  const mock = mode === 'mock';
  const NAME = mock ? '모의 문제집' : '짧은 연습';
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null); // 'ok' | 'error'
  const [pattern, setPattern] = useState('');
  const [fb, setFb] = useState(null);
  const [score, setScore] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fbs, setFbs] = useState([]);
  const shown = useRef(Date.now());
  const load = () => {
    setD(null); setError(''); setI(0); setScore([]); setFbs([]); setFb(null); setPick(null);
    (mock
      ? api.drill('mock').then((r) => (r.mock ? { ...r, set: { label: r.label }, note: '맞는 문장과 틀린 문장이 섞여 있습니다.' } : { questions: [], reason: '모의 문제집을 준비 중입니다.' }))
      : api.drill('next', { n: 3 })).then(setD).catch((e) => setError(e.message));
  };
  useEffect(load, []);
  useEffect(() => { shown.current = Date.now(); }, [i, d]);

  if (error) return <main className="drill"><p className="error">{error}</p></main>;
  if (!d) return <main className="drill"><p className="muted">문항을 불러오는 중…</p></main>;
  if (!d.questions?.length) return (
    <main className="drill">
      <h1>{NAME}</h1>
      <div className="sheet">
        <p>{d.reason ?? '오늘 풀 문항이 없습니다.'}</p>
        {d.locked && <p className="row-btns">{d.unlock?.length ? d.unlock.map((u) => <a key={u.runId} className="btn btn-primary" href={`#/r/${u.runId}`}>「{u.title}」 풀기</a>) : <a className="btn btn-primary" href="#/">판 하나 먼저 풀기</a>}<a className="btn" href="#/mock">모의 문제집부터</a></p>}
        <p className="small muted">짧은 연습은 결재까지 마친 판의 문장으로만 냅니다. 판을 풀기 전에 정답이 새지 않게 하려는 것입니다.</p>
      </div>
    </main>
  );
  const q = d.questions[i];
  const last = i === d.questions.length - 1;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.drill('answer', { qid: q.qid, verdict: pick, ...(mock ? { mock: true } : {}), ...(pick === 'error' && pattern ? { pattern } : {}), trace: { elapsedMs: Date.now() - shown.current, paraMs: Date.now() - shown.current, openedFull: false } });
      setFb(r); setScore([...score, r.correct]); setFbs([...fbs, r]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const next = () => { setFb(null); setPick(null); setPattern(''); setI(i + 1); window.scrollTo(0, 0); };
  const done = fb && last;
  return (
    <main className="drill">
      <h1>{NAME} <span className="small muted">{i + 1}/{d.questions.length}</span></h1>
      {mock && i === 0 && !fb && d.mock?.about && <p className="small">{d.mock.about} 판 하나(약 15분)보다 짧게, 문장 하나와 관련 원자료 문단만 보고 고릅니다.</p>}
      <div className="drill-progress" aria-hidden="true">{d.questions.map((x, k) => <i key={x.qid} className={k < score.length ? 'done' : ''} />)}</div>
      <p className="small muted">{d.set?.label ?? '사람 검수 장부 기준'} · {d.note}</p>
      <section className="sheet" aria-label="문항">
        <p className="small"><span className="stage-key">{q.stage.key}</span> <b>{q.stage.name}</b> <span className="muted">· 받은 것: {(q.stage.inputs ?? []).map((x) => INPUT_KO[x] ?? x).join(' · ')}</span></p>
        <p className="drill-unit">{q.text}</p>
        <div className="drill-src">
          <p className="small"><b>원자료</b> (이 문장과 관련된 문단)</p>
          <ol className="src-paras">{q.paras.map((p) => <li key={p.pid}><span className="pid">{p.pid}</span>{p.text}<span className="small muted"> — [{p.doc}] {p.docTitle}</span></li>)}</ol>
        </div>
        {!fb && <>
          <p className="decision-q" style={{ marginTop: 14 }}>이 문장은 원자료와 맞나요?</p>
          <div className="drill-choices" role="group" aria-label="판정">
            <button className={`decide decide-ok ${pick === 'ok' ? 'on' : ''}`} aria-pressed={pick === 'ok'} onClick={() => setPick('ok')}>맞다<span>원자료와 대조해 틀린 곳이 없다</span></button>
            <button className={`decide decide-no ${pick === 'error' ? 'on' : ''}`} aria-pressed={pick === 'error'} onClick={() => setPick('error')}>틀렸다<span>원자료와 다르거나 원자료에 없다</span></button>
          </div>
          {pick === 'error' && <label className="small">어떤 유형인가요?(선택)
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: '100%', fontSize: 16, padding: 8, border: '1px solid var(--line-2)', borderRadius: 0 }}>
              <option value="">모르겠음</option>{PATTERNS.map((p) => <option key={p}>{p}</option>)}
            </select></label>}
          <p className="row-btns"><button className="btn btn-primary" disabled={!pick || busy} onClick={submit}>{busy ? '확인 중…' : '확인'}</button></p>
        </>}
        {fb && (
          <div className={`drill-feedback ${fb.correct ? 'right' : 'wrong'}`} aria-live="polite">
            <p style={{ marginTop: 0 }}><b>{fb.correct ? '맞혔습니다.' : '아쉽습니다.'}</b> 정답표에서 이 문장은 <b>{fb.truth === 'ok' ? '오류가 아닙니다' : '오류입니다'}</b>.{fb.patternFeedback === 'same' ? ' 고른 유형도 같습니다.' : fb.patternFeedback === 'different' ? ' 고른 유형은 정답표와 다릅니다.' : ''}{fb.repeat ? ' (전에 푼 문항입니다)' : ''}</p>
            {fb.crowd?.n > 0 && <p className="small"><b>다른 사람들:</b> 이 문항을 푼 {fb.crowd.n}명 중 {fb.crowd.rate}%가 맞혔습니다.</p>}
            {fb.note && <p className="small">{fb.note}</p>}
            {(fb.items ?? []).map((it) => (
              <div key={it.id} className="small" style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
                <p><span className="tag tag-red">{it.pattern}</span>{it.wrongText ? <>「{it.wrongText}」 — </> : null}{it.why}</p>
                {it.fix && <p><b>고친 문장:</b> {it.fix}</p>}
                {it.habit && <p className="muted"><b>확인 습관:</b> {it.habit}</p>}
              </div>
            ))}
            {!mock && <p className="small muted">정답표가 틀렸다고 생각하면 그 판 결과 화면의 작업 기록에서 {fb.objection?.uid} 칸을 눌러 이의를 제기할 수 있습니다. <a href={`#/r/${fb.objection?.runId}`}>그 판으로</a></p>}
            <p className="row-btns">{!last && <button className="btn btn-primary" onClick={next}>다음 문항</button>}</p>
          </div>
        )}
      </section>
      {done && mock && <MockEnd d={d} score={score} fbs={fbs} />}
      {done && !mock && (
        <section className="sheet" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>오늘 {score.filter(Boolean).length}/{score.length} 맞혔습니다</h2>
          <p className="small muted">결과는 이 브라우저의 무작위 번호로만 남습니다. 남은 문항 {d.left ?? 0}개.</p>
          <p className="row-btns"><button className="btn btn-primary" onClick={load}>3문항 더</button><a className="btn" href="#/me">내 실력 보기</a></p>
        </section>
      )}
    </main>
  );
}

/** 모의 문제집 끝: 내 점수, 다른 사람들 분포, 놓친 유형의 확인 습관 */
function MockEnd({ d, score, fbs }) {
  const k = score.filter(Boolean).length;
  const c = d.crowd;
  const missed = fbs.filter((f) => !f.correct);
  const okAsError = missed.filter((f) => f.truth === 'ok').length;
  const habits = [...new Map(missed.flatMap((f) => f.items ?? []).filter((it) => it.habit).map((it) => [it.pattern, it.habit])).entries()];
  return (
    <section className="sheet" style={{ marginTop: 14 }} aria-label="모의 문제집 결과">
      <h2 style={{ marginTop: 0 }}>{score.length}문항 중 {k}개 맞혔습니다</h2>
      {c?.finished > 0 ? (<>
        <p className="small muted">끝까지 푼 다른 사람 {c.finished}명의 분포입니다(만든 사람·나 제외, 문항마다 첫 답만). 순위는 두지 않습니다.</p>
        <CrowdHist hist={c.hist} mine={k} label="맞힘" />
        {c.finished < 5 && <p className="small muted">아직 {c.finished}명이라 우연이 큽니다.</p>}
      </>) : <p className="small muted">아직 끝까지 푼 다른 사람이 없습니다.{fbs.some((f) => f.repeat) ? '' : ' 내 기록이 첫 기록이 됩니다.'}</p>}
      {fbs.some((f) => f.repeat) && <p className="small muted">전에 푼 문항이 있어 이번 답은 분포에 넣지 않습니다(문항마다 첫 답만 셉니다).</p>}
      {missed.length > 0 && (
        <div className="learned">
          <h3 style={{ marginTop: 0 }}>요령</h3>
          <ul>
            {okAsError > 0 && <li>맞는 문장 {okAsError}개를 틀렸다고 했습니다. 의심이 들면 원자료 문단에서 같은 숫자·같은 대상을 짚어 본 뒤에 틀렸다고 해 보세요.</li>}
            {missed.length - okAsError > 0 && <li>틀린 문장 {missed.length - okAsError}개를 맞다고 했습니다. 숫자가 맞아도 기준 시점·비교 대상·「끌어내렸다」 같은 원인 말이 원자료에 있는지 보세요.</li>}
            {habits.map(([p, h]) => <li key={p}><b>{p}:</b> {h}</li>)}
          </ul>
        </div>
      )}
      <p className="row-btns"><a className="btn btn-primary" href="#/">이제 판 하나 풀기</a><a className="btn" href="#/me">내 실력 보기</a></p>
    </section>
  );
}
