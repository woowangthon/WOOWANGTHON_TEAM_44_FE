// 3 신입의 답: 모델을 부르지 않고, 과제 파일에 기록해 둔 값(바꾸기 전 문장, 근거 인용)으로 만든 답장
import { Stepper } from '../ui/parts.jsx';

const pidLabel = (pid) => `${String(pid).replace(/^p/, '')}문단`;

export default function Reply({ task, result, onNext }) {
  const no = new Map(task.sentences.map((s, i) => [s.sid, i + 1]));
  const paras = new Map((result.source?.paragraphs ?? task.source.paragraphs).map((p) => [p.pid, p.text]));
  const replies = result.replies;

  return (
    <main className="play reply">
      <Stepper at={2} />
      <article className="mail">
        <p className="mail-head">AI 신입 → 검수자 · {result.decision === '반려' ? '반려에 대한 답장' : '승인 뒤 보고'}</p>
        <h1 className={`headline ${result.counts.missed || !result.decisionOk ? 'bad' : 'good'}`}>{result.headline}</h1>

        {replies.length === 0 && <p>짚은 문장이 없고, 틀린 문장도 없었습니다. 보고가 그대로 나갔습니다.</p>}

        <ul className="replies">
          {replies.map((r) => (
            <li key={r.sid} className={`reply-item r-${r.kind}`}>
              <p className="r-said"><span className="r-no">{no.get(r.sid)}번 문장</span> <b>{r.said}</b>
                {r.kind === 'fixed' && r.reasonGiven && <span className="muted"> 고른 사유 「{r.reasonGiven}」{r.reasonMatch ? '' : ` · 이 오류는 「${r.reasonExpected}」입니다`}</span>}
              </p>
              {r.kind === 'fixed' && (
                <>
                  <p className="r-before"><span className="tag">고치기 전</span><del>{r.before}</del></p>
                  <p className="r-after"><span className="tag">고친 뒤</span>{r.after}</p>
                  <Quote pid={r.evidence.pid} quote={r.evidence.quote} />
                </>
              )}
              {r.kind === 'defended' && (
                <>
                  <p className="r-text">{r.text}</p>
                  {r.support.map((q) => <Quote key={q.pid + q.quote} pid={q.pid} quote={q.quote} />)}
                </>
              )}
              {r.kind === 'shipped' && (
                <>
                  <p className="r-text shipped"><span className="tag tag-red">틀린 채 나감 · {r.type}</span>{r.text}</p>
                  <Quote pid={r.evidence.pid} quote={r.evidence.quote} />
                  <p className="r-why">{r.why}</p>
                </>
              )}
            </li>
          ))}
        </ul>

        <h2>나간 보고(최종본)</h2>
        <ol className="final">
          {result.final.map((f) => (
            <li key={f.sid} className={`f-${f.status}`}>
              {f.text}
              {f.status === 'shipped_error' && <span className="tag tag-red">틀린 채 나감</span>}
              {f.status === 'fixed' && <span className="tag">고쳐서 나감</span>}
            </li>
          ))}
        </ol>
        <details className="src-check">
          <summary>원자료 전체 다시 보기</summary>
          {[...paras].map(([pid, text]) => <p key={pid}><span className="pid">{pidLabel(pid)}</span>{text}</p>)}
        </details>
        <button className="btn btn-primary" onClick={onNext} autoFocus>성적표 보기</button>
      </article>
    </main>
  );
}

function Quote({ pid, quote }) {
  return <blockquote className="quote"><span className="pid">원자료 {pidLabel(pid)}</span>「{quote}」</blockquote>;
}
