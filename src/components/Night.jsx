// 근무 기록(아침 인계): 밤 전체를 시각 순으로 보여 주고, 남은 확인 사항과 인계 보고서, 검증 기록을 옆에 둔다.
import { ACTION_KO, GRADE_KO, incState } from '../util.js';

function nightItems(session) {
  const out = [];
  for (const inc of session.incidents) {
    out.push({ t: inc.opened_at, o: 0, kind: 'open', no: inc.no, id: inc.id, text: `새 사건 ${inc.title}` });
    inc.grade_history.forEach((g) => out.push({ t: g.at, o: 1, kind: `grade g-${g.grade}`, no: inc.no, id: inc.id, text: `권고 「${GRADE_KO[g.grade]}」, ${g.why.join(', ')}` }));
    // 재촉은 보류한 뒤 다시 알린 것만 싣는다(결정 전 반복 알림은 권고 줄과 겹친다)
    inc.nudges.filter((n) => inc.decisions.some((d) => d.action === 'hold' && d.at <= n.at)).forEach((n) => out.push({ t: n.at, o: 2, kind: 'nudge', no: inc.no, id: inc.id, text: n.text }));
    inc.decisions.forEach((d) => out.push({ t: d.at, o: 3, kind: `dec a-${d.action}`, no: inc.no, id: inc.id, text: `당직자 ${ACTION_KO[d.action]}: ${d.reason}` }));
  }
  return out.sort((a, b) => a.t.localeCompare(b.t) || a.o - b.o);
}

const METRICS = [
  ['llm_calls', 'AI 호출', '회'],
  ['citations_shown', '원문과 글자까지 맞아 보여 준 인용', '건'],
  ['citations_blocked', '원문과 달라 막은 인용', '건'],
  ['facts_verified', '근거 구절 확인을 통과한 사실', '건'],
  ['draft_claims_checked', '근거 신호와 대조한 전달 사항 속 수치·시각', '개'],
  ['draft_warnings', '전달 사항 검증 경고', '건'],
  ['check_failures', '검증에 걸려 다시 받은 AI 답', '건'],
];

export default function Night({ r, onPick, onReport, onScatter }) {
  const s = r.session;
  const items = nightItems(s);
  const open = s.incidents.filter((i) => ['need', 'held'].includes(incState(i)));
  const org = (id) => r.scenario.contacts.find((k) => k.id === id)?.org ?? id;
  const waiting = s.incidents.flatMap((i) => i.decisions.flatMap((d) => (d.contacts ?? []).filter((c) => c.status === 'pending').map((c) => ({ inc: i, c, at: d.at }))));
  const decisions = s.incidents.reduce((n, i) => n + i.decisions.length, 0);
  return (
    <div className="night">
      <section className="night-main" aria-labelledby="night-h">
        <p className="kicker">{r.kind === 'live' ? '오늘 근무' : '이 새벽 전체'}</p>
        <h1 id="night-h">신호 {s.signals.length}건, 사건 {s.incidents.length}개, 결정 {decisions}번</h1>
        {items.length ? (
          <ol className="flow night-flow">
            {items.map((x, i) => (
              <li key={i} className={x.kind}>
                <time>{x.t}</time><i aria-hidden="true" />
                <span><button className="link quiet no" onClick={() => onPick(x.id, true)}>#{x.no}</button> {x.text}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">아직 기록이 없습니다.</p>}
      </section>
      <aside className="night-side">
        <section>
          <h3>인계할 것</h3>
          {open.length ? (
            <ul className="open-list">{open.map((i) => <li key={i.id}><button className="link quiet" onClick={() => onPick(i.id, true)}>#{i.no} {i.title}</button><span>{incState(i) === 'held' ? '보류 중' : `${GRADE_KO[i.grade]}, 결정 전`}</span></li>)}</ul>
          ) : <p className="muted">결정하지 않은 사건이 없습니다.</p>}
          {waiting.length > 0 && (
            <ul className="open-list">{waiting.map(({ inc, c, at }) => <li key={`${inc.id}-${c.id}`}><button className="link quiet" onClick={() => onPick(inc.id, true)}>#{inc.no} {org(c.id)}</button><span>회신 대기, {at} 연락</span></li>)}</ul>
          )}
          <button className="btn dark wide" onClick={onReport} disabled={!s.signals.length || !!r.busy}>인계 보고서 만들기</button>
          <p className="hint">결정하지 않은 사건과 회신 대기인 곳은 보고서에 확인 사항으로 넘어갑니다.</p>
        </section>
        {r.kind !== 'live' && (
          <section>
            <h3>당직메이트 없이 받았다면</h3>
            <p className="sub">같은 {s.signals.length}건이 다섯 창구로 따로 들어오는 모습을 봅니다.</p>
            <button className="btn wide" onClick={onScatter}>창구별로 보기</button>
          </section>
        )}
        <section>
          <h3>검증 기록</h3>
          <dl className="metrics">
            {METRICS.map(([k, l, u]) => <div key={k}><dt>{l}</dt><dd>{s.metrics?.[k] ?? 0}{u}</dd></div>)}
          </dl>
          <p className="srcl">이 세션에서 검증기가 실제로 한 일입니다.</p>
        </section>
      </aside>
    </div>
  );
}
