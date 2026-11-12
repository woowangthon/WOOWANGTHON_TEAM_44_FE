// 4 성적표: 찾음·놓침·잘못 짚음을 먼저, 점수는 작게
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Stepper } from '../ui/parts.jsx';
import { clock, peerLine } from '../review.js';

export default function Report({ task, result }) {
  const [next, setNext] = useState(null);
  const [fb, setFb] = useState(null); // null | true | false
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const no = new Map(task.sentences.map((s, i) => [s.sid, i + 1]));
  const c = result.counts;
  const v = result.verification;

  useEffect(() => {
    api.tasks().then((r) => setNext(r.tasks.find((t) => t.id !== task.id && !t.mini) ?? null)).catch(() => {});
  }, [task.id]);

  const send = async () => {
    try { await api.feedback({ taskId: task.id, helpful: fb, note }); setSent(true); } catch { setSent(true); }
  };
  const plantedSids = [...result.found, ...result.missed].sort((a, b) => no.get(a) - no.get(b));

  return (
    <main className="play report">
      <Stepper at={3} />
      <h1>성적표 <span className="muted">· {task.title}</span></h1>
      <div className="counts">
        <div className="count"><span className="num">{c.found}</span><span>찾음</span></div>
        <div className={`count ${c.missed ? 'bad' : ''}`}><span className="num">{c.missed}</span><span>놓침</span></div>
        <div className={`count ${c.falseAlarms ? 'warn' : ''}`}><span className="num">{c.falseAlarms}</span><span>멀쩡한데 짚음</span></div>
        <div className={`count ${result.decisionOk ? '' : 'bad'}`}><span className="num small">{result.decision}</span><span>판정 {result.decisionOk ? '맞음' : `틀림(맞는 판정: ${result.correctDecision})`}</span></div>
        <div className="count"><span className="num small">{clock(result.elapsedSec)}</span><span>걸린 시간 / {clock(task.timeLimitSec)}</span></div>
      </div>
      <p className="score">공유용 점수 <b>{result.score}</b> / 100 <span className="muted">(찾은 비율 50 · 짚은 것 중 맞은 비율 30 · 판정 20)</span></p>
      <p className="tendency">{result.tendencyText}</p>

      {plantedSids.length > 0 && (
        <section>
          <h2>틀린 문장마다</h2>
          <ul className="per-error">
            {plantedSids.map((sid) => {
              const r = result.replies.find((x) => x.sid === sid);
              const type = r?.type ?? r?.reasonExpected;
              return (
                <li key={sid}>
                  <b>{no.get(sid)}번 문장</b> · {type} · {result.found.includes(sid) ? '찾음' : <span className="red">놓침</span>}
                  <br /><span className="muted">{peerLine(result.peers, sid)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {Object.keys(result.byType).length > 0 && (
        <section>
          <h2>오류 유형별</h2>
          <ul className="by-type">
            {Object.entries(result.byType).map(([t, x]) => <li key={t}>{t}: {x.found}/{x.planted}</li>)}
          </ul>
        </section>
      )}

      <section className="verify">
        <h2>이 과제는 이렇게 만들고 검증했습니다</h2>
        <p>
          작성 {v?.models?.writer} · 점검 {v?.models?.checker}(작성과 다른 모델). 결과물의 숫자 {v?.numbersMatched}, 근거 인용 {v?.quotesMatched}가 원자료와 글자 그대로 맞았고,
          일부러 틀린 {v?.plantedVerified}곳은 코드 검사와 점검 모델이 모두 틀렸다고 판정했습니다. 점검 모델이 사람과 같은 화면만 보고 풀었을 때 {v?.blind?.of}곳 중 {v?.blind?.caught}곳을 찾았습니다.
          {v?.humanChecked ? ' 사람이 원자료와 한 번 더 대조했습니다.' : ' 사람 확인은 아직입니다.'}
        </p>
        {!result.first && <p className="muted">이 브라우저로 이 과제를 푼 것이 처음이 아니어서, 이번 판은 「처음 푼 사람」 비율에 넣지 않았습니다.</p>}
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

      <div className="next">
        {next && <a className="btn btn-primary" href={`#/t/${next.id}`}>다음 과제: {next.title}</a>}
        <a className="btn" href="#/">과제 목록</a>
      </div>
    </main>
  );
}
