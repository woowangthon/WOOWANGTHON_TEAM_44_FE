// 3 신입의 답(최종): 모델을 부르지 않고, 과제 파일에 기록해 둔 값(바꾸기 전 문장, 근거 인용)으로 만든 답과 팀장에게 올라간 최종본
import { Stepper } from '../ui/parts.jsx';
import { DocHead } from '../ui/doc.jsx';
import { pidLabel } from '../review.js';

export function Quote({ pid, quote }) {
  return <blockquote className="quote"><span className="pid">원자료 {pidLabel(pid)}</span>「{quote}」</blockquote>;
}

export default function Reply({ task, result, onNext }) {
  const no = new Map(task.sentences.map((s, i) => [s.sid, i + 1]));
  const replies = result.replies;
  const bad = result.counts.missed || !result.decisionOk;

  return (
    <main className="play reply">
      <Stepper at={2} round={result.rounds} />
      <article className="sheet mail">
        <p className="doc-no">AI 신입 → 사수 · {result.decision === '승인' ? '결재 뒤 보고' : '2차 반려에 대한 답'}</p>
        <h1 className={`mail-title ${bad ? 'bad' : 'good'}`}>{result.headline}</h1>

        {replies.length === 0 && <p>빨간 줄도 없었고, 틀린 문장도 없었습니다. 보고서가 그대로 팀장에게 올라갔습니다.</p>}

        <ul className="replies">
          {replies.map((r) => (
            <li key={`${r.sid}-${r.round}-${r.kind}`} className={`reply-item r-${r.kind}`}>
              <p className="r-said">
                <span className="r-no">{no.get(r.sid)}번 문장{result.rounds === 2 && r.kind !== 'shipped' ? ` · ${r.round}차` : ''}</span> <b>{r.said}</b>
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
              {r.kind === 'shipped' && (
                <>
                  <p className="r-text shipped"><span className="tag tag-red">틀린 채 올라감 · {r.type}</span>{r.text}</p>
                  <p className="r-after"><span className="tag">맞는 문장</span>{r.correct}</p>
                  <Quote pid={r.evidence.pid} quote={r.evidence.quote} />
                  <p className="r-why">{r.why}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      </article>

      <article className="sheet doc final-doc">
        <DocHead task={task} round={result.rounds} review={result.decision} note={<p className="final-note">팀장에게 올라간 최종본</p>} />
        <ol className="lines final">
          {result.final.map((f, i) => (
            <li key={f.sid} className={`f-${f.status}`}>
              <span className="line static">
                <span className="l-no">{i + 1}.</span>
                <span className="l-text"><span className="ink">{f.text}</span></span>
                <span className="l-margin">
                  {f.status === 'shipped_error' && <span className="pen-note">틀린 채 나감</span>}
                  {f.status === 'fixed' && <span className="tag">고쳐서 나감{result.rounds === 2 ? ` · ${f.round}차` : ''}</span>}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </article>

      <div className="next">
        <button className="btn btn-primary" onClick={onNext} autoFocus>성적표 보기</button>
      </div>
    </main>
  );
}
