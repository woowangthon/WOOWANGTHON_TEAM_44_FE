// 결정 화면: 지금 결정할 사건 하나, 근거 세 줄, 결정 버튼 셋. 나머지는 오른쪽 서랍과 접힌 칸에 둔다.
import { useEffect, useState } from 'react';
import { ACTION_KO, GRADE_KO, citeOrder, reraised } from '../util.js';
import DecisionForm from './DecisionForm.jsx';
import Flow from './Flow.jsx';
import Src from './Src.jsx';

const ACTIONS = [
  { id: 'control_review', label: '통제 검토 요청', help: '시설 관리주체에 통제를 검토해 달라고 요청' },
  { id: 'report', label: '보고', help: '당직사령에게 알리고 지시를 받음' },
  { id: 'relay', label: '담당 부서 전달', help: '처리할 부서나 기관에 넘김' },
  { id: 'hold', label: '보류', help: '지금은 연락하지 않고 사유를 남김' },
];
const G = { control_review: 'ctl', report: 'rep', relay: 'rel', observe: 'obs' };

function reasons(inc) {
  const out = inc.criteria.filter((c) => ['met', 'approaching'].includes(c.status))
    .map((c) => ({ text: `${c.label}`, sub: c.observed, st: c.status }));
  for (const w of inc.grade_why) {
    if (!/^기준 (도달|접근)/.test(w) && !out.some((o) => o.text.includes(w))) out.push({ text: w, sub: null, st: 'why' });
  }
  return out.slice(0, 3);
}

export default function Focus({ r, inc, flowOpen, coach, onDecided }) {
  const scn = r.scenario;
  const [action, setAction] = useState(null);
  const [showFlow, setShowFlow] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => { setAction(null); setDone(null); setShowFlow(false); }, [inc.id]);

  const fac = scn.facilities.find((f) => f.id === inc.facility_id);
  const lastDec = inc.decisions.at(-1);
  const lastNudge = inc.nudges.at(-1);
  // 재촉은 결정한 뒤 다시 알릴 때, 또는 권고가 오른 뒤 시간이 지나 다시 알릴 때만 보인다(권고와 같은 순간의 알림은 권고 줄과 겹친다)
  const nudgeOn = lastNudge && (lastDec ? lastNudge.at >= lastDec.at : lastNudge.at > (inc.grade_history.at(-1)?.at ?? ''));
  const again = reraised(inc);
  const cite = citeOrder(inc.citations)[0];
  const rec = inc.grade === 'observe' ? null : inc.grade;
  const flow = flowOpen || again || showFlow;
  const rs = reasons(inc);

  const decide = async (pl) => {
    const out = await r.decide(pl);
    if (out) {
      const msg = `${out.decision.at} 사건 #${inc.no} 「${ACTION_KO[pl.action]}」을 기록했습니다`;
      setDone(msg); setAction(null); onDecided?.(msg);
    }
  };

  return (
    <article className="focus" aria-labelledby="focus-h">
      <p className="kicker">사건 #{inc.no}, 신호 {inc.signal_ids.length}건{fac ? `, ${fac.name}` : ''}</p>
      <h1 id="focus-h">{inc.title}</h1>
      {lastDec && <p className="sub">{lastDec.at}에 {ACTION_KO[lastDec.action]}했습니다. 사유: {lastDec.reason}</p>}
      {lastDec?.contacts?.length > 0 && (
        <ul className="contact-log" aria-label="연락 결과">
          {lastDec.contacts.map((c) => (
            <li key={c.id} className={`is-${c.status}`}>
              <span className="org">{scn.contacts.find((k) => k.id === c.id)?.org}</span>
              <span className="cst">{c.status === "pending" ? "회신 대기" : "전달함"}</span>
              {c.note && <span className="note">{c.note}</span>}
              {c.status === 'pending' && !r.readOnly && <button className="link quiet" disabled={!!r.busy} onClick={() => r.contact({ incident_id: inc.id, contact_id: c.id, status: 'reached', note: c.note ? `${c.note}, 회신 받음` : '회신 받음' })}>회신 받음</button>}
            </li>
          ))}
        </ul>
      )}

      {nudgeOn && <div className="nudge" role="alert"><small>규칙표 재촉, {lastNudge.at}</small>{lastNudge.text}</div>}
      {inc.ai_error && <p className="blocked">AI 판단 실패: {inc.ai_error}. 기준 판정과 권고 등급은 규칙표 결과라 그대로 유효합니다.</p>}

      <div className="rec">
        <span className="lab">권고<Src k="rule" /></span>
        <span className={`big ${G[inc.grade]}`}>{rec ? ACTION_KO[rec] : '관찰'}</span>
        {!rec && <span className="sub">아직 보고 기준에 닿지 않았습니다</span>}
      </div>
      {rs.length > 0 && (
        <ul className="why">
          {rs.map((x, i) => <li key={i} className={`w-${x.st}`}>{x.text}{x.sub && <span className="obs">{x.sub}</span>}</li>)}
        </ul>
      )}
      {cite && (
        <blockquote className="quote">
          <b>{cite.heading}</b><span className="ok">원문 일치</span>
          <span className="q">{cite.quote}</span>
        </blockquote>
      )}
      <p className="ailine">
        <Src k="ai" /> {inc.signal_ids.length > 1 ? `신호 ${inc.signal_ids.length}건을 이 사건으로 묶었습니다. ` : ''}
        {inc.draft ? `연락할 때 볼 전달 사항을 정리해 두었고, 그 안의 수치와 시각 ${inc.draft.claims_checked ?? 0}개는 근거 신호와 대조했습니다.` : cite ? '해당 조항을 찾아 원문과 대조했습니다.' : '조항을 찾는 중이거나 해당 조항이 없습니다.'}
      </p>

      {!r.readOnly && !action && (
        <div className="acts" role="group" aria-label="결정">
          {ACTIONS.map((a) => (
            <button key={a.id} className={`act ${a.id === rec ? 'pri' : ''} ${coach?.suggest === a.id ? 'hint' : ''} a-${a.id}`} onClick={() => { setAction(a.id); setDone(null); }} disabled={!!r.busy}>
              {a.label}<small>{a.help}</small>
            </button>
          ))}
        </div>
      )}
      {action && (
        <div className="chosen">
          <p className="chosen-h"><b>{ACTION_KO[action]}</b>{rec && action !== rec && action !== 'hold' ? <span className="sub">권고는 {GRADE_KO[rec]}</span> : null}</p>
          <DecisionForm scenario={scn} inc={inc} action={action} busy={!!r.busy} onDecide={decide} onRedraft={r.redraft} onCancel={() => setAction(null)} />
        </div>
      )}
      {done && <p className="ok-line" role="status">{done}</p>}

      <section className={`flow-wrap ${flow ? 'open' : ''}`}>
        <button className="link quiet" aria-expanded={flow} onClick={() => setShowFlow(!showFlow)} disabled={again || flowOpen}>이 사건의 흐름</button>
        {flow && <Flow session={r.session} inc={inc} />}
      </section>
    </article>
  );
}
