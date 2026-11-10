// 세션 훅. 세 가지 모드를 같은 모양으로 다룬다.
//  live     실제 근무: 시계는 지금 시각, 신호는 당직자가 적은 전화 메모로 들어온다
//  practice 연습: 지난 기록으로 재구성한 신호를 시각대로 흘리고, 연습할 순간에 멈춘다(배속 조작 없음)
//  record   저장된 연습 기록: 실제 재생을 끝까지 마친 세션을 AI 호출 없이 읽기 전용으로 연다
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, store, NeedCode, CapReached, clientId, inboxQuery } from './api.js';
import { toMin, fmt } from './util.js';

const TICK_MS = 250;
const FLOW = 240; // 연습 모드에서 빈 시간이 흐르는 빠르기(시나리오 4분 = 1초). 신호마다 AI 처리는 그대로 기다린다.
export const LIVE_ID = 'cheongju-live';

const kstNow = () => { const d = new Date(Date.now() + 9 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60; };

/** 방금 처리한 신호가 어디로 갔는지(새 사건, 기존 사건에 묶음, 배경) 세션 기록에서 찾는다 */
function arrivalOf(state, sig) {
  const e = state.log.find((x) => x.type === 'signal' && x.signal_id === sig.id);
  const s = state.signals.find((x) => x.id === sig.id);
  const inc = state.incidents.find((i) => i.id === e?.incident_id);
  return { sig: s ?? sig, inc: inc ?? null, isNew: !!inc && inc.signal_ids[0] === sig.id, by: e?.link?.by ?? null, reason: e?.link?.reason ?? null, key: `${sig.id}-${Date.now()}` };
}

export function useSession(mode) {
  const kind = mode.kind;
  const scenarioId = kind === 'live' ? LIVE_ID : mode.id;
  // 실제 근무 기록은 날마다 새로 시작한다(인계 보고서는 하루 단위)
  const key = kind === 'live' ? `dm:live:${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)}` : kind === 'practice' ? `dm:p:${scenarioId}` : null;

  const [scenario, setScenario] = useState(null);
  const [session, setSession] = useState(null);
  const [clock, setClock] = useState(kind === 'live' ? kstNow() : 0);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [needCode, setNeedCode] = useState(false);
  const [capped, setCapped] = useState(false);
  const [pending, setPending] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [meta, setMeta] = useState(null);
  const busyRef = useRef(false);
  const clockRef = useRef(clock);
  const sessionRef = useRef(null);
  const stepHook = useRef(null); // 연습 진행기가 신호 처리 뒤 멈출지 정한다
  // 당직실 인계함: 실제 근무는 기관 인계함, 연습은 이 브라우저의 연습 인계함
  const [inbox, setInbox] = useState(null);
  const loadInbox = useCallback(() => api.inbox(inboxQuery(kind !== 'live')).then((x) => { setInbox(x); return x; }).catch(() => null), [kind]);
  useEffect(() => { if (kind === 'live') loadInbox(); }, [kind, loadInbox]);
  useEffect(() => { clockRef.current = clock; }, [clock]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const run = useCallback(async (label, fn) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(label); setError(null);
    try {
      return await fn();
    } catch (e) {
      if (e instanceof NeedCode) setNeedCode(true);
      else if (e instanceof CapReached) setCapped(true);
      else setError(e.message);
      setRunning(false);
      return null;
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, []);

  const start = useCallback(async (scn) => {
    const r = await run('근무 화면 준비', () => api.session({ op: 'start', scenario_id: scn.id }));
    if (r) { setSession(r.state); if (kind !== 'live') setClock(toMin(scn.clock.start)); }
  }, [run, kind]);

  // 불러오기: 시나리오 + 저장된 진행(또는 저장된 연습 기록)
  useEffect(() => {
    let alive = true;
    setScenario(null); setSession(null); setRunning(false); setError(null); setArrival(null); setPending(null); setMeta(null);
    api.scenario(scenarioId).then(async (scn) => {
      if (!alive) return;
      setScenario(scn);
      if (kind === 'record') {
        const r = await fetch(`/records/${scn.id}.json`);
        if (!r.ok) throw new Error('저장된 연습 기록이 없습니다');
        const rec = await r.json();
        if (!alive) return;
        setMeta(rec.meta); setSession(rec.session); setClock(toMin(rec.session.now));
        return;
      }
      if (kind !== 'live') setClock(toMin(scn.clock.start));
      const saved = store.json(key);
      if (saved?.session?.scenario_id === scn.id) {
        setSession(saved.session);
        if (kind !== 'live') setClock(saved.clock);
        return;
      }
      start(scn);
    }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [kind, scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (session && key) store.set(key, JSON.stringify({ session, clock })); }, [session, clock, key]);

  // 실제 근무: 시계는 지금 시각
  useEffect(() => {
    if (kind !== 'live') return undefined;
    const id = setInterval(() => setClock(kstNow()), 15000);
    return () => clearInterval(id);
  }, [kind]);

  const withNow = (s) => ({ ...s, now: kind === 'live' ? fmt(kstNow()) : fmt(Math.max(clockRef.current, toMin(s.now))) });

  const advanceOne = useCallback(async () => {
    const s = sessionRef.current;
    const sig = scenario.signals[s.cursor];
    if (busyRef.current || !sig) return;
    setPending(sig);
    const r = await run('AI가 읽는 중', () => api.session({ op: 'advance', scenario_id: scenario.id, state: s, until: sig.t, max: 1 }));
    setPending(null);
    if (!r) return;
    setSession(r.state);
    setArrival(arrivalOf(r.state, sig));
    if (stepHook.current?.(s, r.state) === 'pause') setRunning(false);
  }, [run, scenario]);

  // 연습 시계: 흐르는 중이고 AI가 쉬고 있을 때만
  useEffect(() => {
    if (kind !== 'practice' || !running || busy || !scenario || !session) return undefined;
    const id = setInterval(() => {
      const s = sessionRef.current;
      const next = scenario.signals[s.cursor];
      const end = toMin(scenario.clock.end);
      const c = clockRef.current + (FLOW * TICK_MS) / 60000;
      if (next && c >= toMin(next.t)) { setClock(toMin(next.t)); clearInterval(id); advanceOne(); }
      else if (!next && c >= end) { setClock(end); setRunning(false); stepHook.current?.(s, s, 'end'); }
      else setClock(c);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [kind, running, busy, scenario, session, advanceOne]);

  const memo = async (body, from) => {
    if (busyRef.current || kind === 'record') return null;
    setPending({ id: '직접 입력', t: fmt(kind === 'live' ? kstNow() : clockRef.current), channel: 'phone_memo', from: from?.trim() || '당직자 입력', body: body.trim(), live: true });
    const before = sessionRef.current;
    const out = await run('AI가 전화 메모를 읽는 중', async () => {
      const r = await api.session({ op: 'memo', scenario_id: scenario.id, state: withNow(sessionRef.current), body, from });
      setSession(r.state);
      setArrival(arrivalOf(r.state, { id: r.signal_id }));
      return r;
    });
    setPending(null);
    if (out) stepHook.current?.(before, out.state, 'memo');
    return out;
  };
  const decide = (payload) => run('결정 기록 중', async () => {
    const before = sessionRef.current;
    const r = await api.session({ op: 'decide', scenario_id: scenario.id, state: withNow(sessionRef.current), ...payload });
    setSession(r.state);
    stepHook.current?.(before, r.state, 'decide');
    return r;
  });
  const contact = (payload) => run('연락 결과 기록 중', async () => {
    const r = await api.session({ op: 'contact', scenario_id: scenario.id, state: withNow(sessionRef.current), ...payload });
    setSession(r.state);
    return r;
  });
  const redraft = (incident_id) => run('AI가 전달 사항을 다시 정리하는 중', async () => {
    const r = await api.session({ op: 'redraft', scenario_id: scenario.id, state: withNow(sessionRef.current), incident_id });
    setSession(r.state);
  });
  // 이 브라우저에서 넘긴 인계는 이 브라우저의 실제 근무 화면에 «넘겨받은 것»으로 다시 띄우지 않는다
  const sentKey = 'dm:sent';
  const sentIds = () => (store.json(sentKey) ?? []);
  const received = () => {
    const h = inbox?.latest;
    if (kind !== 'live' || !h || sentIds().includes(h.id)) return null;
    return { from: h.from, period: h.period, items: h.items.map((i) => ({ title: `#${i.incident_no} ${i.title}`, text: i.text, taken: h.taken.includes(i.key) })) };
  };
  const take = async (id, item) => {
    const r = await api.markHandoff({ ...inboxQuery(kind !== 'live'), op: 'take', id, item }).catch((e) => { setError(e.message); return null; });
    if (r) setInbox((x) => ({ ...x, latest: r.handoff }));
    return r;
  };
  const receive = async (id) => {
    const r = await api.markHandoff({ ...inboxQuery(kind !== 'live'), op: 'receive', id }).catch((e) => { setError(e.message); return null; });
    if (r) setInbox((x) => ({ ...x, latest: r.handoff }));
    return r;
  };
  const handoff = (payload) => run('인계함에 넘기는 중', async () => {
    const r = await api.session({ op: 'handoff', scenario_id: scenario.id, state: withNow(sessionRef.current), client: clientId(), ...payload });
    if (kind === 'live') store.set(sentKey, JSON.stringify([...sentIds(), r.handoff.id].slice(-20)));
    return r;
  });
  const handover = () => (kind === 'record'
    ? run('인계 보고서 준비', async () => {
      const r = await api.session({ op: 'handover', scenario_id: scenario.id, state: sessionRef.current });
      return r;
    })
    : run('AI가 인계 보고서를 쓰는 중', async () => {
      const r = await api.session({ op: 'handover', scenario_id: scenario.id, state: withNow(sessionRef.current), received: received() ?? undefined });
      setSession(r.state);
      stepHook.current?.(sessionRef.current, r.state, 'handover');
      return r;
    }));
  const reset = () => { if (key) store.del(key); setRunning(false); setArrival(null); if (scenario) start(scenario); };

  return {
    kind, scenario, session, clock, running, setRunning, busy, error, setError, needCode, capped, pending, arrival, setArrival, meta,
    memo, decide, contact, redraft, handover, reset, stepHook,
    inbox, loadInbox, take, receive, handoff, inboxHidden: !!(inbox?.latest && sentIds().includes(inbox.latest.id)),
    ended: kind !== 'live' && !!(scenario && session && session.cursor >= scenario.signals.length && clock >= toMin(scenario.clock.end) - 0.01),
    readOnly: kind === 'record',
  };
}
