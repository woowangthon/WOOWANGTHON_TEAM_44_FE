// 결정을 고른 뒤: 사유, 전달 사항(AI가 정리, 수치·시각 검증), 연락한 곳과 결과.
// 시스템은 연락하지 않는다. 당직자가 전화나 메신저로 직접 연락하고, 그 결과를 여기에 남긴다.
import { useEffect, useState } from 'react';
import { GRADE_KO, gradeRank } from '../util.js';
import Src from './Src.jsx';

const STATUS = [['reached', '전달함'], ['pending', '회신 대기']];
const HINT = {
  relay: '예: 상수도관 누수 신고를 받아 상수도사업본부 야간 비상연락에 전달함',
  report: '예: 차량 화재로 주민이 대피 중이라 당직사령에게 보고함',
  control_review: '예: 수위가 기준에 닿고 침수 신고가 있어 관리 부서에 통제 검토를 요청함',
  hold: '예: 현장 확인 결과를 기다린 뒤 판단하기로 함',
};

export function briefOf(draft) {
  if (!draft) return null;
  if (draft.headline) return { headline: draft.headline, facts: draft.facts ?? [], ask: draft.ask ?? '' };
  if (draft.sms) return { headline: draft.sms, facts: [], ask: '' }; // 11/9 저장 기록(옛 형식)
  return null;
}
export const briefText = (b) => [b.headline, ...b.facts.map((f) => `- ${f}`), b.ask && `요청: ${b.ask}`].filter(Boolean).join('\n');

export default function DecisionForm({ scenario, inc, action, busy, onDecide, onRedraft, onCancel }) {
  const draft = inc.draft;
  const [reason, setReason] = useState('');
  const [brief, setBrief] = useState(briefOf(draft));
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState(() => (draft?.recipients ?? []).map((id) => ({ id, status: null, note: '' })));
  const [adding, setAdding] = useState(false);

  // 전달 사항이 새로 오면(다시 쓰기) 당직자가 고치지 않은 경우에만 바꾼다
  useEffect(() => { if (!editing) setBrief(briefOf(draft)); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const hold = action === 'hold';
  const can = reason.trim() && !busy && (hold || (contacts.length && contacts.every((c) => c.status)));
  const quick = [...inc.grade_why, ...(inc.citations ?? []).filter((c) => !/기록/.test(c.heading)).map((c) => `${c.heading}에 따름`)].slice(0, 4);
  const org = (id) => scenario.contacts.find((k) => k.id === id);
  const others = scenario.contacts.filter((k) => !contacts.some((c) => c.id === k.id));
  const set = (id, patch) => setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const differ = !hold && gradeRank(action) !== gradeRank(inc.grade);
  const missing = contacts.filter((c) => !c.status).length;

  const copy = async () => { try { await navigator.clipboard.writeText(briefText(brief)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 복사 불가 환경 */ } };
  const submit = async (e) => {
    e.preventDefault();
    await onDecide({ incident_id: inc.id, action, reason, contacts: hold ? [] : contacts.map(({ id, status, note }) => ({ id, status, note })), brief: hold ? null : brief });
  };

  return (
    <form className="dform" onSubmit={submit}>
      <label className="field">
        <span>사유</span>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={HINT[action] ?? HINT.report} autoFocus />
      </label>
      {quick.length > 0 && (
        <div className="quick">{quick.map((q) => <button type="button" key={q} className="chip" onClick={() => setReason((r) => (r ? `${r} ${q}.` : `${q}.`))}>{q}</button>)}</div>
      )}
      {differ && <p className="follow">권고({GRADE_KO[inc.grade]})와 다른 결정입니다. 사유가 그대로 기록됩니다.</p>}

      {!hold && (
        <>
          <section className="brief" aria-label="전달 사항">
            <div className="brief-h">
              <b>전달 사항</b>
              {draft && <span className="sub"><Src k="ai" />{draft.warnings?.length ? `검증 경고 ${draft.warnings.length}건` : `수치·시각 ${draft.claims_checked ?? 0}개를 근거와 대조`}</span>}
              <span className="sp" />
              {brief && <button type="button" className="link quiet" onClick={copy}>{copied ? '복사했습니다' : '복사'}</button>}
              {brief && <button type="button" className="link quiet" onClick={() => setEditing(!editing)}>{editing ? '다 고침' : '고치기'}</button>}
            </div>
            {!brief && <p className="muted">관찰 단계라 정리된 전달 사항이 없습니다. <button type="button" className="link" disabled={busy} onClick={() => onRedraft(inc.id)}>정리 요청</button></p>}
            {brief && !editing && (
              <div className="brief-body">
                <p className="headline">{brief.headline}</p>
                {brief.facts.length > 0 && <ul>{brief.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
                {brief.ask && <p className="ask"><span>요청</span>{brief.ask}</p>}
              </div>
            )}
            {brief && editing && (
              <div className="brief-edit">
                <input value={brief.headline} onChange={(e) => setBrief({ ...brief, headline: e.target.value })} aria-label="한 줄 요약" />
                <textarea rows={Math.max(2, brief.facts.length)} value={brief.facts.join('\n')} onChange={(e) => setBrief({ ...brief, facts: e.target.value.split('\n') })} aria-label="사실, 한 줄에 하나" />
                <input value={brief.ask} onChange={(e) => setBrief({ ...brief, ask: e.target.value })} aria-label="요청" />
              </div>
            )}
            {draft?.warnings?.length > 0 && <p className="blocked">검증 경고: {draft.warnings.join(' / ')}</p>}
          </section>

          <fieldset className="contacts">
            <legend>연락한 곳 <span className="sub">AI 제안, 연락은 당직자가 직접</span></legend>
            {contacts.map((c) => (
              <div key={c.id} className={`contact ${c.status ? `is-${c.status}` : ''}`}>
                <div className="who"><span className="org">{org(c.id)?.org}</span><span className="role">{org(c.id)?.role}</span></div>
                <div className="seg" role="radiogroup" aria-label={`${org(c.id)?.org} 연락 결과`}>
                  {STATUS.map(([k, l]) => (
                    <button type="button" key={k} role="radio" aria-checked={c.status === k} className={c.status === k ? 'on' : ''} onClick={() => set(c.id, { status: k })}>{l}</button>
                  ))}
                </div>
                <input className="note" value={c.note} onChange={(e) => set(c.id, { note: e.target.value })} placeholder="받은 사람, 들은 말 (선택)" />
                <button type="button" className="x" aria-label={`${org(c.id)?.org} 빼기`} onClick={() => setContacts((cs) => cs.filter((x) => x.id !== c.id))}>빼기</button>
              </div>
            ))}
            {adding ? (
              <div className="add-list">{others.map((k) => <button type="button" key={k.id} className="chip" onClick={() => { setContacts((cs) => [...cs, { id: k.id, status: null, note: '' }]); setAdding(false); }}>{k.org}</button>)}</div>
            ) : others.length > 0 && <button type="button" className="link quiet" onClick={() => setAdding(true)}>다른 곳 추가</button>}
          </fieldset>
        </>
      )}
      <div className="row end">
        <button type="button" className="btn ghost" onClick={onCancel}>취소</button>
        <button className={`btn record a-${action}`} disabled={!can}>{hold ? '보류로 기록' : '결정과 연락 결과 기록'}</button>
      </div>
      <p className="hint">{hold
        ? '보류 사유는 시각과 함께 인계 보고서에 남습니다. 상황이 바뀌면 규칙표가 다시 알립니다.'
        : missing ? `연락한 곳마다 결과를 골라 주세요(남은 곳 ${missing}). 시스템은 연락하지 않습니다.` : '회신 대기인 곳은 사건 줄과 인계 보고서에 남습니다.'}</p>
    </form>
  );
}
