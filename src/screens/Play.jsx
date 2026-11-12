// 과제 하나를 끝까지: 브리핑 → 1 검수 → 2 판정 → 3 신입의 답 → 4 성적표
import { useEffect, useRef, useState } from 'react';
import { api, myRecords } from '../api.js';
import { Stepper, Badge, PracticeNotice, trackName } from '../ui/parts.jsx';
import { toggleMark, setReason, decisionGate, toMarkList, clock, REASONS } from '../review.js';
import Reply from './Reply.jsx';
import Report from './Report.jsx';

export default function Play({ id }) {
  const [task, setTask] = useState(null);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('brief'); // brief | review | sending | reply | report
  const [marks, setMarks] = useState({});
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    setTask(null); setErr(''); setStage('brief'); setMarks({}); setResult(null);
    api.task(id).then(setTask).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    if (stage !== 'review') return undefined;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => { window.scrollTo(0, 0); }, [stage]);

  if (err) return <main className="play"><p className="error">과제를 불러오지 못했습니다: {err}</p><a href="#/">과제 목록으로</a></main>;
  if (!task) return <main className="play"><p className="muted">과제를 불러오는 중…</p></main>;

  const begin = () => { startRef.current = Date.now(); setElapsed(0); setStage('review'); };

  async function decide(decision) {
    const gate = decisionGate(marks, decision);
    if (!gate.ok) return;
    if (gate.confirm && !window.confirm(gate.confirm)) return;
    const sec = (Date.now() - startRef.current) / 1000;
    setElapsed(sec);
    setStage('sending');
    try {
      const r = await api.grade({ id: task.id, marks: toMarkList(marks), decision, elapsedSec: sec });
      setResult({ ...r, elapsedSec: sec });
      myRecords.add({ at: new Date().toISOString(), taskId: task.id, title: task.title, decision, decisionOk: r.decisionOk, ...r.counts });
      setStage('reply');
    } catch (e) {
      setErr(`채점 요청이 실패했습니다: ${e.message}`);
    }
  }

  if (stage === 'brief') return <Brief task={task} onStart={begin} />;
  if (stage === 'reply') return <Reply task={task} result={result} onNext={() => setStage('report')} />;
  if (stage === 'report') return <Report task={task} result={result} />;
  return <Review task={task} marks={marks} setMarks={setMarks} elapsed={elapsed} sending={stage === 'sending'} onDecide={decide} />;
}

function Brief({ task, onStart }) {
  return (
    <main className="play brief">
      <Stepper at={-1} />
      <article className="memo">
        <p className="memo-head">업무 지시 · {trackName(task.track)} · <Badge text={task.badge} /></p>
        <h1>{task.title}</h1>
        <dl>
          <dt>신입에게 맡긴 일</dt><dd>{task.brief}</dd>
          <dt>검수 기준</dt><dd>{task.criteria}</dd>
          <dt>제한 시간</dt><dd>{Math.round(task.timeLimitSec / 60)}분. 넘겨도 계속할 수 있고 걸린 시간만 기록합니다.</dd>
          <dt>원자료</dt><dd>{task.source.title} ({task.source.publisher}, {task.source.paragraphs.length}문단)</dd>
        </dl>
        <p className="memo-how">
          틀렸다고 보는 문장을 눌러 표시하고 사유를 고릅니다. 다 봤으면 <b>승인</b> 또는 <b>반려</b>를 누릅니다.
          몇 곳이 틀렸는지는 알려 드리지 않습니다.
        </p>
        <button className="btn btn-primary" onClick={onStart} autoFocus>결과물 열기</button>
      </article>
    </main>
  );
}

function Review({ task, marks, setMarks, elapsed, sending, onDecide }) {
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
    const g = decisionGate(marks, d);
    setHint(g.ok ? '' : g.message);
    if (g.ok) onDecide(d);
  };

  return (
    <main className="play review">
      <Stepper at={0} />
      <div className="review-bar">
        <span className="review-title">{task.title}</span>
        <span className={`timer ${over ? 'over' : ''}`} aria-live="off">
          {clock(elapsed)} / {clock(task.timeLimitSec)}{over ? ' · 제한 시간을 넘겼습니다. 계속할 수 있습니다' : ''}
        </span>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'src'} onClick={() => setTab('src')}>원자료</button>
        <button role="tab" aria-selected={tab === 'out'} onClick={() => setTab('out')}>결과물 {n ? `(표시 ${n})` : ''}</button>
      </div>
      <div className="desk">
        <section className={`pane pane-src ${tab === 'src' ? 'show' : ''}`} aria-label="원자료">
          <h2>원자료</h2>
          <p className="src-meta">
            {task.source.publisher} · <a href={task.source.url} target="_blank" rel="noreferrer">원문</a> · {task.source.license}
          </p>
          {task.source.excerptNote && <p className="src-meta">{task.source.excerptNote}</p>}
          {task.source.paragraphs.map((p) => (
            <p key={p.pid} className="para"><span className="pid">{p.pid.replace(/^p/, '')}문단</span>{p.text}</p>
          ))}
        </section>
        <section className={`pane pane-out ${tab === 'out' ? 'show' : ''}`} aria-label="AI 신입의 결과물">
          <h2>AI 신입의 결과물</h2>
          <PracticeNotice url={task.source.url} />
          <p className="muted small">문장을 눌러 표시하고 사유를 고릅니다. 다시 누르면 표시를 거둡니다.<span className="kbd-hint"> 키보드: Tab으로 문장 이동, Enter로 표시, 숫자 1~6으로 사유.</span></p>
          <ol className="sentences">
            {task.sentences.map((s, i) => {
              const marked = s.sid in marks;
              return (
                <li key={s.sid} className={marked ? 'marked' : ''}>
                  <button
                    className="sentence"
                    aria-pressed={marked}
                    onClick={() => setMarks((m) => toggleMark(m, s.sid))}
                    onKeyDown={(e) => onKey(e, s.sid)}
                  >
                    <span className="s-no">{i + 1}</span>
                    <span className="s-text">{s.text}</span>
                    <span className="s-flag">{marked ? '표시함' : ''}</span>
                  </button>
                  {marked && (
                    <div className="reasons" role="group" aria-label={`${i + 1}번 문장 사유`}>
                      {REASONS.map((r, k) => (
                        <button key={r} className={`chip ${marks[s.sid] === r ? 'on' : ''}`} aria-pressed={marks[s.sid] === r}
                          onClick={() => setMarks((m) => setReason(m, s.sid, r))}>
                          <span className="key">{k + 1}</span>{r}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      <div className="decision">
        <p className="decision-step"><span className="step-no">2</span> 판정</p>
        <p className="decision-q">이 보고를 그대로 내보낼까요? <span className="muted">표시 {n}개</span></p>
        <div className="decision-btns">
          <button className="btn stamp stamp-ok" disabled={sending} onClick={() => tryDecide('승인')}>승인</button>
          <button className="btn stamp stamp-no" disabled={sending} onClick={() => tryDecide('반려')}>반려</button>
        </div>
        {hint && <p className="error" role="alert">{hint}</p>}
        {sending && <p className="muted">신입에게 보내는 중…</p>}
      </div>
    </main>
  );
}
