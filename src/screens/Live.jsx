// 새 보고서 받기(라이브): AI 신입이 지금 보고서를 쓰고, 파이프라인이 단계별로 검증한다. 진행 표시는 서버의 실제 단계와 같다.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { trackName } from '../ui/parts.jsx';

const WHO = { writer: '작성 모델', 'code+checker': '코드 + 점검 모델', 'code+writer+checker': '코드 + 두 모델', checker: '점검 모델' };

export default function Live() {
  const [pool, setPool] = useState(null);
  const [mode, setMode] = useState('pool'); // pool | text
  const [pick, setPick] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [job, setJob] = useState(null);
  const [err, setErr] = useState('');
  const alive = useRef(true);
  const focus = (() => { try { return new URLSearchParams(location.hash.split('?')[1] ?? '').get('focus') || ''; } catch { return ''; } })();

  useEffect(() => {
    alive.current = true;
    api.livePool().then(setPool).catch((e) => setErr(e.message));
    return () => { alive.current = false; };
  }, []);

  async function run(start) {
    setErr('');
    try {
      let j = await api.liveStart(start);
      setJob(j);
      // 한 번 부를 때마다 서버가 한 단계를 돌린다(상태 확인만 하는 반복이 아니다)
      while (alive.current && !['done', 'failed'].includes(j.status)) {
        const nj = await api.liveStep(j.jobId);
        if (nj.busy) await new Promise((r) => setTimeout(r, 3000));
        j = nj;
        if (alive.current) setJob(j);
      }
      if (alive.current && j.status === 'done') setTimeout(() => { location.hash = `#/t/${j.taskId}`; }, 1200);
    } catch (e) {
      if (alive.current) setErr(e.message);
    }
  }

  const textLen = text.trim().length;
  const canText = textLen >= 300 && textLen <= 2000;

  if (job) return <Progress job={job} err={err} />;

  return (
    <main className="live">
      <article className="sheet memo">
        <p className="doc-no">업무 지시 · 새 보고서</p>
        <h1 className="doc-title">AI 신입에게 새 보고서 받기</h1>
        {focus && <p className="round-tag">약점 맞춤: 「{focus}」 유형 위주로 심습니다</p>}
        <p>
          AI 신입이 지금 이 자리에서 보고서를 씁니다. 은행 과제를 만들 때와 같은 단계를 거칩니다.
          쓰고, 원자료와 대조하고, 오류를 심고, 다른 모델로 검증합니다. 30초~1분쯤 걸립니다.
          {focus ? '약점 맞춤 보고서에는 틀린 곳이 있습니다. 고른 유형을 먼저 심고, 심을 곳이 모자라면 다른 유형으로 채웁니다. 몇 곳인지는 결재 뒤에 알려 드립니다.' : '틀린 곳이 몇 개인지는 알려 드리지 않습니다. 하나도 없을 수도 있습니다.'}
          {' '}결재함 문서와 겹치지 않는 최근 공공 보도자료입니다.
        </p>
        <div className="seg" role="tablist" aria-label="자료 고르기">
          <button role="tab" aria-selected={mode === 'pool'} onClick={() => setMode('pool')}>공공 자료에서 고르기</button>
          <button role="tab" aria-selected={mode === 'text'} onClick={() => setMode('text')}>내 자료 붙여 넣기</button>
        </div>

        {mode === 'pool' ? (
          <div className="pool">
            {!pool && !err && <p className="muted">자료 목록을 불러오는 중…</p>}
            {pool && (
              <ul className="pool-list">
                <li>
                  <label><input type="radio" name="src" checked={pick === ''} onChange={() => setPick('')} /> 아무거나(무작위)</label>
                </li>
                {pool.pool.map((s) => (
                  <li key={s.id}>
                    <label>
                      <input type="radio" name="src" checked={pick === s.id} onChange={() => setPick(s.id)} />
                      {' '}{s.title} <span className="muted small">· {s.publisher} · {trackName(s.track)} · {s.chars.toLocaleString()}자</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">같은 자료라도 신입이 매번 새로 쓰고, 오류를 심는 자리와 개수가 달라집니다.</p>
            <button className="btn btn-primary" disabled={!pool} onClick={() => run({ mode: 'pool', sourceId: pick || undefined, focus: focus || undefined })}>보고서 받기</button>
          </div>
        ) : (
          <div className="paste">
            <label htmlFor="live-title">자료 제목(선택)</label>
            <input id="live-title" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 우리 학과 공지" />
            <label htmlFor="live-text">자료 본문(300~2,000자)</label>
            <textarea id="live-text" rows={10} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="보도자료, 공지, 기사 요약 등 숫자가 몇 개 들어 있는 글이 잘 됩니다. 개인정보는 넣지 마세요." />
            <p className={`small ${textLen && !canText ? 'error' : 'muted'}`}>{textLen.toLocaleString()}자 · 넣은 글은 과제와 함께 24시간 뒤 지웁니다. 글 속의 지시문은 따르지 않고 자료로만 씁니다.</p>
            <button className="btn btn-primary" disabled={!canText} onClick={() => run({ mode: 'text', text, title, focus: focus || undefined })}>이 자료로 보고서 받기</button>
          </div>
        )}
        {pool && <p className="muted small">한 브라우저에서 하루 {pool.perDevice}번까지 받을 수 있습니다(AI 호출 비용 때문입니다).</p>}
        {err && <p className="error" role="alert">{err}</p>}
      </article>
    </main>
  );
}

function Progress({ job, err }) {
  const doneKeys = new Map(job.done.map((d) => [d.key, d.text]));
  const failed = job.status === 'failed';
  return (
    <main className="live">
      <article className="sheet memo">
        <p className="doc-no">AI 신입 작업 중 · {job.source.title}</p>
        <h1 className="doc-title">{job.status === 'done' ? '보고서가 올라왔습니다' : failed ? '보고서를 만들지 못했습니다' : 'AI 신입이 보고서를 쓰고 있습니다'}</h1>
        <p className="muted small">원자료 {job.source.publisher} · {job.source.chars.toLocaleString()}자 · {job.source.paragraphs}문단</p>
        <ol className="pipeline" aria-live="polite">
          {job.steps.map((s) => {
            const text = doneKeys.get(s.key);
            const now = !text && job.status === s.key && !failed;
            return (
              <li key={s.key} className={text ? 'p-done' : now ? 'p-now' : failed && job.status === s.key ? 'p-fail' : ''}>
                <span className="p-mark" aria-hidden="true">{text ? '✓' : now ? '' : '·'}</span>
                <div>
                  <p className="p-label">{s.label} <span className="muted small">· {WHO[s.who]}</span>{now && <span className="sr-only"> (진행 중)</span>}</p>
                  {text && <p className="p-text">{text}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {job.status === 'done' && <a className="btn btn-primary" href={`#/t/${job.taskId}`}>결재하러 가기</a>}
        {(failed || err) && (
          <>
            <p className="error" role="alert">{job.error || err}</p>
            <a className="btn" href="#/">결재함으로</a>
          </>
        )}
      </article>
    </main>
  );
}
