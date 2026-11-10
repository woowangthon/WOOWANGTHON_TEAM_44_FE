import { useCallback, useEffect, useState } from 'react';
import { auth, store } from './api.js';
import { useSession } from './useSession.js';
import { usePractice } from './practice.js';
import { chooseView, needList } from './util.js';
import Login from './components/Login.jsx';
import Welcome from './components/Welcome.jsx';
import Header from './components/Header.jsx';
import Queue from './components/Queue.jsx';
import Arrival from './components/Arrival.jsx';
import Standby from './components/Standby.jsx';
import Focus from './components/Focus.jsx';
import Drawer from './components/Drawer.jsx';
import Overview from './components/Overview.jsx';
import Night from './components/Night.jsx';
import Scatter from './components/Scatter.jsx';
import HandoverModal from './components/HandoverModal.jsx';
import NextShift from './components/NextShift.jsx';
import { Intro, CoachBar, Finale } from './components/Coach.jsx';

const RECORD_ID = 'cheongju-20260709';

export default function App() {
  const [authed, setAuthed] = useState(() => !!auth.get());
  const [mode, setMode] = useState(() => store.json('dm:mode') ?? { kind: 'live' });
  const [welcome, setWelcome] = useState(null); // null | 'first' | 'menu'
  const [ready, setReady] = useState(false); // 근무 화면이 다 뜬 뒤에 「처음이신가요?」를 띄운다
  useEffect(() => { store.set('dm:mode', JSON.stringify(mode)); }, [mode]);

  const logout = () => { auth.clear(); setAuthed(false); setMode({ kind: 'live' }); };
  if (!authed && mode.kind !== 'record') {
    return <Login onIn={(o) => {
      if (o?.record) { setMode({ kind: 'record', id: RECORD_ID }); return; }
      setAuthed(true); setMode({ kind: 'live' });
      if (!store.get('dm:welcomed')) setWelcome('first');
    }} />;
  }
  const practice = (id) => { store.set('dm:welcomed', '1'); setWelcome(null); setMode({ kind: 'practice', id }); };
  return (
    <>
      <Workspace key={`${mode.kind}:${mode.id ?? ''}`} mode={mode} authed={authed}
        goLive={() => (authed ? setMode({ kind: 'live' }) : setMode({ kind: 'live' }))}
        goRecord={() => setMode({ kind: 'record', id: RECORD_ID })}
        openPractice={() => setWelcome('menu')} onLogout={logout} onReady={setReady} />
      {welcome && authed && ready && <Welcome first={welcome === 'first'} onPractice={practice} onClose={() => { store.set('dm:welcomed', '1'); setWelcome(null); }} />}
    </>
  );
}

function Workspace({ mode, authed, goLive, goRecord, openPractice, onLogout, onReady }) {
  const r = useSession(mode);
  const loaded = !!(r.scenario && r.session);
  useEffect(() => { onReady?.(loaded); }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState(null);
  const [pinned, setPinned] = useState(mode.kind === 'record' ? 'night' : 'auto');
  const [flowFor, setFlowFor] = useState(null);
  const [scatter, setScatter] = useState(false);
  const [report, setReport] = useState(null);
  const [drawerReq, setDrawerReq] = useState(null);
  const [toast, setToast] = useState(null);
  const [next, setNext] = useState(false);

  const onFocus = useCallback((id) => { setPicked(id); setPinned('auto'); }, []);
  const onView = useCallback((v, id) => {
    if (v === 'flow') { setFlowFor(id); return; }
    setPicked(null);
    if (v === 'auto') { setFlowFor(null); setPinned('auto'); } else setPinned(v);
  }, []);
  const p = usePractice(r, { onFocus, onView });
  r.restartPractice = p.restart;

  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(null), 3500); return () => clearTimeout(id); }, [toast]);

  if (!r.scenario || !r.session) {
    return <div className="boot">{r.error ? `불러오지 못했습니다: ${r.error}` : r.needCode ? <NeedCodeNote onLogout={onLogout} /> : '근무 화면을 준비하는 중입니다'}</div>;
  }

  const incs = r.session.incidents;
  const needs = needList(incs);
  const pickedInc = incs.find((i) => i.id === picked);
  const coach = p.coach;
  // 연습에서 신호가 흐르는 동안에는 평시 화면(방금 들어온 신호)을 보여 주고, 멈춘 순간에만 결정 화면을 연다
  const flowing = p.enabled && ['intro', 'flowing'].includes(p.phase) && (!pinned || pinned === 'auto');
  const view = chooseView({ pinned: coach?.expect === 'memo' || flowing ? 'standby' : pinned, needs, picked: !!pickedInc, ended: r.ended });
  const focusInc = pickedInc ?? needs[0] ?? null;
  const shownView = view === 'decide' && !focusInc ? 'standby' : view;
  const pick = (id) => { setPicked(id); setPinned('auto'); };
  const makeReport = async () => { r.setRunning(false); const out = await r.handover(); if (out) setReport(out); };
  const stepIdx = p.script && coach ? p.script.steps.findIndex((s) => s.id === coach.id) : -1;
  const stepNo = stepIdx >= 0 ? stepIdx + 1 : null;

  return (
    <div className="app">
      <Header r={r} view={shownView} pinned={pinned} setPinned={(v) => { setPinned(v); setPicked(null); }}
        onReport={makeReport} onPractice={openPractice} onLive={goLive} onLogout={onLogout} authed={authed} />
      {r.needCode && <div className="banner">체험 기간이 끝났습니다. 기관 접속 코드로 다시 로그인해 주세요. <button className="link" onClick={onLogout}>로그인</button></div>}
      {r.capped && <div className="banner">오늘 AI 체험 한도를 다 썼습니다. 저장된 연습 기록으로 끝까지 보실 수 있습니다. <button className="link" onClick={goRecord}>저장된 연습 기록 보기</button></div>}
      {r.error && <div className="banner err">{r.error}. <button className="link" onClick={() => { r.setError(null); if (r.kind === 'practice' && p.phase === 'flowing') r.setRunning(true); }}>다시 시도</button></div>}
      <div className={`ws v-${shownView}`}>
        <Queue session={r.session} focus={shownView === 'decide' ? focusInc?.id : null} onPick={pick} onSignals={() => { setPinned('auto'); setDrawerReq({ tab: 'all', at: Date.now() }); }} />
        <main className="main">
          <CoachBar coach={coach} step={stepNo} total={p.script?.steps.length ?? 0} />
          <div className="main-in">
          <Arrival pending={r.pending} arrival={r.arrival} clear={() => r.setArrival(null)} />
          {toast && <p className="toast" role="status">{toast}</p>}
          {shownView === 'standby' && <Standby r={r} onPractice={openPractice} suggest={coach?.memo} />}
          {shownView === 'decide' && focusInc && (
            <Focus r={r} inc={focusInc} coach={coach} flowOpen={flowFor === focusInc.id}
              onDecided={(msg) => { setToast(msg); setTimeout(() => setPicked((x) => (x === focusInc.id ? null : x)), 1200); }} />
          )}
          {shownView === 'overview' && <Overview r={r} focus={focusInc?.id} onPick={pick} />}
          {shownView === 'night' && <Night r={r} onPick={pick} onReport={makeReport} onScatter={() => setScatter(true)} />}
          </div>
        </main>
        {(shownView === 'standby' || shownView === 'decide') && (
          <Drawer r={r} live={shownView === 'standby' && r.kind === 'live'} inc={shownView === 'decide' ? focusInc : null}
            focus={focusInc?.id} onPick={pick} request={drawerReq} />
        )}
      </div>

      {p.enabled && p.phase === 'intro' && <Intro script={p.script} onBegin={p.begin} onSkip={goLive} />}
      {p.enabled && p.phase === 'finale' && !scatter && !report && !next && <Finale session={r.session} onScatter={() => setScatter(true)} onLive={goLive} onAgain={p.restart} />}
      {scatter && <Scatter session={r.session} onClose={() => setScatter(false)} />}
      {report && <HandoverModal report={report} scenario={r.scenario} r={r} onClose={() => setReport(null)} onNext={() => { setReport(null); setNext(true); }} />}
      {next && <NextShift onLive={goLive} onClose={() => setNext(false)} />}
    </div>
  );
}

function NeedCodeNote({ onLogout }) {
  return <span>기관 접속 코드가 필요합니다. <button className="link" onClick={onLogout}>로그인 화면으로</button></span>;
}
