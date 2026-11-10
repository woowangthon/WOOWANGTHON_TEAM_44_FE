// 오른쪽 근거 서랍. 사건이 바뀌면 그 사건의 권고 근거에 맞는 탭을 먼저 연다(수위, 지도, 신호).
import { useEffect, useState } from 'react';
import { CHANNEL_KO, STATUS_KO, citeOrder, pickTab } from '../util.js';
import LevelChart, { gaugesWithData } from './LevelChart.jsx';
import SituationMap from './SituationMap.jsx';
import LiveData from './LiveData.jsx';
import Src from './Src.jsx';

const basisLabel = (s) => (s.live ? '직접 입력' : s.record?.basis === 'added' ? '가상 추가' : /실측/.test(s.record?.source ?? '') ? '실측' : s.record?.basis === 'record' ? '보도 기반' : s.record ? '공식 기록 기반' : null);

export function SignalItem({ s, incNo }) {
  return (
    <li className="sig">
      <div className="sig-meta"><time>{s.t}</time><span>{CHANNEL_KO[s.channel]}</span><span className="from">{s.from}</span>{basisLabel(s) && <span className={`basis ${s.record?.basis === 'added' || s.live ? 'added' : ''}`} title={s.record?.source ?? ''}>{basisLabel(s)}</span>}</div>
      <p className="body">{s.body}</p>
      {s.time_note && <p className="note">시각 출처 차이: {s.time_note}</p>}
      <p className="sig-ai">{s.norm?.by === 'rule' ? <Src k="rule">자동 요약</Src> : <Src k="ai">AI 요약</Src>} {s.norm?.one_line}{incNo ? <span className="to"> → #{incNo}</span> : null}</p>
      {s.record?.source && <p className="srcl">{s.record.source}</p>}
    </li>
  );
}

function Clauses({ inc, scenario }) {
  const clause = (id) => scenario.manual.clauses.find((c) => c.id === id);
  return (
    <div className="clauses">
      {inc.criteria.length > 0 && (
        <section>
          <h4>시설 통제 기준 <Src k="rule">규칙표 판정</Src></h4>
          <ul className="criteria">
            {inc.criteria.map((c) => (
              <li key={c.id} className={`crit ${c.status}`}>
                <span className={`st st-${c.status}`}>{STATUS_KO[c.status]}</span>
                <div><b>{c.label}</b><span className="obs">지금: {c.observed}</span><span className="srcl">기준: {c.threshold ?? ''}, {clause(c.clause)?.heading}</span></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h4>매뉴얼에서 찾은 조항 <Src k="ai">AI가 고름</Src></h4>
        <p className="srcl">{scenario.manual.title}. 원문과 한 글자씩 대조해 통과한 인용만 보여 줍니다.</p>
        {inc.citations.length ? citeOrder(inc.citations).map((c, i) => (
          <blockquote key={i} className="quote"><b>{c.heading}</b><span className="ok">원문 일치</span><span className="q">{c.quote}</span><span className="why"><Src k="ai">AI 설명</Src> {c.why}</span></blockquote>
        )) : <p className="muted">{inc.none_reason ?? '아직 찾지 않았습니다'}</p>}
        {inc.citations_blocked?.length > 0 && <p className="blocked">원문과 다른 인용 {inc.citations_blocked.length}건은 검증에서 걸러 표시하지 않았습니다.</p>}
      </section>
    </div>
  );
}

export default function Drawer({ r, inc, focus, onPick, request, live }) {
  const scn = r.scenario;
  const hasLevel = gaugesWithData(scn).length > 0;
  const tabs = live
    ? [['live', '충북 실시간'], ['all', '오늘 들어온 신호']]
    : [...(hasLevel ? [['level', '수위']] : []), ['map', '지도'], ...(inc ? [['signals', `신호 ${inc.signal_ids.length}`], ['clauses', '기준과 조항']] : []), ['all', '전체 신호'], ...(r.kind === 'live' ? [['live', '충북 실시간']] : [])];
  const auto = live ? 'live' : inc ? pickTab(inc, scn) : hasLevel ? 'level' : 'map';
  const [tab, setTab] = useState(auto);
  useEffect(() => { setTab(auto); }, [inc?.id, live]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (request) setTab(request.tab); }, [request]);
  const cur = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];
  const incNo = Object.fromEntries((r.session?.incidents ?? []).map((i) => [i.id, i.no]));
  const sigs = r.session?.signals ?? [];

  return (
    <aside className="drawer">
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={cur === k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="dbody">
        {cur === 'live' && <LiveData />}
        {cur === 'level' && <LevelChart scenario={scn} session={r.session} clock={r.clock} inc={inc} />}
        {cur === 'map' && <SituationMap scenario={scn} session={r.session} pending={r.pending} focus={focus} onPick={onPick} />}
        {cur === 'signals' && inc && <ol className="sigs">{inc.signal_ids.map((sid) => sigs.find((s) => s.id === sid)).filter(Boolean).map((s) => <SignalItem key={s.id} s={s} />)}</ol>}
        {cur === 'clauses' && inc && <Clauses inc={inc} scenario={scn} />}
        {cur === 'all' && (sigs.length ? <ol className="sigs">{[...sigs].reverse().map((s) => <SignalItem key={s.id} s={s} incNo={incNo[s.incident_id]} />)}</ol> : <p className="muted">아직 들어온 신호가 없습니다.</p>)}
      </div>
    </aside>
  );
}
