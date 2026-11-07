import { GRADE_KO, STATUS_KO, ACTION_KO } from '../util.js';

const STATUS_HELP = { met: '기준을 넘었습니다', approaching: '기준에 가까워졌거나 일부 조건만 충족했습니다', not_met: '기준 아래입니다', unknown: '판정할 자료가 아직 없습니다' };

function Criteria({ items, scenario }) {
  if (!items.length) return null;
  const clause = (id) => scenario.manual.clauses.find((c) => c.id === id);
  return (
    <div className="block">
      <h4>시설 통제 기준 <span className="sub">도달은 기준 충족, 접근은 일부 조건만 충족</span></h4>
      <ul className="criteria">
        {items.map((c) => (
          <li key={c.id} className={`crit ${c.status}`}>
            <span className={`st st-${c.status}`} title={STATUS_HELP[c.status]}>{STATUS_KO[c.status]}</span>
            <div>
              <div className="crit-label">{c.label}</div>
              <div className="crit-obs">지금: {c.observed}{c.evidence?.length ? ` (${c.evidence.join(', ')})` : ''}</div>
              <div className="crit-src">{clause(c.clause)?.heading} · 판정은 규칙표가 합니다</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ inc, scenario, session, focused, onPick, alert, selected }) {
  const fac = scenario.facilities.find((f) => f.id === inc.facility_id);
  const mgr = fac && scenario.contacts.find((k) => k.id === fac.manager_contact);
  const lastNudge = inc.nudges.at(-1);
  const lastDecision = inc.decisions.at(-1);
  if (!focused) {
    return (
      <button className={`inc mini g-${inc.grade} ${selected ? 'sel' : ''}`} role="tab" aria-selected={!!selected} onClick={() => onPick(inc.id)}>
        <span className="inc-no">#{inc.no}</span>
        <span className="inc-title">{inc.title}</span>
        <span className={`grade g-${inc.grade}`}>{GRADE_KO[inc.grade]}</span>
        <span className="mini-meta">신호 {inc.signal_ids.length}건{lastDecision ? `, ${lastDecision.at} ${ACTION_KO[lastDecision.action]}` : ', 결정 전'}</span>
      </button>
    );
  }
  return (
    <article className={`inc full g-${inc.grade} ${alert ? 'alert' : ''}`} aria-labelledby={`inc-${inc.id}`}>
      <header className="inc-head">
        <span className="inc-no">사건 #{inc.no}</span>
        <h3 id={`inc-${inc.id}`}>{inc.title}</h3>
        {fac && <p className="fac">관련 시설: {fac.name}{mgr ? `, 관리주체는 ${mgr.org}` : ''}</p>}
      </header>

      <div className="ai-vs-human">
        <div className={`grade-row g-${inc.grade}`}>
          <span className="grade-label">AI 권고 <span className="scale">관찰, 보고 권고, 통제 검토 요청 권고 순으로 높음</span></span>
          <span className="grade-big">{GRADE_KO[inc.grade]}</span>
          <span className="grade-why">{inc.grade_why.join(', ')}</span>
        </div>
        <div className={`human-row ${lastDecision ? `a-${lastDecision.action}` : 'none'}`}>
          <span className="grade-label">당직자 결정</span>
          {lastDecision ? (
            <>
              <span className="grade-big">{ACTION_KO[lastDecision.action]}</span>
              <span className="grade-why">{lastDecision.at}, {lastDecision.reason}</span>
            </>
          ) : <span className="grade-big">아직 결정 전</span>}
        </div>
      </div>

      {lastNudge && (!lastDecision || lastNudge.at >= lastDecision.at) && (
        <p className="nudge" role="alert">{lastNudge.at} {lastNudge.text}</p>
      )}
      {inc.ai_error && <p className="ai-err">AI 판단 실패: {inc.ai_error}. 기준 판정과 등급은 규칙표 결과이므로 그대로 유효합니다.</p>}

      <Criteria items={inc.criteria} scenario={scenario} />

      <div className="block">
        <h4>매뉴얼에서 찾은 조항</h4>
        <p className="manual-title">{scenario.manual.title}</p>
        {inc.citations.length ? (
          <ul className="cites">
            {inc.citations.map((c, i) => (
              <li key={i}>
                <div className="cite-head">{c.heading} <span className="verified">원문과 글자 일치 확인</span></div>
                <blockquote>{c.quote}</blockquote>
                <p className="cite-why">{c.why}</p>
              </li>
            ))}
          </ul>
        ) : <p className="muted">{inc.none_reason ?? '아직 찾지 않았습니다'}</p>}
        {inc.citations_blocked?.length > 0 && <p className="blocked">원문과 다른 인용 {inc.citations_blocked.length}건은 검증에서 걸러 표시하지 않았습니다.</p>}
      </div>

      <div className="block">
        <h4>묶인 신호 {inc.signal_ids.length}건</h4>
        <ul className="bound">
          {inc.signal_ids.map((sid) => {
            const s = session.signals.find((x) => x.id === sid);
            return <li key={sid}><time>{s.t}</time> <span className="sid">{sid}</span> {s.norm.one_line}</li>;
          })}
        </ul>
      </div>
    </article>
  );
}

export default function IncidentBoard({ scenario, session, focus, onPick, alertInc }) {
  const incs = session?.incidents ?? [];
  const focused = incs.find((i) => i.id === focus);
  return (
    <section className="col board" aria-labelledby="board-h">
      <div className="col-head">
        <h2 id="board-h">사건</h2>
        <span className="count">AI가 같은 장소, 같은 위험의 신호를 하나로 묶습니다</span>
      </div>
      {!incs.length && <p className="empty">아직 사건이 없습니다.</p>}
      {incs.length > 1 && (
        <div className="minis" role="tablist" aria-label="사건 목록">
          {incs.map((i) => <Card key={i.id} inc={i} scenario={scenario} session={session} onPick={onPick} selected={i.id === focus} />)}
        </div>
      )}
      {focused && <Card inc={focused} scenario={scenario} session={session} focused onPick={onPick} alert={alertInc === focused.id} />}
    </section>
  );
}
