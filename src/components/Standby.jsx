// 결정할 사건이 없을 때(평시). 넘겨받은 것, 받은 전화 적기, 들어온 것을 가운데에 둔다.
import { CHANNEL_KO, needList } from '../util.js';
import MemoBox from './MemoBox.jsx';
import Received from './Received.jsx';
import Src from './Src.jsx';

export default function Standby({ r, onPractice, suggest }) {
  const all = [...(r.session?.signals ?? [])].reverse();
  const sigs = all.slice(0, 8);
  const incNo = Object.fromEntries((r.session?.incidents ?? []).map((i) => [i.id, i]));
  const live = r.kind === 'live';
  const needs = needList(r.session?.incidents).length;
  const h = live ? r.inbox?.latest : null;
  return (
    <div className="standby">
      <p className="kicker">지금 상황</p>
      <h1>{live || r.ended ? '결정할 사건이 없습니다' : '신호를 받는 중입니다'}</h1>
      <p className="sub">{live
        ? '받은 전화, 기관 통보, 재난문자, 112·119 공조를 적으면 같은 사건끼리 묶고 처리할 부서와 매뉴얼 조항을 찾아 왼쪽에 올립니다.'
        : r.ended ? '모든 신호를 받았습니다.' : `들어오는 신호를 AI가 읽고 사건으로 묶는 중입니다. 연습할 순간이 오면 멈춥니다.${needs ? ` 결정을 기다리는 사건 ${needs}건은 왼쪽에 있습니다.` : ''}`}</p>
      {h && !r.inboxHidden && <Received h={h} busy={!!r.busy} onTake={r.take} onReceive={r.receive} />}
      <MemoBox onMemo={r.memo} busy={!!r.busy} suggest={suggest} readOnly={r.readOnly} />
      <section className="recent" aria-label="들어온 것">
        <h3>들어온 것{all.length > 8 ? ` (최근 8건, 모두 ${all.length}건)` : ''}</h3>
        {sigs.length ? (
          <ol>
            {sigs.map((s) => (
              <li key={s.id}>
                <time>{s.t}</time>
                <span className="ch">{CHANNEL_KO[s.channel]}</span>
                <span className="one">{s.norm?.one_line ?? s.body}</span>
                <span className="to">{s.incident_id ? `#${incNo[s.incident_id]?.no}` : <Src k="rule">배경</Src>}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">{live ? '이번 근무에 적은 것이 아직 없습니다.' : '첫 신호를 기다리는 중입니다.'}</p>}
      </section>
      {live && (
        <div className="invite">
          <span><b>처음 보신다면</b> 지난 기록이나 흔한 신고 유형으로 실제 근무를 연습해 볼 수 있습니다.</span>
          <button className="btn" onClick={onPractice}>연습하기</button>
        </div>
      )}
    </div>
  );
}
