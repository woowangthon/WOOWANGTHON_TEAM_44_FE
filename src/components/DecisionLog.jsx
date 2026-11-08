import { useEffect, useRef } from 'react';
import { GRADE_KO, ACTION_KO } from '../util.js';
import Src from './Src.jsx';

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
        <span className="legend">
          <span><Src k="ai" /> 점선 칸, AI가 한 일</span>
          <span><Src k="rule" /> 실선 칸, 규칙표가 정한 권고와 재촉</span>
          <span><Src k="human" /> 채운 칸, 당직자 결정(초록은 보고·요청, 남색은 보류)</span>
        </span>
      </div>
      {!items.length && <p className="empty">사건이 생기면 권고와 결정이 시간순으로 쌓입니다.</p>}
      <ol className="timeline" ref={ref}>
        {items.map((e, i) => {
          const tag = e.incident_id ? <button className="link" onClick={() => onPick(e.incident_id)}>#{no[e.incident_id]}</button> : null;
          const head = (label) => <div className="ev-head"><time>{e.t}</time>{tag}<b>{label}</b></div>;
          if (e.type === 'incident_open') {
            const link = log.find((x) => x.type === 'signal' && x.incident_id === e.incident_id)?.link;
            return link?.by === 'llm'
              ? <li key={i} className="ev ai" title={link.reason}>{head('AI 사건 생성')}<span>{e.title}</span></li>
              : <li key={i} className="ev rule" title={`AI가 읽은 장소·시설이 열린 사건과 겹치지 않아 규칙으로 새 사건을 열었습니다${link?.reason ? ` (${link.reason})` : ''}`}>{head('사건 생성')}<span>{e.title}</span></li>;
          }
          if (e.type === 'grade') return <li key={i} className={`ev rule g-${e.grade}`}>{head('권고 상향')}<span>{GRADE_KO[e.grade]}</span></li>;
          if (e.type === 'nudge') return <li key={i} className="ev rule nudge-ev">{head('재촉')}<span>{e.text}</span></li>;
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
