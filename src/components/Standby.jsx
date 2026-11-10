// 결정할 사건이 없을 때. 실제 근무에서는 받은 전화 적기와 연습 안내를, 연습 중에는 방금 들어온 신호를 보여 준다.
import { CHANNEL_KO, needList } from '../util.js';
import MemoBox from './MemoBox.jsx';
import Src from './Src.jsx';

export default function Standby({ r, onPractice, suggest }) {
  const sigs = [...(r.session?.signals ?? [])].reverse().slice(0, 6);
  const incNo = Object.fromEntries((r.session?.incidents ?? []).map((i) => [i.id, i]));
  const live = r.kind === 'live';
  const needs = needList(r.session?.incidents).length;
  return (
    <div className="standby">
      <p className="kicker">지금 상황</p>
      <h1>{live || r.ended ? '결정할 사건이 없습니다' : '신호를 받는 중입니다'}</h1>
      <p className="sub">{live
        ? '전화, 기관 통보, 재난문자, 112·119 공조, 수위 알림이 들어오면 같은 사건끼리 묶어 왼쪽에 올립니다.'
        : r.ended ? '모든 신호를 받았습니다.' : `들어오는 신호를 AI가 읽고 사건으로 묶는 중입니다. 연습할 순간이 오면 멈춥니다.${needs ? ` 결정을 기다리는 사건 ${needs}건은 왼쪽에 있습니다.` : ''}`}</p>
      <MemoBox onMemo={r.memo} busy={!!r.busy} suggest={suggest} readOnly={r.readOnly} />
      {!live && sigs.length > 0 && (
        <section className="recent" aria-label="방금 들어온 신호">
          <h3>방금 들어온 신호</h3>
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
        </section>
      )}
      {live && (
        <div className="invite">
          <span><b>처음 보신다면</b> 2026년 7월 9일 새벽 청주 호우 기록으로 실제 사용 장면을 연습해 볼 수 있습니다.</span>
          <button className="btn" onClick={onPractice}>연습하기</button>
        </div>
      )}
    </div>
  );
}
