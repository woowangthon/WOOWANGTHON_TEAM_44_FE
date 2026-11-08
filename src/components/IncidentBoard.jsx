import { GRADE_KO, STATUS_KO, ACTION_KO, toMin } from '../util.js';
import Src from './Src.jsx';

const STATUS_HELP = { met: '기준을 넘었습니다', approaching: '기준에 가까워졌거나 일부 조건만 충족했습니다', not_met: '기준 아래입니다', unknown: '판정할 자료가 아직 없습니다' };

function Criteria({ items, scenario }) {
  if (!items.length) return null;
  const clause = (id) => scenario.manual.clauses.find((c) => c.id === id);
  return (
    <div className="block">
      <h4>시설 통제 기준 <Src k="rule">규칙표 판정</Src> <span className="sub">도달은 기준 충족, 접근은 일부 조건만 충족</span></h4>
      <ul className="criteria">
        {items.map((c) => (
          <li key={c.id} className={`crit ${c.status}`}>
            <span className={`st st-${c.status}`} title={STATUS_HELP[c.status]}>{STATUS_KO[c.status]}</span>
            <div>
              <div className="crit-label">{c.label}</div>
              <div className="crit-obs">지금: {c.observed}{c.evidence?.length ? ` (${c.evidence.join(', ')})` : ''}</div>
              <div className="crit-src">근거 조항: {clause(c.clause)?.heading}</div>
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
          <span className="grade-label">권고 등급<Src k="rule" /> <span className="scale">관찰, 보고 권고, 통제 검토 요청 권고 순으로 높음</span></span>
          <span className="grade-big">{GRADE_KO[inc.grade]}</span>
          <span className="grade-why">{inc.grade_why.join(', ')}</span>
        </div>
        <div className={`human-row ${lastDecision ? `a-${lastDecision.action}` : 'none'}`}>
          <span className="grade-label">당직자 결정<Src k="human" /></span>
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
      {inc.ai_error && <p className="ai-err">AI 판단 실패: {inc.ai_error}. 기준 판정과 권고 등급은 규칙표 결과이므로 그대로 유효합니다.</p>}

      <Criteria items={inc.criteria} scenario={scenario} />

      <div className="block">
        <h4>매뉴얼에서 찾은 조항 <Src k="ai">AI가 고름</Src> <span className="sub">원문과 한 글자씩 대조해 통과한 인용만 보여 줍니다</span></h4>
        <p className="manual-title">{scenario.manual.title}</p>
        {inc.citations.length ? (
          <ul className="cites">
            {inc.citations.map((c, i) => (
              <li key={i}>
                <div className="cite-head">{c.heading} <span className="verified">원문과 글자 일치 확인</span></div>
                <blockquote>{c.quote}</blockquote>
                <p className="cite-why"><Src k="ai">AI 설명</Src> {c.why}</p>
              </li>
            ))}
          </ul>
        ) : <p className="muted">{inc.none_reason ?? '아직 찾지 않았습니다'}</p>}
        {inc.citations_blocked?.length > 0 && <p className="blocked">원문과 다른 인용 {inc.citations_blocked.length}건은 검증에서 걸러 표시하지 않았습니다.</p>}
      </div>

      <div className="block">
        <h4>묶인 신호 {inc.signal_ids.length}건 <span className="sub">같은 장소·시설이면 규칙으로, 애매하면 AI가 묶습니다</span></h4>
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

// 첫 방문 안내: 사건이 생기기 전까지 사건 칸에 보인다(첫 사건이 열리면 사라짐)
function Intro({ scenario, speed }) {
  const span = toMin(scenario.clock.end) - toMin(scenario.clock.start);
  const mins = Math.max(1, Math.round(span / speed));
  return (
    <div className="intro" aria-labelledby="intro-h">
      <h3 id="intro-h">처음 오셨다면, 이렇게 보시면 됩니다</h3>
      <p className="intro-lead">
        새벽에 혼자 근무하는 지자체 당직자에게 전화 메모, 기관 통보문, 재난문자, 112·119 공조, 시스템 알림이 흩어져 들어옵니다.
        당직메이트는 이 신호를 사건별로 묶고, 시설 통제 기준과 매뉴얼 조항을 원문 그대로 보여 주며, 보고 초안을 올립니다.
        보고할지, 통제 검토를 요청할지, 보류할지는 당직자가 정합니다.
      </p>
      <ol className="intro-steps">
        <li><b>위의 「재생」</b>을 누르면 {scenario.clock.start}~{scenario.clock.end}의 합성 신호 {scenario.signals.length}건이 시각대로 들어옵니다. 지금 {speed}배속이면 시계로 약 {mins}분이고, AI가 신호를 읽는 동안(건당 5~15초)에는 시계를 멈춥니다. 「다음 신호로」는 신호가 없는 시간만 건너뜁니다.</li>
        <li><b>권고 등급이 오르면 재생이 멈춥니다.</b> 가운데에서 기준 판정과 매뉴얼 인용을, 오른쪽에서 AI 초안과 수신처 제안을 확인합니다.</li>
        <li><b>오른쪽에서 결정</b>합니다. 보고, 통제 검토 요청, 보류 중 하나를 사유와 함께 고르면 시각과 함께 아래 결정 로그에 남습니다. 실제 전화·문자 발송은 없습니다.</li>
        <li><b>「인계 보고서 만들기」</b>로 아침 인계 문서를 만듭니다. 결정하지 않은 사건은 확인 사항으로 넘어갑니다.</li>
      </ol>
      <div className="intro-who">
        <p><Src k="ai" /> 사람이 쓴 신호 읽기, 애매한 사건 묶기, 매뉴얼 조항 고르기, 보고 초안, 인계 요약</p>
        <p><Src k="rule" /> 기준 도달 판정, 권고 등급, 재촉. 신호에서 뽑은 사실을 코드의 규칙표에 대어 정하고, AI가 등급을 바꾸지 않습니다</p>
        <p><Src k="human" /> 모든 결정과 사유</p>
        <p className="intro-check">AI가 쓴 인용은 매뉴얼 원문과, 수치·시각은 근거 신호와 대조해 통과한 것만 올립니다. 대조 결과는 위쪽 「AI 검증」 줄에 쌓입니다.</p>
      </div>
    </div>
  );
}

export default function IncidentBoard({ scenario, session, focus, onPick, alertInc, speed }) {
  const incs = session?.incidents ?? [];
  const focused = incs.find((i) => i.id === focus);
  return (
    <section className="col board" aria-labelledby="board-h">
      <div className="col-head">
        <h2 id="board-h">사건</h2>
        <span className="count">AI가 같은 장소, 같은 위험의 신호를 하나로 묶습니다</span>
      </div>
      {!incs.length && <Intro scenario={scenario} speed={speed} />}
      {incs.length > 1 && (
        <div className="minis" role="tablist" aria-label="사건 목록">
          {incs.map((i) => <Card key={i.id} inc={i} scenario={scenario} session={session} onPick={onPick} selected={i.id === focus} />)}
        </div>
      )}
      {focused && <Card inc={focused} scenario={scenario} session={session} focused onPick={onPick} alert={alertInc === focused.id} />}
    </section>
  );
}
