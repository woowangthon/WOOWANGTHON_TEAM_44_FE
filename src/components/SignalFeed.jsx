import { useState } from 'react';
import { CHANNEL_KO } from '../util.js';
import LivePanel from './LivePanel.jsx';
import Src from './Src.jsx';

export default function SignalFeed({ session, scenario, onMemo, busy, onPick, pending }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const signals = [...(session?.signals ?? [])].reverse();
  const incNo = Object.fromEntries((session?.incidents ?? []).map((i) => [i.id, i.no]));

  const submit = async (e) => {
    e.preventDefault();
    const r = await onMemo(body, from);
    if (r) { setBody(''); setFrom(''); setOpen(false); }
  };

  return (
    <section className="col feed" aria-labelledby="feed-h">
      <div className="col-head">
        <h2 id="feed-h">들어온 신호</h2>
        <span className="count">{session?.signals.length ?? 0} / {scenario.signals.length}건</span>
      </div>

      <LivePanel />

      <div className="memo">
        {open ? (
          <form onSubmit={submit} className="memo-form">
            <input placeholder="누구에게서 (예: 가온3동 주민)" value={from} onChange={(e) => setFrom(e.target.value)} />
            <textarea rows={3} placeholder="받아 적은 내용" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="row">
              <button className="btn primary" disabled={busy || !body.trim()}>신호로 넣기</button>
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>취소</button>
            </div>
            <p className="hint">직접 넣은 메모도 시나리오 신호와 같은 AI 단계를 거칩니다.</p>
          </form>
        ) : (
          <button className="btn wide" onClick={() => setOpen(true)}>전화 메모 직접 입력</button>
        )}
      </div>

      {!signals.length && !pending && <p className="empty">재생을 누르면 시나리오 시각에 맞춰 신호가 들어옵니다.</p>}
      <ol className="signals">
        {pending && (
          <li className="sig pending" aria-live="polite">
            <div className="sig-meta">
              <time>{pending.t}</time>
              <span className={`ch ch-${pending.channel}`}>{CHANNEL_KO[pending.channel]}</span>
              <span className="from">{pending.from}</span>
            </div>
            <p className="body">{pending.body}</p>
            <div className="sig-ai reading"><Src k="ai" /> 읽는 중입니다. 요약과 사건 묶기 결과가 끝나면 붙습니다</div>
            <div className="sig-foot"><span className="sid">{pending.id}</span></div>
          </li>
        )}
        {signals.map((s) => (
          <li key={s.id} className={`sig ${s.status} ${s.live ? 'live' : ''}`}>
            <div className="sig-meta">
              <time>{s.t}</time>
              <span className={`ch ch-${s.channel}`}>{CHANNEL_KO[s.channel]}</span>
              <span className="from">{s.from}</span>
            </div>
            <p className={`body ${s.raw_display ? 'raw' : ''}`}>{s.body}</p>
            {s.raw_display && <p className="raw-note">재난문자 원문을 고치지 않고 표시합니다</p>}
            {s.time_note && <p className="raw-note">시각 출처 차이: {s.time_note}</p>}
            <div className="sig-ai">
              {s.norm?.by === 'rule' ? <Src k="rule">자동 요약</Src> : s.norm?.by === 'fallback' ? <span className="blocked">AI 요약 실패, 원문 앞부분</span> : <Src k="ai">AI 요약</Src>} {s.norm?.one_line}
            </div>
            <div className="sig-foot">
              <span className="sid">{s.id}{s.live ? ' · 직접 입력' : ''}</span>
              {s.status === 'incident'
                ? <button className="chip link" title={s.link?.by === 'llm' ? `AI가 묶음: ${s.link.reason ?? ''}` : `규칙으로 묶음: ${s.link?.reason ?? ''}`} onClick={() => onPick(s.incident_id)}>사건 #{incNo[s.incident_id]}에 묶임{s.link?.by === 'llm' ? ' · AI 판단' : ''}</button>
                : <span className="chip muted">사건 아님(시 전체 안내)</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
