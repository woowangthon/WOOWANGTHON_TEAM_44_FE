// 과제 하나를 끝까지: 업무 지시 → 1 검수 → 2 판정 → (반려하면) 3 신입의 답과 수정본 → 2차 검수·판정 → 3 신입의 답 → 4 성적표
import { useEffect, useRef, useState } from 'react';
import { api, myRecords } from '../api.js';
import { Stepper, Badge, PracticeNotice, trackName } from '../ui/parts.jsx';
import { DocHead, PenNote, docNo } from '../ui/doc.jsx';
import { toggleMark, setReason, decisionGate, toMarkList, clock, REASONS, pidLabel } from '../review.js';
import Reply, { Quote } from './Reply.jsx';
import Report from './Report.jsx';

export default function Play({ id }) {
  const [task, setTask] = useState(null);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('brief'); // brief | review | interim | reply | report
  const [round, setRound] = useState(1);
  const [marks, setMarks] = useState({});
  const [notes, setNotes] = useState({});
  const [first, setFirst] = useState(null); // 1차: { marks, decision, interim }
  const [result, setResult] = useState(null);
  const [stamped, setStamped] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    setTask(null); setErr(''); setStage('brief'); setRound(1); setMarks({}); setNotes({}); setFirst(null); setResult(null); setStamped(null);
    api.task(id).then(setTask).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    if (stage !== 'review') return undefined;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => { window.scrollTo(0, 0); }, [stage, round]);

  if (err) return <main className="play"><p className="error">{err}</p><a href="#/">결재함으로</a></main>;
  if (!task) return <main className="play"><p className="muted">문서를 불러오는 중…</p></main>;

  const begin = () => { startRef.current = Date.now(); setElapsed(0); setStage('review'); };
  const sentences = round === 2 ? first.interim.revision : task.sentences;

  async function decide(decision) {
    const gate = decisionGate(marks, decision);
    if (!gate.ok) return;
    if (gate.confirm && !window.confirm(gate.confirm)) return;
    const sec = (Date.now() - startRef.current) / 1000;
    setElapsed(sec);
    setStamped(decision);
    const wait = new Promise((r) => setTimeout(r, 650)); // 도장이 찍히는 것을 보여 준다
    try {
      const list = toMarkList(marks, notes);
      if (round === 1 && decision === '반려') {
        const [it] = await Promise.all([api.grade({ id: task.id, marks: list, decision }), wait]);
        setFirst({ marks: list, decision, interim: it });
        setStage('interim');
      } else {
        const rounds = round === 1 ? [{ marks: list, decision }] : [{ marks: first.marks, decision: '반려' }, { marks: list, decision }];
        const [r] = await Promise.all([api.grade({ id: task.id, rounds, elapsedSec: sec }), wait]);
        setResult({ ...r, elapsedSec: sec, sentRounds: rounds });
        myRecords.add({
          at: new Date().toISOString(), taskId: task.id, title: task.title, live: task.origin === 'live',
          decision, decisionOk: r.decisionOk, rounds: r.rounds, byType: r.byType, score: r.score, ...r.counts,
        });
        setStage('reply');
      }
    } catch (e) {
      setStamped(null);
      setErr(`결재를 보내지 못했습니다: ${e.message}`);
    }
  }

  const toRound2 = () => { setRound(2); setMarks({}); setNotes({}); setStamped(null); setStage('review'); };

  if (stage === 'brief') return <Brief task={task} onStart={begin} />;
  if (stage === 'interim') return <Interim task={task} data={first.interim} onNext={toRound2} />;
  if (stage === 'reply') return <Reply task={task} result={result} onNext={() => setStage('report')} />;
  if (stage === 'report') return <Report task={task} result={result} />;
  return (
    <Review task={task} sentences={sentences} round={round} marks={marks} setMarks={setMarks} notes={notes} setNotes={setNotes}
      elapsed={elapsed} stamped={stamped} onDecide={decide} />
  );
}

function Brief({ task, onStart }) {
  return (
    <main className="play brief">
      <Stepper at={-1} />
      <article className="sheet memo">
        <p className="doc-no">업무 지시 · {docNo(task.id)}</p>
        <h1 className="doc-title">{task.title}</h1>
        <p className="memo-line"><Badge text={task.badge} /> {trackName(task.track)} · 원자료 {task.source.publisher}</p>
        <dl>
          <dt>상황</dt>
          <dd>팀장이 AI 신입에게 일을 맡겼고, 신입이 보고서를 올렸습니다. 팀장에게 올라가기 전에 사수인 당신이 결재합니다.</dd>
          <dt>맡긴 일</dt><dd>{task.brief}</dd>
          <dt>결재 기준</dt>
          <dd>원자료와 다르거나 원자료에 없는 내용이 <b>한 문장이라도 있으면 반려</b>, 없으면 승인합니다. 문체는 보지 않습니다. 틀린 곳이 없을 수도 있습니다.</dd>
          <dt>반려하면</dt><dd>신입이 짚은 문장을 고쳐 수정본을 다시 올립니다. 수정본도 한 번 더 결재합니다.</dd>
          <dt>기한</dt><dd>{Math.round(task.timeLimitSec / 60)}분. 넘겨도 계속할 수 있고 걸린 시간만 기록합니다.</dd>
          <dt>첨부</dt><dd>{task.source.title} ({task.source.publisher}, {task.source.paragraphs.length}{task.track === 'table' ? '줄' : '문단'})</dd>
        </dl>
        <p className="memo-how">틀렸다고 보는 문장을 눌러 빨간 줄을 긋고 사유를 고릅니다. 다 봤으면 <b>승인</b> 또는 <b>반려</b> 도장을 찍습니다.</p>
        <button className="btn btn-primary" onClick={onStart} autoFocus>보고서 열기</button>
      </article>
    </main>
  );
}

/** 첨부(원자료). 표 트랙은 표로 그린다 */
export function SourcePane({ task, className = '' }) {
  const s = task.source;
  const rows = s.paragraphs.filter((p) => p.row);
  const paras = s.paragraphs.filter((p) => !p.row);
  return (
    <section className={`attach ${className}`} aria-label="첨부 원자료">
      <p className="attach-tab">첨부 1 · 원자료</p>
      <h2 className="attach-title">{s.title}</h2>
      <p className="src-meta">
        {s.publisher}{s.url ? <> · <a href={s.url} target="_blank" rel="noreferrer">원문</a></> : null} · {s.license}
      </p>
      {s.excerptNote && <p className="src-meta">{s.excerptNote}</p>}
      {paras.map((p) => (
        <p key={p.pid} className="para"><span className="pid">{pidLabel(p.pid)}</span>{p.text}</p>
      ))}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="src-table">
            {s.columns && <thead><tr><th className="pid-col">행</th>{s.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>}
            <tbody>
              {rows.map((r) => (
                <tr key={r.pid}><td className="pid-col">{r.pid.slice(1)}</td>{r.row.map((c, i) => <td key={i}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Review({ task, sentences, round, marks, setMarks, notes, setNotes, elapsed, stamped, onDecide, banner }) {
  const [tab, setTab] = useState('out'); // 좁은 화면: src | out
  const [hint, setHint] = useState('');
  const n = Object.keys(marks).length;
  const over = elapsed > task.timeLimitSec;

  const onKey = (e, sid) => {
    const k = Number(e.key);
    if (k >= 1 && k <= REASONS.length) {
      e.preventDefault();
      setMarks((m) => setReason(sid in m ? m : toggleMark(m, sid), sid, REASONS[k - 1]));
    }
  };
  const tryDecide = (d) => {
    if (stamped) return;
    const g = decisionGate(marks, d);
    setHint(g.ok ? '' : g.message);
    if (g.ok) onDecide(d);
  };

  return (
    <main className="play review">
      {banner ?? <Stepper at={stamped ? 1 : 0} round={round} />}
      <div className="review-bar">
        <span className="review-title">{round === 2 ? '2차 결재 · 신입이 고쳐 다시 올린 수정본' : '1차 결재'}</span>
        <span className={`timer ${over ? 'over' : ''}`} aria-live="off">
          {clock(elapsed)} / {clock(task.timeLimitSec)}{over ? ' · 기한을 넘겼습니다. 계속할 수 있습니다' : ''}
        </span>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'src'} onClick={() => setTab('src')}>첨부 원자료</button>
        <button role="tab" aria-selected={tab === 'out'} onClick={() => setTab('out')}>보고서 {n ? `(빨간 줄 ${n})` : ''}</button>
      </div>
      <div className="desk">
        <SourcePane task={task} className={`pane-src ${tab === 'src' ? 'show' : ''}`} />
        <article className={`sheet doc pane-out ${tab === 'out' ? 'show' : ''}`} aria-label="AI 신입의 보고서">
          <DocHead task={task} round={round} review={stamped} animate />
          <PracticeNotice url={task.source.url} />
          <p className="muted small doc-help">문장을 누르면 빨간 줄이 그어지고, 다시 누르면 지워집니다.<span className="kbd-hint"> 키보드: Tab으로 문장 이동, Enter로 줄 긋기, 숫자 1~6으로 사유.</span></p>
          <ol className="lines">
            {sentences.map((s, i) => {
              const marked = s.sid in marks;
              return (
                <li key={s.sid} className={`${marked ? 'marked' : ''} ${s.changed ? 'changed' : ''}`}>
                  <button className="line" aria-pressed={marked} onClick={() => setMarks((m) => toggleMark(m, s.sid))} onKeyDown={(e) => onKey(e, s.sid)}>
                    <span className="l-no">{i + 1}.</span>
                    <span className="l-text"><span className="ink">{s.text}</span>{s.changed && <span className="rev-tag">수정</span>}</span>
                    <span className="l-margin" aria-hidden={!marked}>{marked ? <PenNote>{marks[s.sid] ?? '여기 틀림?'}</PenNote> : null}</span>
                  </button>
                  {marked && (
                    <div className="reasons" role="group" aria-label={`${i + 1}번 문장 사유`}>
                      {REASONS.map((r, k) => (
                        <button key={r} className={`chip ${marks[s.sid] === r ? 'on' : ''}`} aria-pressed={marks[s.sid] === r}
                          onClick={() => setMarks((m) => setReason(m, s.sid, r))}>
                          <span className="key">{k + 1}</span>{r}
                        </button>
                      ))}
                      <input className="note-input" maxLength={150} value={notes[s.sid] ?? ''} aria-label={`${i + 1}번 문장 검토 의견`}
                        placeholder="검토 의견(선택): 어디가 원자료와 다른가요? 예) 원자료는 100개"
                        onChange={(e) => setNotes((n) => ({ ...n, [s.sid]: e.target.value }))} onKeyDown={(e) => e.stopPropagation()} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <footer className="decision">
            <p className="decision-q">
              <b>{round === 2 ? '수정본을' : '이 보고서를'} 팀장에게 올릴까요?</b>
              <span className="muted"> 빨간 줄 {n}곳</span>
            </p>
            <div className="decision-btns">
              <button className="stamp-btn stamp-btn-ok" disabled={!!stamped} onClick={() => tryDecide('승인')}><span>승인</span></button>
              <button className="stamp-btn stamp-btn-no" disabled={!!stamped} onClick={() => tryDecide('반려')}><span>반려</span></button>
            </div>
            {hint && <p className="error" role="alert">{hint}</p>}
            {stamped && <p className="muted" role="status">{stamped === '반려' && round === 1 ? '신입에게 돌려보내는 중…' : '결재를 올리는 중…'}</p>}
          </footer>
        </article>
      </div>
    </main>
  );
}

/** 1차 반려에 대한 신입의 답. 놓친 곳이 남았는지는 알려 주지 않는다 */
function Interim({ task, data, onNext }) {
  const no = new Map(task.sentences.map((s, i) => [s.sid, i + 1]));
  useEffect(() => { document.getElementById('interim-next')?.focus(); }, []);
  return (
    <main className="play reply">
      <Stepper at={2} round={1} />
      <article className="sheet mail">
        <p className="doc-no">AI 신입 → 사수 · 반려에 대한 답</p>
        <h1 className="mail-title">{data.headline}</h1>
        <ul className="replies">
          {data.replies.map((r) => (
            <li key={r.sid} className={`reply-item r-${r.kind}`}>
              <p className="r-said"><span className="r-no">{no.get(r.sid)}번 문장</span> <b>{r.said}</b>
                {r.kind === 'fixed' && r.reasonGiven && <span className="muted"> 고른 사유 「{r.reasonGiven}」{r.reasonMatch ? '' : ` · 이 오류는 「${r.reasonExpected}」입니다`}</span>}
              </p>
              {r.kind === 'fixed' && (
                <>
                  <p className="r-before"><span className="tag">고치기 전</span><del>{r.before}</del></p>
                  <p className="r-after"><span className="tag">고친 뒤</span><ins>{r.after}</ins></p>
                  <Quote pid={r.evidence.pid} quote={r.evidence.quote} />
                </>
              )}
              {r.kind === 'defended' && (
                <>
                  <p className="r-text">{r.text}</p>
                  {r.support.map((q) => <Quote key={q.pid + q.quote} pid={q.pid} quote={q.quote} />)}
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="memo-how">고친 문장에는 「수정」 표시가 붙습니다. 남은 틀린 곳이 있는지는 신입도 말하지 않습니다. 수정본을 처음부터 다시 보고 결재하세요.</p>
        <button id="interim-next" className="btn btn-primary" onClick={onNext}>수정본 결재하기</button>
      </article>
    </main>
  );
}
