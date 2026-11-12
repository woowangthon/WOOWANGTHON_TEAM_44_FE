// 모의 검사: 실제 AI 역량 검사처럼 시간 안에 문서 여러 건을 결재한다. 문서마다 결재는 한 번(2차 없음), 시간이 끝나면 남은 문서는 미제출.
import { useEffect, useRef, useState } from 'react';
import { api, myRecords, doneIds } from '../api.js';
import { decisionGate, toMarkList, clock } from '../review.js';
import { Review } from './Play.jsx';
import { docNo } from '../ui/doc.jsx';

const COUNT = 3;
const LIMIT = 12 * 60;

/** 결재함에서 3건: 아직 안 푼 문서를 먼저, 표 문서를 하나 넣는다 */
function pickTasks(rows) {
  const done = doneIds();
  const pool = rows.filter((t) => !t.mini).map((t) => [Math.random() - (done.has(t.id) ? 0 : 1), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const table = pool.find((t) => t.track === 'table');
  const docs = pool.filter((t) => t !== table);
  return [...docs.slice(0, table ? COUNT - 1 : COUNT), ...(table ? [table] : [])].slice(0, COUNT);
}

export default function Exam() {
  const [stage, setStage] = useState('intro'); // intro | run | end
  const [tasks, setTasks] = useState([]);
  const [i, setI] = useState(0);
  const [marks, setMarks] = useState({});
  const [notes, setNotes] = useState({});
  const [stamped, setStamped] = useState(null);
  const [results, setResults] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState('');
  const startRef = useRef(0);

  useEffect(() => {
    if (stage !== 'run') return undefined;
    const t = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000;
      setElapsed(e);
      if (e >= LIMIT) { clearInterval(t); setStage('end'); }
    }, 500);
    return () => clearInterval(t);
  }, [stage]);
  useEffect(() => { window.scrollTo(0, 0); }, [i, stage]);

  async function start() {
    setErr('');
    try {
      const { tasks: rows } = await api.tasks();
      const picked = pickTasks(rows);
      const full = await Promise.all(picked.map((t) => api.task(t.id)));
      setTasks(full); setI(0); setResults([]); setMarks({}); setNotes({}); setStamped(null);
      startRef.current = Date.now(); setElapsed(0); setStage('run');
    } catch (e) { setErr(e.message); }
  }

  async function decide(decision) {
    const task = tasks[i];
    const gate = decisionGate(marks, decision);
    if (!gate.ok) return;
    if (gate.confirm && !window.confirm(gate.confirm)) return;
    setStamped(decision);
    try {
      const rounds = [{ marks: toMarkList(marks, notes), decision }];
      const [r] = await Promise.all([api.grade({ id: task.id, rounds, final: true, elapsedSec: (Date.now() - startRef.current) / 1000 }), new Promise((ok) => setTimeout(ok, 500))]);
      myRecords.add({ at: new Date().toISOString(), taskId: task.id, title: task.title, exam: true, decision, decisionOk: r.decisionOk, rounds: 1, byType: r.byType, score: r.score, ...r.counts });
      const next = [...results, { task, r }];
      setResults(next);
      setMarks({}); setNotes({}); setStamped(null);
      if (i + 1 >= tasks.length) setStage('end'); else setI(i + 1);
    } catch (e) { setStamped(null); setErr(`결재를 보내지 못했습니다: ${e.message}`); }
  }

  if (stage === 'intro') {
    return (
      <main className="live">
        <article className="sheet memo">
          <p className="doc-no">모의 검사</p>
          <h1 className="doc-title">{COUNT}건을 {LIMIT / 60}분 안에</h1>
          <p>실제 AI 역량 검사는 정해진 시간 안에 여러 과제를 풉니다(예: 70분, 80분). 모의 검사는 결재함 문서 {COUNT}건을 {LIMIT / 60}분 안에 결재합니다.</p>
          <dl>
            <dt>결재</dt><dd>문서마다 한 번. 반려해도 수정본은 오지 않습니다.</dd>
            <dt>시간</dt><dd>{LIMIT / 60}분이 지나면 끝나고, 남은 문서는 미제출(0점)로 셉니다.</dd>
            <dt>문서</dt><dd>아직 결재하지 않은 문서를 먼저 고르고, 표 문서를 하나 넣습니다. 틀린 곳이 없는 문서가 섞일 수 있습니다.</dd>
          </dl>
          <button className="btn btn-primary" onClick={start}>검사 시작</button>
          {err && <p className="error" role="alert">{err}</p>}
        </article>
      </main>
    );
  }

  if (stage === 'end') return <ExamReport tasks={tasks} results={results} elapsed={Math.min(elapsed, LIMIT)} />;

  const task = tasks[i];
  const left = Math.max(0, LIMIT - elapsed);
  const banner = (
    <div className="exam-bar">
      <span className="round-tag">모의 검사 {i + 1}/{tasks.length}</span>
      <span className={`exam-left ${left < 120 ? 'low' : ''}`} role="timer" aria-live="off">남은 시간 {clock(left)}</span>
      {err && <span className="error">{err}</span>}
    </div>
  );
  return (
    <Review key={task.id} task={{ ...task, timeLimitSec: LIMIT }} sentences={task.sentences} round={1} marks={marks} setMarks={setMarks}
      notes={notes} setNotes={setNotes} elapsed={elapsed} stamped={stamped} onDecide={decide} banner={banner} />
  );
}

function ExamReport({ tasks, results, elapsed }) {
  const total = tasks.length;
  const sum = (k) => results.reduce((a, x) => a + (x.r.counts[k] ?? 0), 0);
  const score = Math.round(results.reduce((a, x) => a + x.r.score, 0) / total);
  const ok = results.filter((x) => x.r.decisionOk).length;
  const types = {};
  for (const x of results) for (const [t, v] of Object.entries(x.r.byType)) { types[t] ??= { planted: 0, found: 0 }; types[t].planted += v.planted; types[t].found += v.found; }
  return (
    <main className="report">
      <article className="sheet eval">
        <p className="doc-no">모의 검사 평가서</p>
        <h1 className="doc-title">{results.length}/{total}건 제출 · {clock(elapsed)} 사용</h1>
        <table className="eval-table">
          <tbody>
            <tr><th>평균 점수</th><td><b className="big">{score}</b>/100 {results.length < total ? `(미제출 ${total - results.length}건은 0점)` : ''}</td></tr>
            <tr><th>판정이 맞은 문서</th><td><b className="big">{ok}</b>/{total}</td></tr>
            <tr><th>찾음</th><td><b className="big">{sum('found')}</b>/{sum('planted')}</td></tr>
            <tr className={sum('falseAlarms') ? 'row-warn' : ''}><th>멀쩡한데 짚음</th><td><b className="big">{sum('falseAlarms')}</b></td></tr>
          </tbody>
        </table>
        <h2>문서별</h2>
        <ul className="rec-list">
          {tasks.map((t, k) => {
            const x = results[k];
            return (
              <li key={t.id}>
                <span>{docNo(t.id)} · {t.title}</span>
                <span className="muted small">
                  {x ? `틀린 문장 ${x.r.counts.planted}곳 중 ${x.r.counts.found}곳 찾음 · 잘못 짚음 ${x.r.counts.falseAlarms} · ${x.r.decision} ${x.r.decisionOk ? '(맞음)' : `(틀림, 맞는 판정 ${x.r.correctDecision})`} · ${x.r.score}점` : '미제출'}
                </span>
                {x && x.r.replies.some((y) => y.kind === 'shipped') && (
                  <details className="exam-miss">
                    <summary>놓친 문장 보기</summary>
                    {x.r.replies.filter((y) => y.kind === 'shipped').map((y) => (
                      <p key={y.sid}><span className="tag tag-red">{y.type}</span><del>{y.text}</del><br /><span className="muted small">맞는 문장: {y.correct} · {y.why}</span></p>
                    ))}
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {Object.keys(types).length > 0 && (
          <>
            <h2>오류 유형별</h2>
            <ul className="type-bars">
              {Object.entries(types).map(([t, v]) => (
                <li key={t}><span className="tb-name">{t}</span><span className="tb-bar" aria-hidden="true"><span style={{ width: `${(v.found / v.planted) * 100}%` }} /></span><span className="tb-num">{v.found}/{v.planted}</span></li>
              ))}
            </ul>
          </>
        )}
        <p className="muted small">모의 검사로 처음 결재한 문서도 「처음 결재한 사람」 비율에 들어갑니다.</p>
      </article>
      <div className="next">
        <a className="btn btn-primary" href="#/me">내 기록</a>
        <a className="btn" href="#/">결재함</a>
      </div>
    </main>
  );
}
