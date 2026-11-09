// AI 동료의 말: 세션 기록(state.log)과 사건 상태를 동료가 건네는 짧은 말로 풀어 보여 준다.
// 문장 틀은 코드가 정하고, 그 안의 요약·묶은 이유·인용·초안은 AI가 만든 것(검증 통과분)이다. 출처 표지로 구분한다.
import { useEffect, useRef } from 'react';
import { GRADE_KO, ACTION_KO, incColor, citeOrder } from '../util.js';
import Src from './Src.jsx';

function placeName(scenario, sig) {
  const p = scenario.places.find((x) => sig?.norm?.place_ids?.includes(x.id));
  return p?.name ?? sig?.norm?.other_places?.[0] ?? null;
}

export function buildMessages(scenario, session) {
  if (!session) return [];
  const sig = (id) => session.signals.find((s) => s.id === id);
  const inc = (id) => session.incidents.find((i) => i.id === id);
  const org = (id) => scenario.contacts.find((k) => k.id === id)?.org ?? id;
  const out = [];
  const opened = new Set();
  session.log.forEach((e, i) => {
    const I = e.incident_id ? inc(e.incident_id) : null;
    const base = { key: i, t: e.t, no: I?.no, incident_id: e.incident_id };
    if (e.type === 'signal') {
      const s = sig(e.signal_id);
      if (!e.incident_id) {
        out.push({ ...base, src: 'rule', text: `${e.signal_id} 「${e.text}」: 시 전체 안내라 사건으로 묶지 않고 배경으로 둡니다.` });
        return;
      }
      if (!opened.has(e.incident_id)) return; // 첫 신호는 사건 생성 메시지에서 말한다
      const where = placeName(scenario, s);
      out.push(e.link?.by === 'llm'
        ? { ...base, src: 'ai', text: `${e.signal_id} 「${e.text}」도 사건 #${I.no}에 묶었습니다. ${e.link.reason}` }
        : { ...base, src: 'rule', text: `${e.signal_id} 「${e.text}」: ${where ? `${where} 쪽` : '같은 장소'} 신호라 사건 #${I.no}에 묶었습니다.` });
      return;
    }
    if (e.type === 'incident_open') {
      opened.add(e.incident_id);
      const first = session.log.find((x) => x.type === 'signal' && x.incident_id === e.incident_id);
      out.push({ ...base, src: first?.link?.by === 'llm' ? 'ai' : 'rule', text: `새 사건 #${I.no}: ${e.title}. 첫 신호는 「${first?.text ?? ''}」입니다.` });
      return;
    }
    if (e.type === 'grade') {
      out.push({ ...base, src: 'rule', strong: true, grade: e.grade, text: `사건 #${I.no} 권고를 「${GRADE_KO[e.grade]}」로 올립니다. 근거: ${e.why.join(', ')}.` });
      // 이 권고에 맞춰 AI가 찾은 조항과 초안(지금 화면에 있는 검증 통과분)
      const later = session.log.slice(i + 1).find((x) => x.type === 'grade' && x.incident_id === e.incident_id);
      if (!later && I) {
        if (I.citations?.length) {
          const c = citeOrder(I.citations)[0];
          out.push({ ...base, key: `${i}c`, src: 'ai', text: `매뉴얼 ${c.heading}에 해당합니다. 「${c.quote.length > 60 ? `${c.quote.slice(0, 60)}…` : c.quote}」 원문과 글자까지 맞는 것을 확인했습니다.` });
        }
        if (I.draft) {
          out.push({ ...base, key: `${i}d`, src: 'ai', text: `보고 초안과 수신처 ${I.draft.recipients.length}곳을 오른쪽에 써 두었습니다. 초안의 수치·시각 ${I.draft.claims_checked}개는 근거 신호와 대조했습니다.${I.draft.warnings?.length ? ' 다만 확인이 필요한 부분이 있어 경고를 달았습니다.' : ''}` });
        }
      }
      return;
    }
    if (e.type === 'nudge') {
      out.push({ ...base, src: 'rule', strong: true, nudge: true, text: e.text });
      return;
    }
    if (e.type === 'decision') {
      out.push({ ...base, src: 'human', text: `${ACTION_KO[e.action]}: ${e.reason}${e.recipients.length ? ` → ${e.recipients.map(org).join(', ')}` : ''}` });
    }
  });
  return out;
}

export default function Colleague({ scenario, session, pending, onPick }) {
  const ref = useRef(null);
  const msgs = buildMessages(scenario, session);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [msgs.length, pending]);
  return (
    <section className="mate" aria-labelledby="mate-h">
      <div className="mate-head">
        <h2 id="mate-h">AI 동료</h2>
        <span className="sub">묶고, 찾고, 써 둡니다. 결정은 당직자가 합니다</span>
      </div>
      <ol className="mate-list" ref={ref} aria-live="polite">
        {!msgs.length && !pending && <li className="mate-empty">재생을 누르면 들어오는 신호를 읽고 여기서 말을 겁니다.</li>}
        {msgs.map((m) => (
          <li key={m.key} className={`msg msg-${m.src} ${m.strong ? 'strong' : ''} ${m.nudge ? 'nudge-msg' : ''} ${m.grade ? `g-${m.grade}` : ''}`}>
            <div className="msg-meta">
              <time>{m.t}</time>
              <Src k={m.src} />
              {m.no && <button className="inc-chip" style={{ '--c': incColor(m.no) }} onClick={() => onPick(m.incident_id)}>#{m.no}</button>}
            </div>
            <p>{m.text}</p>
          </li>
        ))}
        {pending && (
          <li className="msg msg-ai typing">
            <div className="msg-meta"><time>{pending.t}</time><Src k="ai" /></div>
            <p>{pending.id} 읽는 중<span className="dots"><i /><i /><i /></span></p>
          </li>
        )}
      </ol>
    </section>
  );
}
