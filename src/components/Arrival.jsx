// 신호가 들어오는 순간: 원문을 먼저 보여 주고, AI가 읽고 나면 어느 사건에 묶었는지 한 줄로 알린다. 몇 초 뒤 사라진다.
import { useEffect } from 'react';
import { CHANNEL_KO } from '../util.js';
import Src from './Src.jsx';

export default function Arrival({ pending, arrival, clear }) {
  useEffect(() => {
    if (!arrival) return undefined;
    const id = setTimeout(clear, 4500);
    return () => clearTimeout(id);
  }, [arrival, clear]);
  const s = pending ?? arrival?.sig;
  if (!s) return null;
  let result;
  if (pending) result = <span className="reading"><Src k="ai" /> 읽고 묶는 중<span className="dots"><i /><i /><i /></span></span>;
  else if (!arrival.inc) result = <span><Src k="rule" /> 시 전체 안내라 사건으로 묶지 않았습니다</span>;
  else if (arrival.isNew) result = <span><Src k={arrival.by === 'llm' ? 'ai' : 'rule'} /> 새 사건 <b>#{arrival.inc.no} {arrival.inc.title}</b></span>;
  else result = <span><Src k={arrival.by === 'llm' ? 'ai' : 'rule'} /> <b>#{arrival.inc.no} {arrival.inc.title}</b>에 묶었습니다{arrival.by === 'llm' && arrival.reason ? `. ${arrival.reason}` : ''}</span>;
  return (
    <div className={`arrival ${pending ? 'is-reading' : ''}`} role="status" aria-live="polite" key={pending ? 'p' : arrival.key}>
      <div className="arr-meta"><time>{s.t}</time><span>{CHANNEL_KO[s.channel] ?? s.channel}</span><span className="from">{s.from}</span>{s.record?.basis === 'added' && <span className="basis">가상 추가</span>}</div>
      <p className="arr-body">{s.body}</p>
      <p className="arr-result">{result}</p>
    </div>
  );
}
