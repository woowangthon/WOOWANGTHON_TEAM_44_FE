import { useEffect, useState } from 'react';
import { GRADE_KO, ACTION_KO, gradeRank } from '../util.js';

const ACTIONS = [
  { id: 'report', label: '보고', help: '당직사령·담당 부서에 알린다' },
  { id: 'control_review', label: '통제 검토 요청', help: '시설 관리주체에 통제를 검토해 달라고 요청한다' },
  { id: 'hold', label: '보류', help: '지금은 보고·요청하지 않는다. 사유를 남긴다' },
];

export default function DecisionPanel({ scenario, incident: inc, busy, onDecide, onRedraft }) {
  const draft = inc?.draft;
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [recips, setRecips] = useState([]);
  const [script, setScript] = useState('');
  const [sms, setSms] = useState('');
  const [dirty, setDirty] = useState({ r: false, s: false, m: false });
  const [done, setDone] = useState(null);

  // 새 초안이 오면 당직자가 손대지 않은 칸만 갈아 끼운다
  useEffect(() => {
    if (!draft) return;
    if (!dirty.r) setRecips(draft.recipients);
    if (!dirty.s) setScript(draft.call_script);
    if (!dirty.m) setSms(draft.sms);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!inc) {
    return (
      <section className="col decide" aria-labelledby="dec-h">
        <div className="col-head"><h2 id="dec-h">결정</h2></div>
        <p className="empty">사건이 생기면 여기서 보고, 통제 검토 요청, 보류 중 하나를 고릅니다. 결정은 당직자가 합니다.</p>
      </section>
    );
  }

  const needRecips = action && action !== 'hold';
  const can = action && reason.trim() && (!needRecips || recips.length) && !busy;
  const quick = [
    ...inc.grade_why,
    ...(inc.citations ?? []).map((c) => `${c.heading}에 따름`),
  ].slice(0, 4);
  const toggle = (id) => { setDirty((d) => ({ ...d, r: true })); setRecips((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id])); };

  const submit = async (e) => {
    e.preventDefault();
    const out = await onDecide({
      incident_id: inc.id, action, reason, recipients: needRecips ? recips : [],
      call_script: needRecips ? script : null, sms: needRecips ? sms : null,
    });
    if (out) {
      setDone(`${out.decision.at}, 「${ACTION_KO[action]}」 결정을 기록했습니다`);
      setAction(null); setReason('');
    }
  };

  const followNote = action && action !== 'hold' && gradeRank(action) !== gradeRank(inc.grade)
    ? `AI 권고(${GRADE_KO[inc.grade]})와 다른 결정입니다. 사유가 그대로 기록됩니다.` : null;

  return (
    <section className="col decide" aria-labelledby="dec-h">
      <div className="col-head">
        <h2 id="dec-h">결정, 사건 #{inc.no}</h2>
        <span className="count">고르고 사유를 쓰면 시각과 함께 기록됩니다</span>
      </div>

      <form onSubmit={submit}>
        <fieldset className="actions">
          <legend>무엇을 할까요</legend>
          {ACTIONS.map((a) => (
            <label key={a.id} className={`act ${action === a.id ? 'on' : ''}`}>
              <input type="radio" name="action" value={a.id} checked={action === a.id} onChange={() => { setAction(a.id); setDone(null); }} />
              <span className="act-label">{a.label}</span>
              <span className="act-help">{a.help}</span>
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span>사유(필수)</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 홍수경보 통보를 받아 보고함" />
        </label>
        {quick.length > 0 && (
          <div className="quick">
            {quick.map((q) => <button type="button" key={q} className="chip" onClick={() => setReason((r) => (r ? `${r} ${q}.` : `${q}.`))}>{q}</button>)}
          </div>
        )}
        {followNote && <p className="follow">{followNote}</p>}

        {needRecips && (
          <>
            <fieldset className="recips">
              <legend>수신처 <span className="sub">AI 제안에 표시, 당직자가 확정</span></legend>
              {scenario.contacts.map((k) => (
                <label key={k.id} className="recip">
                  <input type="checkbox" checked={recips.includes(k.id)} onChange={() => toggle(k.id)} />
                  <span>{k.org}</span>
                  <span className="role">{k.role}</span>
                  {draft?.recipients.includes(k.id) && <span className="ai-pick">AI 제안</span>}
                </label>
              ))}
            </fieldset>

            {draft ? (
              <>
                <label className="field">
                  <span>전화 스크립트 <span className="sub">AI 초안, 고쳐서 쓰세요</span></span>
                  <textarea rows={6} value={script} onChange={(e) => { setDirty((d) => ({ ...d, s: true })); setScript(e.target.value); }} />
                </label>
                <label className="field">
                  <span>문자 초안 <span className="sub">{sms.length}자</span></span>
                  <textarea rows={3} value={sms} onChange={(e) => { setDirty((d) => ({ ...d, m: true })); setSms(e.target.value); }} />
                </label>
                <p className="rationale"><strong>AI가 든 근거</strong> {draft.rationale} <span className="sid">({draft.evidence_signal_ids.join(', ')})</span></p>
                {draft.warnings?.length > 0 && <p className="blocked">검증 경고: {draft.warnings.join(' / ')}</p>}
                <button type="button" className="btn ghost small" disabled={busy} onClick={() => { setDirty({ r: false, s: false, m: false }); onRedraft(inc.id); }}>초안 다시 만들기</button>
              </>
            ) : (
              <p className="muted">관찰 단계라 AI 초안이 없습니다. 필요하면 직접 쓰거나 초안을 요청하세요.
                <button type="button" className="btn ghost small" disabled={busy} onClick={() => onRedraft(inc.id)}>초안 요청</button></p>
            )}
          </>
        )}

        <button className="btn primary wide record" disabled={!can}>
          {action === 'hold' ? '보류로 기록' : '보냈다고 기록'}
        </button>
        <p className="hint">실제 전화·문자 발송은 하지 않습니다. 보낸 뒤 이 버튼으로 기록만 남깁니다.</p>
        {done && <p className="ok" role="status">{done}</p>}
      </form>

      {inc.decisions.length > 0 && (
        <div className="block">
          <h4>이 사건의 결정</h4>
          <ul className="past">
            {inc.decisions.map((d, i) => (
              <li key={i} className={`stamp a-${d.action}`}>
                <span className="stamp-act">{ACTION_KO[d.action]}</span>
                <time>{d.at}</time>
                <span>{d.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
