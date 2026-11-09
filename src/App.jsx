import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, store } from './api.js';
import { useReplay } from './useReplay.js';
import { fmt, gradeRank } from './util.js';
import SignalFeed from './components/SignalFeed.jsx';
import IncidentBoard from './components/IncidentBoard.jsx';
import DecisionPanel from './components/DecisionPanel.jsx';
import DecisionLog from './components/DecisionLog.jsx';
import HandoverModal from './components/HandoverModal.jsx';
import VerifyBar from './components/VerifyBar.jsx';
import SituationMap from './components/SituationMap.jsx';
import LevelChart from './components/LevelChart.jsx';
import Colleague from './components/Colleague.jsx';
import Scatter from './components/Scatter.jsx';

const SPEEDS = [30, 60, 120];

export default function App() {
  const [list, setList] = useState([]);
  const [scenarioId, setScenarioId] = useState(() => store.get('dm:scenario') || 'cheongju-20260709');
  const r = useReplay(scenarioId);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [code, setCode] = useState('');
  const [without, setWithout] = useState(false);

  useEffect(() => { api.scenarios().then(setList).catch(() => {}); }, []);
  useEffect(() => { store.set('dm:scenario', scenarioId); setSelected(null); setReport(null); }, [scenarioId]);

  const incidents = r.session?.incidents ?? [];
  // 선택이 없으면 결정이 가장 급한 사건을 보여 준다
  const focus = useMemo(() => {
    if (r.alertInc) return r.alertInc;
    if (selected && incidents.some((i) => i.id === selected)) return selected;
    return [...incidents].sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade))[0]?.id ?? null;
  }, [r.alertInc, selected, incidents]);
  const focusInc = incidents.find((i) => i.id === focus) ?? null;

  const pick = useCallback((id) => { setSelected(id); r.setAlertInc(null); }, [r.setAlertInc]); // eslint-disable-line react-hooks/exhaustive-deps
  const makeReport = async () => {
    r.setPlaying(false);
    const out = await r.handover();
    if (out) setReport(out);
  };

  if (!r.scenario) {
    return <div className="boot">{r.error ? `시나리오를 불러오지 못했습니다: ${r.error}` : '시나리오를 불러오는 중입니다'}</div>;
  }
  const scn = r.scenario;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-name">당직메이트</span>
          <span className="brand-sub">{scn.duty.office}, {scn.duty.officer_role}</span>
        </div>
        <div className="controls">
          <select aria-label="시나리오" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
            {(list.length ? list : [{ id: scn.id, title: scn.title }]).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <button className="btn primary" onClick={() => r.setPlaying(!r.playing)} disabled={!r.session || (r.done && !r.playing)}>
            {r.playing ? '일시정지' : r.done ? '재생 끝' : '재생'}
          </button>
          <button className="btn ghost" onClick={r.skip} disabled={!r.session || r.done || !!r.busy} title="신호가 없는 시간을 건너뜁니다">다음 신호로</button>
          <label className="speed">
            <span>배속</span>
            <select value={r.speed} onChange={(e) => r.setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => <option key={s} value={s}>{s}배</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={r.autoPause} onChange={(e) => r.setAutoPause(e.target.checked)} />
            권고가 오르면 멈춤
          </label>
          <button className="btn ghost" onClick={() => { r.reset(); setSelected(null); setReport(null); }} disabled={!!r.busy}>처음부터</button>
        </div>
        <div className="clock-box">
          <div className="clock" aria-live="polite">{fmt(r.clock)}</div>
          <div className="clock-sub">시나리오 시각, {r.speed}배속</div>
        </div>
        <button className={`btn compare-btn ${without ? 'on' : ''}`} aria-pressed={without} onClick={() => setWithout((w) => !w)}>
          {without ? '당직메이트로 보기' : '없을 때 보기'}
        </button>
        <button className="btn report-btn" onClick={makeReport} disabled={!r.session?.signals.length || !!r.busy}>인계 보고서 만들기</button>
      </header>

      <div className="mode-band" role="status">
        <strong>재생 모드 · {scn.basis ? '기록 기반 합성 신호' : '합성 신호'}</strong>
        <span className="band-text">{scn.disclaimer}</span>
        <details>
          <summary>자세히</summary>
          <div className="band-more">
            <p>{scn.disclaimer}</p>
            {scn.sources?.length > 0 && <p>출처: {scn.sources.join(', ')}</p>}
            <p>AI는 어떤 조치도 실행하지 않고, 이 화면에서는 실제 전화·문자 발송도 하지 않습니다.</p>
          </div>
        </details>
        <span className="no-send">실제 발송 없음</span>
      </div>

      <div className="status-row">
        <div className={`ai-status ${r.busy ? 'on' : ''}`} aria-live="polite">
          {r.busy ? <>{r.busy} · 그동안 시계를 멈춥니다</> : r.error ? <span className="err">{r.error}. 재생을 누르면 같은 신호를 다시 처리합니다. <button className="link" onClick={() => r.setError(null)}>닫기</button></span> : r.playing ? '재생 중' : r.done ? '모든 신호를 받았습니다. 남은 결정을 마치고 인계 보고서를 만드세요.' : r.alertInc ? `사건 #${incidents.find((i) => i.id === r.alertInc)?.no}의 권고 등급이 올라 멈췄습니다. 근거를 보고 결정하거나 재생을 눌러 이어 가세요.` : r.session?.signals.length ? '멈춤' : '멈춤 · 「재생」을 누르면 시작합니다'}
        </div>
        <VerifyBar session={r.session} />
      </div>

      {r.needCode && (
        <form className="code-gate" onSubmit={(e) => { e.preventDefault(); r.saveCode(code); if (!r.session) r.reset(); }}>
          <label>시연 코드를 입력하면 AI가 동작합니다 <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus /></label>
          <button className="btn primary" disabled={!code.trim()}>입력</button>
        </form>
      )}

      {without ? <Scatter scenario={scn} session={r.session} pending={r.pending} /> : (
        <main className="grid">
          <SignalFeed session={r.session} scenario={scn} onMemo={r.memo} busy={!!r.busy} onPick={pick} pending={r.pending} />
          <div className="center">
            <section className="situation" aria-label="상황판">
              <SituationMap scenario={scn} session={r.session} pending={r.pending} focus={focus} onPick={pick} />
              <LevelChart scenario={scn} session={r.session} clock={r.clock} focusInc={focusInc} />
            </section>
            <IncidentBoard scenario={scn} session={r.session} focus={focus} onPick={pick} alertInc={r.alertInc} speed={r.speed} />
          </div>
          <div className="right">
            <Colleague scenario={scn} session={r.session} pending={r.pending} onPick={pick} />
            <DecisionPanel key={focusInc?.id ?? 'none'}
              scenario={scn} incident={focusInc} busy={!!r.busy} onDecide={(pl) => { setSelected(pl.incident_id); return r.decide(pl); }} onRedraft={r.redraft} />
          </div>
        </main>
      )}

      <DecisionLog session={r.session} scenario={scn} onPick={pick} />
      {report && <HandoverModal report={report} scenario={scn} onClose={() => setReport(null)} />}
    </div>
  );
}
