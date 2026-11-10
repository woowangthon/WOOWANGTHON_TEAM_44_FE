// 왼쪽 사건 줄: 결정할 사건, 지켜보는 사건, 처리한 사건으로 나눈다.
import { GRADE_KO, ACTION_KO, incState, needList, reraised } from '../util.js';

const G = { control_review: 'ctl', report: 'rep', observe: 'obs' };

function Row({ inc, on, onPick }) {
  const st = incState(inc);
  const d = inc.decisions.at(-1);
  const last = inc.last_t ?? inc.opened_at;
  let meta;
  const waiting = inc.decisions.flatMap((x) => x.contacts ?? []).filter((c) => c.status === 'pending').length;
  if (st === 'done') meta = <><span>{d.at} {ACTION_KO[d.action]}</span>{waiting > 0 && <span className="g rep">회신 대기 {waiting}</span>}</>;
  else if (st === 'held') meta = <><span className="g obs">보류 중</span><span>{d.at}부터</span></>;
  else if (reraised(inc)) meta = <><span className={`g ${G[inc.grade]}`}>{GRADE_KO[inc.grade]}</span><span>보류 뒤 다시 올라옴</span></>;
  else meta = <><span className={`g ${G[inc.grade]}`}>{GRADE_KO[inc.grade]}</span><span>{last}, 신호 {inc.signal_ids.length}건</span></>;
  return (
    <button className={`qi s-${st} ${on ? 'sel' : ''}`} style={{ '--g': `var(--${G[inc.grade]})` }} onClick={() => onPick(inc.id)} aria-current={on ? 'true' : undefined}>
      <span className="t"><span className="no">#{inc.no}</span>{inc.title}</span>
      <span className="m">{meta}</span>
    </button>
  );
}

export default function Queue({ session, focus, onPick, onSignals }) {
  const incs = session?.incidents ?? [];
  const needs = needList(incs);
  const watch = incs.filter((i) => ['held', 'watch'].includes(incState(i)));
  const done = incs.filter((i) => incState(i) === 'done');
  const group = (title, xs, empty) => (
    <section className="qg" aria-label={title}>
      <h3 className="qh">{title}<em>{xs.length}</em></h3>
      {xs.length ? xs.map((i) => <Row key={i.id} inc={i} on={i.id === focus} onPick={onPick} />) : <p className="qempty">{empty}</p>}
    </section>
  );
  return (
    <aside className="queue">
      {group('결정할 사건', needs, '없음')}
      {group('지켜보는 사건', watch, '없음')}
      {group('처리한 사건', done, '없음')}
      {session?.signals.length > 0 && <button className="link quiet sigs-link" onClick={onSignals}>들어온 신호 {session.signals.length}건 모두 보기</button>}
    </aside>
  );
}
