// 재생 시계와 서버 세션을 묶는 훅. AI가 신호를 처리하는 동안에는 시계를 멈춘다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, store, NeedCode } from './api.js';
import { toMin, fmt, gradeRank } from './util.js';

const TICK_MS = 250;

export function useReplay(scenarioId) {
  const [scenario, setScenario] = useState(null);
  const [session, setSession] = useState(null);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [autoPause, setAutoPause] = useState(true);
  const [busy, setBusy] = useState(null); // 처리 중인 작업 설명
  const [error, setError] = useState(null);
  const [needCode, setNeedCode] = useState(false);
  const [alertInc, setAlertInc] = useState(null); // 방금 권고가 올라간 사건
  const busyRef = useRef(false);
  const clockRef = useRef(0);
  const sessionRef = useRef(null);
  const key = `dm:s:${scenarioId}`;

  useEffect(() => { clockRef.current = clock; }, [clock]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const run = useCallback(async (label, fn) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(label);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      if (e instanceof NeedCode) { setNeedCode(true); setPlaying(false); }
      else { setError(e.message); setPlaying(false); }
      return null;
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, []);

  const start = useCallback(async (scn) => {
    const r = await run('세션 준비', () => api.session({ op: 'start', scenario_id: scenarioId }));
    if (r) {
      setSession(r.state);
      setClock(toMin(scn.clock.start));
      setAlertInc(null);
    }
  }, [run, scenarioId]);

  // 시나리오 불러오기 + 저장된 진행 복원
  useEffect(() => {
    let alive = true;
    setScenario(null); setSession(null); setPlaying(false); setError(null);
    api.scenario(scenarioId).then((scn) => {
      if (!alive) return;
      setScenario(scn);
      const saved = store.get(key);
      if (saved) {
        try {
          const { session: s, clock: c } = JSON.parse(saved);
          if (s?.scenario_id === scn.id) { setSession(s); setClock(c); return; }
        } catch { /* 깨진 저장값은 버린다 */ }
      }
      start(scn);
    }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session) store.set(key, JSON.stringify({ session, clock }));
  }, [session, clock, key]);

  const withNow = (s) => ({ ...s, now: fmt(Math.max(clockRef.current, toMin(s.now))) });

  const advanceOne = useCallback(async () => {
    const s = sessionRef.current;
    const sig = scenario.signals[s.cursor];
    const before = Object.fromEntries(s.incidents.map((i) => [i.id, i.grade]));
    const r = await run(`AI가 신호 ${sig.id}를 읽는 중`, () =>
      api.session({ op: 'advance', scenario_id: scenario.id, state: s, until: sig.t, max: 1 }));
    if (!r) return;
    setSession(r.state);
    const up = r.state.incidents.find((i) => gradeRank(i.grade) >= 1 && gradeRank(i.grade) > gradeRank(before[i.id] ?? 'observe'));
    if (up) {
      setAlertInc(up.id);
      if (autoPause) setPlaying(false);
    }
  }, [run, scenario, autoPause]);

  // 시계: 재생 중이고 AI가 쉬고 있을 때만 흐른다
  useEffect(() => {
    if (!playing || busy || !scenario || !session) return undefined;
    const id = setInterval(() => {
      const s = sessionRef.current;
      const next = scenario.signals[s.cursor];
      const end = toMin(scenario.clock.end);
      const c = clockRef.current + (speed * TICK_MS) / 60000;
      if (next && c >= toMin(next.t)) {
        setClock(toMin(next.t));
        clearInterval(id);
        advanceOne();
      } else if (!next && c >= end) {
        setClock(end);
        setPlaying(false);
      } else setClock(c);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, busy, scenario, session, speed, advanceOne]);

  const memo = (body, from) => run('AI가 전화 메모를 읽는 중', async () => {
    const r = await api.session({ op: 'memo', scenario_id: scenario.id, state: withNow(sessionRef.current), body, from });
    setSession(r.state);
    return r;
  });
  const decide = (payload) => run('결정 기록 중', async () => {
    const r = await api.session({ op: 'decide', scenario_id: scenario.id, state: withNow(sessionRef.current), ...payload });
    setSession(r.state);
    setAlertInc((a) => (a === payload.incident_id ? null : a));
    return r;
  });
  const redraft = (incident_id) => run('AI가 초안을 다시 쓰는 중', async () => {
    const r = await api.session({ op: 'redraft', scenario_id: scenario.id, state: withNow(sessionRef.current), incident_id });
    setSession(r.state);
  });
  const handover = () => run('AI가 인계 보고서를 쓰는 중', async () => {
    const r = await api.session({ op: 'handover', scenario_id: scenario.id, state: withNow(sessionRef.current) });
    setSession(r.state);
    return r;
  });
  // 다음 신호 시각으로 시계를 넘긴다(빈 시간 건너뛰기). 처리 자체는 생략하지 않는다.
  const skip = () => {
    const s = sessionRef.current;
    const next = scenario && s && scenario.signals[s.cursor];
    if (next && !busyRef.current) { setClock(Math.max(clockRef.current, toMin(next.t) - 0.01)); setPlaying(true); }
  };
  const reset = () => { store.del(key); setPlaying(false); if (scenario) start(scenario); };
  const saveCode = (c) => { store.set('dm:code', c.trim()); setNeedCode(false); };

  return {
    scenario, session, clock, playing, setPlaying, speed, setSpeed, autoPause, setAutoPause,
    busy, error, setError, needCode, saveCode, alertInc, setAlertInc, memo, decide, redraft, handover, reset, skip,
    done: scenario && session && session.cursor >= scenario.signals.length,
  };
}
