// 4 성적표(검토 평가서): 찾음·놓침·잘못 짚음과 판정을 먼저, 점수는 작게. 이 문서를 어떻게 만들고 검증했는지 함께 보인다
import { useEffect, useState } from 'react';
import { api, doneIds } from '../api.js';
import { Stepper } from '../ui/parts.jsx';
import { docNo } from '../ui/doc.jsx';
import { clock, peerLine, STOP_TIPS, shareText } from '../review.js';

const STEP_NAME = { p1: '작성', p2: '원자료 대조', p3: '오류 심기·검증', p5: '눈 가린 풀이' };

export default function Report({ task, result }) {
  const [next, setNext] = useState(null);
  const [fb, setFb] = useState(null); // null | true | false
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [coach, setCoach] = useState(null); // null | 'loading' | { items, overall } | { error }
  const [copied, setCopied] = useState(false);
  const hasNotes = (result.sentRounds ?? []).some((r) => r.marks.some((m) => m.note));
  const no = new Map(task.sentences.map((s, i) => [s.sid, i + 1]));
  const c = result.counts;
  const v = result.verification;
  const two = result.rounds === 2;

  useEffect(() => {
    const done = doneIds();
    api.tasks().then((r) => setNext(r.tasks.find((t) => t.id !== task.id && !t.mini && !done.has(t.id)) ?? null)).catch(() => {});
  }, [task.id]);

  useEffect(() => {
    if (!hasNotes) return;
    setCoach('loading');
    api.coach({ id: task.id, rounds: result.sentRounds })
      .then((c) => setCoach(c))
      .catch((e) => setCoach({ error: e.message }));
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    const url = task.origin === 'live' ? location.origin : `${location.origin}/#/t/${task.id}`;
    try { await navigator.clipboard.writeText(shareText(task.title, result, url)); setCopied(true); } catch { setCopied(false); }
  };

  const send = async () => {
    try { await api.feedback({ taskId: task.id, helpful: fb, note }); } catch { /* 반응은 못 보내도 그만 */ }
    setSent(true);
  };
  const plantedSids = [...result.found, ...result.missed].sort((a, b) => no.get(a) - no.get(b));

  return (
    <main className="play report">
      <Stepper at={3} round={result.rounds} />
      <article className="sheet eval">
        <p className="doc-no">검토 평가서 · {docNo(task.id)}</p>
        <h1 className="doc-title">{task.title}</h1>

        <table className="eval-table">
          <tbody>
            <tr><th>심어 둔 틀린 문장</th><td>{c.planted}곳{c.planted === 0 ? ' (틀린 곳이 없는 보고서였습니다)' : ''}</td></tr>
            <tr><th>찾음</th><td><b className="big">{c.found}</b>{two && c.found ? ` (1차 ${c.found1} · 2차 ${c.found2})` : ''}</td></tr>
            <tr className={c.missed ? 'row-bad' : ''}><th>놓침</th><td><b className="big">{c.missed}</b>{c.missed ? ' · 틀린 채 팀장에게 올라감' : ''}</td></tr>
            <tr className={c.falseAlarms ? 'row-warn' : ''}><th>멀쩡한데 짚음</th><td><b className="big">{c.falseAlarms}</b></td></tr>
            {result.decisions.map((d, i) => (
              <tr key={i} className={d === result.correctDecisions[i] ? '' : 'row-bad'}>
                <th>{two ? `${i + 1}차 판정` : '판정'}</th>
                <td>{d} · {d === result.correctDecisions[i] ? '맞음' : `틀림(맞는 판정: ${result.correctDecisions[i]})`}</td>
              </tr>
            ))}
            <tr><th>걸린 시간</th><td>{clock(result.elapsedSec)} / 기한 {clock(task.timeLimitSec)}</td></tr>
          </tbody>
        </table>
        <p className="score">공유용 점수 <b>{result.score}</b> / 100 <span className="muted">(찾은 비율 50, 2차에서 찾으면 절반 · 짚은 것 중 맞은 비율 30 · 판정 20)</span></p>
        <p className="tendency">{result.tendencyText}</p>

        {plantedSids.length > 0 && (
          <section>
            <h2>틀린 문장마다</h2>
            <ul className="per-error">
              {plantedSids.map((sid) => {
                const r = result.replies.find((x) => x.sid === sid && x.kind !== 'defended');
                const type = r?.type ?? r?.reasonExpected;
                const when = result.found1.includes(sid) ? (two ? '1차에 찾음' : '찾음') : result.found2.includes(sid) ? '2차에 찾음' : null;
                return (
                  <li key={sid}>
                    <b>{no.get(sid)}번 문장</b> · {type} · {when ?? <span className="red">놓침</span>}
                    {task.origin !== 'live' && <><br /><span className="muted">{peerLine(result.peers, sid)}</span></>}
                    {!when && STOP_TIPS[type] && <><br /><span className="stop-tip">어디서 멈췄어야 했나: {STOP_TIPS[type]}</span></>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="coach">
          <h2>AI 사수의 코칭 <span className="muted small">· 검토 의견에 대한 말(점수에는 넣지 않음)</span></h2>
          {!hasNotes && <p className="muted">이번에는 검토 의견을 쓰지 않았습니다. 빨간 줄을 그을 때 「어디가 원자료와 다른지」 한 줄을 쓰면, 결재 뒤 AI 사수가 그 의견이 정확했는지 짚어 줍니다.</p>}
          {coach === 'loading' && <p className="muted" role="status">AI 사수가 검토 의견을 읽는 중…</p>}
          {coach?.error && <p className="muted">코칭을 받지 못했습니다: {coach.error}</p>}
          {coach?.items && (
            <>
              <ul className="coach-list">
                {coach.items.map((x) => (
                  <li key={x.sid} className={`cv-${x.verdict}`}>
                    <span className="cv-tag">{x.verdict}</span> <b>{x.no}번 문장</b> {x.comment}
                  </li>
                ))}
              </ul>
              {coach.overall && <p className="pen-line">{coach.overall}</p>}
              <p className="muted small">코칭 모델 {coach.model}</p>
            </>
          )}
        </section>

        <section className="verify">
          <h2>이 보고서는 이렇게 만들고 검증했습니다</h2>
          {result.liveLog && (
            <ol className="live-log">
              {result.liveLog.map((l) => (
                <li key={l.step}>
                  {STEP_NAME[l.step] ?? l.step} {(l.ms / 1000).toFixed(1)}초
                  {l.step === 'p1' && ` · ${l.kept}문장 작성${l.dropped ? `, 코드 검사로 ${l.dropped}문장 뺌` : ''}`}
                  {l.step === 'p2' && ` · 점검 모델이 ${l.passed}문장 통과`}
                  {l.step === 'p3' && ` · 오류 ${l.planted}곳 검증 통과`}
                </li>
              ))}
            </ol>
          )}
          <p>
            작성 {v?.models?.writer} · 점검 {v?.models?.checker}(작성과 다른 모델). 결과물의 숫자 {v?.numbersMatched}, 근거 인용 {v?.quotesMatched}가 원자료와 글자 그대로 맞았고,
            {c.planted ? ` 일부러 틀린 ${v?.plantedVerified}곳은 코드 검사와 점검 모델이 모두 틀렸다고 판정했습니다.` : ' 틀린 곳을 심지 않은 보고서입니다.'}
            {v?.blind ? ` 점검 모델이 사람과 같은 화면만 보고 풀었을 때 ${c.planted ? `${v.blind.of}곳 중 ${v.blind.caught}곳을 찾았고, ` : ''}멀쩡한 문장을 ${v.blind.extraFlags}곳 짚었습니다.` : ''}
            {task.origin === 'live' ? ' 방금 만든 보고서라 사람이 확인하지 않았습니다.' : v?.humanChecked ? ' 사람이 원자료와 한 번 더 대조했습니다.' : ' 사람 확인은 아직입니다.'}
          </p>
          {!result.first && task.origin !== 'live' && <p className="muted">이 브라우저로 이 과제를 결재한 것이 처음이 아니어서, 이번 판은 「처음 푼 사람」 비율에 넣지 않았습니다.</p>}
        </section>

        <section className="feedback">
          <h2>도움이 됐나요?</h2>
          {sent ? <p>고맙습니다. 남겨 주신 반응은 이름 없이 저장했습니다.</p> : (
            <>
              <div className="fb-btns">
                <button className={`btn ${fb === true ? 'on' : ''}`} aria-pressed={fb === true} onClick={() => setFb(true)}>예</button>
                <button className={`btn ${fb === false ? 'on' : ''}`} aria-pressed={fb === false} onClick={() => setFb(false)}>아니오</button>
              </div>
              {fb !== null && (
                <div className="fb-note">
                  <label htmlFor="fb-note">한 줄 남기기(선택, 200자, 이름·연락처는 쓰지 마세요)</label>
                  <input id="fb-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                  <button className="btn" onClick={send}>보내기</button>
                </div>
              )}
            </>
          )}
        </section>
      </article>

      <div className="next">
        {next && <a className="btn btn-primary" href={`#/t/${next.id}`}>다음 문서: {next.title}</a>}
        <button className="btn" onClick={copy}>{copied ? '복사했습니다' : '결과 한 줄 복사'}</button>
        <a className="btn" href="#/new">AI 신입에게 새 보고서 받기</a>
        <a className="btn" href="#/me">내 기록</a>
        <a className="btn" href="#/">결재함</a>
      </div>
    </main>
  );
}
