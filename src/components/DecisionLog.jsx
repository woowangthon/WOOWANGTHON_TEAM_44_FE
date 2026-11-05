import { useEffect, useRef } from 'react';
import { GRADE_KO, ACTION_KO } from '../util.js';

export default function DecisionLog({ session, scenario, onPick }) {
  const ref = useRef(null);
  const log = session?.log ?? [];
  const no = Object.fromEntries((session?.incidents ?? []).map((i) => [i.id, i.no]));
  const org = (id) => scenario.contacts.find((k) => k.id === id)?.org ?? id;
  useEffect(() => { ref.current?.scrollTo({ left: ref.current.scrollWidth }); }, [log.length]);

  const items = log.filter((e) => e.type !== 'signal');
  return (
    <section className="log" aria-labelledby="log-h">
      <div className="log-head">
        <h2 id="log-h">결정 로그</h2>
        <span className="count">AI가 한 일은 테두리, 당직자가 한 결정은 채운 칸으로 남습니다</span>
      </div>
      {!items.length && <p className="empty">사건이 생기면 권고와 결정이 시간순으로 쌓입니다.</p>}
      <ol className="timeline" ref={ref}>
        {items.map((e, i) => {
          const tag = e.incident_id ? <button className="link" onClick={() => onPick(e.incident_id)}>#{no[e.incident_id]}</button> : null;
          const head = (label) => <div className="ev-head"><time>{e.t}</time>{tag}<b>{label}</b></div>;
          if (e.type === 'incident_open') return <li key={i} className="ev ai">{head('AI 사건 생성')}<span>{e.title}</span></li>;
          if (e.type === 'grade') return <li key={i} className={`ev ai g-${e.grade}`}>{head('AI 권고')}<span>{GRADE_KO[e.grade]}</span></li>;
          if (e.type === 'nudge') return <li key={i} className="ev ai nudge-ev">{head('AI 재촉')}<span>{e.text}</span></li>;
          if (e.type === 'decision') {
            return (
              <li key={i} className={`ev human a-${e.action}`}>
                {head(`당직자 결정: ${ACTION_KO[e.action]}`)}
                <span>{e.reason}{e.recipients.length ? ` → ${e.recipients.map(org).join(', ')}` : ''}</span>
              </li>
            );
          }
          return null;
        })}
      </ol>
    </section>
  );
}
