// 연습 모드 진행기: 신호가 흐르다가 연습할 순간에 멈추고, 당직자가 직접 결정·입력하면 다시 흐른다.
// 멈추는 순간은 사건 번호가 아니라 장소와 권고로 찾는다(재생마다 사건 번호가 달라도 같은 순간에 멈춘다).
import { useCallback, useEffect, useRef, useState } from 'react';
import { store } from './api.js';
import { ACTION_KO, incState, needList, reraised, toMin } from './util.js';

const has = (p) => (inc) => inc.keys?.includes(p);
// 받침이 있으면 「으로」, 없으면(또는 ㄹ 받침이면) 「로」
const ro = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; const j = c >= 0 && c < 11172 ? c % 28 : 0; return j && j !== 8 ? '으로' : '로'; };
const need = (inc) => incState(inc) === 'need';

const SCRIPTS = {
  'cheongju-20260709': {
    minutes: 6,
    intro: {
      title: '2026년 7월 9일 새벽 5시, 청주시청 당직실',
      body: '그날 보도와 실측 수위로 재구성한 신호 26건이 시각대로 들어옵니다. 연습할 순간이 오면 멈춥니다. 실제 전화나 문자는 보내지 않습니다.',
    },
    steps: [
      { id: 'mipyeong', match: (i) => has('P2')(i) && i.grade === 'control_review' && need(i), expect: 'decide',
        text: '미평천 사건의 권고가 「통제 검토 요청」으로 올랐습니다. 근거를 보고 결정해 보세요.' },
      { id: 'musim-hold', match: (i) => has('P1')(i) && i.grade === 'control_review' && need(i), expect: 'decide', suggest: 'hold',
        text: '홍수주의보 통보가 왔지만 하상도로 침수 신고는 아직 없습니다. 이번에는 보류하고 사유를 남겨 보세요. 상황이 바뀌면 다시 알려 드립니다.' },
      { id: 'gadeok', match: (i) => has('P4')(i) && need(i), expect: 'decide', until: '07:00',
        text: '요양원 뒤 축대가 무너져 12명이 대피 중입니다. 전달 사항을 보고 연락한 뒤, 연락 결과를 남겨 보세요.' },
      { id: 'musim-again', match: (i) => has('P1')(i) && reraised(i), expect: 'decide', until: '07:40', view: 'flow',
        text: '보류한 무심천 사건이 다시 올라왔습니다. 흐름을 보고 다시 결정해 보세요.' },
      { id: 'memo', immediate: true, expect: 'memo',
        text: '전화가 왔습니다. 받은 내용을 직접 적어 보세요.',
        memo: { from: '모충동 주민', body: '골목 하수구에서 물이 거꾸로 올라와 도로에 발목까지 찼다고 함. 혼자 사는 어르신 집이 있어 걱정된다고 함.' } },
      { id: 'munam', match: (i) => has('P10')(i) && need(i), expect: 'decide', until: '08:10',
        text: '하부도로에 물이 차 차가 지나기 어렵다는 경찰 공조입니다. 지도와 기준을 보고 결정해 보세요.' },
      { id: 'many', when: (st) => needList(st.incidents).length >= 3, expect: 'decide-any', view: 'overview',
        text: '결정할 사건이 여러 곳에서 쌓여 화면이 상황판으로 바뀌었습니다. 하나를 골라 결정해 보세요.' },
    ],
  },
  'cheongju-winter': {
    minutes: 5,
    intro: {
      title: '한파주의보가 내려진 겨울 새벽, 청주시청 당직실',
      body: '상수도, 가로등, 신호등, 빙판길, 정전처럼 당직실에 흔히 들어오는 신고 14건이 시각대로 들어옵니다. 가상 신호이고, 연습할 순간이 오면 멈춥니다. 실제 전화나 문자는 보내지 않습니다.',
    },
    steps: [
      { id: 'yongam', match: (i) => has('P26')(i) && need(i), expect: 'decide', suggest: 'relay',
        text: '상수도관 누수 신고입니다. 처리할 부서와 조항을 보고 전달한 뒤 연락 결과를 남겨 보세요.' },
      { id: 'gagyeong', match: (i) => has('P5')(i) && need(i), expect: 'decide', until: '02:30',
        text: '신호등이 고장 나 경찰이 수신호 중입니다. 누구에게 전달할지 보고 결정해 보세요.' },
      { id: 'yullyang', match: (i) => has('P31')(i) && need(i), expect: 'decide', until: '03:30',
        text: '빌라 주차장 차량 화재로 주민 일부가 대피했습니다. 근거를 보고 결정해 보세요.' },
      { id: 'memo', immediate: true, expect: 'memo',
        text: '전화가 왔습니다. 받은 내용을 직접 적어 보세요.',
        memo: { from: '내덕동 주민', body: '내덕동 버스정류장 앞 맨홀 뚜껑이 열려 있어 차가 지날 때마다 덜컹거린다고 함. 밤이라 잘 안 보여 위험하다고 함.' } },
      { id: 'myeongam', match: (i) => has('P24')(i) && need(i), expect: 'decide', until: '04:30',
        text: '고갯길이 빙판이라 차들이 멈춰 서 있습니다. 조항을 보고 결정해 보세요.' },
      { id: 'bunpyeong', match: (i) => has('P29')(i) && need(i), expect: 'decide', until: '06:00',
        text: '정전으로 엘리베이터가 멈췄는데 갇힌 사람이 있는지 모릅니다. 어디에 알릴지 정해 보세요.' },
    ],
  },
};

// 대본이 없는 시나리오(오송 등): 권고가 오를 때마다 멈춘다
const GENERIC = { minutes: 4, generic: true, steps: [] };

export function scriptFor(scenario) {
  const s = SCRIPTS[scenario.id] ?? GENERIC;
  return { ...s, intro: s.intro ?? { title: scenario.title, body: `${scenario.intro ?? scenario.disclaimer ?? ''} 권고가 오르면 멈춥니다. 실제 전화나 문자는 보내지 않습니다.` } };
}

/**
 * 연습 진행 상태: phase = intro | flowing | step | end | finale
 * coach = 지금 보여 줄 안내({ text, step, incId })
 */
export function usePractice(r, { onFocus, onView }) {
  const enabled = r.kind === 'practice' && !!r.scenario;
  const id = r.scenario?.id;
  const skey = `dm:p:${id}:step`;
  const script = enabled ? scriptFor(r.scenario) : null;
  const [prog, setProg] = useState({ idx: 0, phase: 'intro', active: null });
  const progRef = useRef(prog);
  useEffect(() => { progRef.current = prog; }, [prog]);
  useEffect(() => {
    if (!enabled) return;
    const saved = store.json(skey);
    setProg(saved ?? { idx: 0, phase: 'intro', active: null });
  }, [enabled, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) store.set(skey, JSON.stringify(prog)); }, [enabled, prog, skey]);

  const activate = useCallback((idx, step, incId) => {
    setProg({ idx, phase: 'step', active: { id: step.id, incId: incId ?? null } });
    if (incId) onFocus?.(incId);
    if (step.view) onView?.(step.view, incId);
  }, [onFocus, onView]);

  // 신호 처리·결정·입력 뒤에 불린다. 'pause'를 돌려주면 흐름이 멈춘다.
  const hook = useCallback((before, after, evt) => {
    const p = progRef.current;
    if (!script) return null;
    if (evt === 'end') { setProg({ ...p, phase: 'end', active: null }); onView?.('night'); return 'pause'; }
    if (evt === 'handover' && p.phase === 'end') { setProg({ ...p, phase: 'finale' }); return null; }

    // 진행 중인 단계가 끝났는가
    if (p.phase === 'step' && p.active) {
      const step = p.active.id === 'generic' ? { expect: 'decide' } : script.steps.find((s) => s.id === p.active.id);
      const doneDecide = evt === 'decide' && (step?.expect === 'decide-any' || !p.active.incId
        || after.incidents.find((i) => i.id === p.active.incId)?.decisions.length > (before.incidents.find((i) => i.id === p.active.incId)?.decisions.length ?? 0));
      const done = (step?.expect?.startsWith('decide') && doneDecide) || (step?.expect === 'memo' && evt === 'memo');
      if (done) {
        const next = script.steps[p.idx + 1];
        if (next?.immediate) { activate(p.idx + 1, next, null); return null; }
        setProg({ idx: p.idx + 1, phase: 'flowing', active: null });
        onView?.('auto');
        setTimeout(() => r.setRunning(true), 900);
      }
      return null;
    }
    if (evt) return null; // 흐르는 중에 당직자가 스스로 결정한 경우는 그대로 둔다

    // 신호 처리 뒤: 지금 단계의 멈출 순간인가
    if (script.generic) {
      const rose = after.incidents.find((i) => need(i) && !before.incidents.some((b) => b.id === i.id && need(b)));
      if (rose) { setProg({ ...p, phase: 'step', active: { id: 'generic', incId: rose.id } }); onFocus?.(rose.id); return 'pause'; }
      return null;
    }
    let idx = p.idx;
    const lastT = after.signals.at(-1)?.t ?? after.now;
    while (idx < script.steps.length) {
      const step = script.steps[idx];
      if (step.until && toMin(lastT) > toMin(step.until)) { idx++; continue; } // 그 순간이 오지 않았으면 건너뛴다
      if (step.immediate) { idx++; continue; }
      const inc = step.match ? after.incidents.find((i) => step.match(i, after)) : null;
      if (inc || (step.when && step.when(after))) { activate(idx, step, inc?.id ?? needList(after.incidents)[0]?.id); return 'pause'; }
      break;
    }
    if (idx !== p.idx) setProg({ ...p, idx });
    return null;
  }, [script, activate, onFocus, onView, r]);

  useEffect(() => { if (enabled) r.stepHook.current = hook; return () => { r.stepHook.current = null; }; }, [enabled, hook, r.stepHook]);

  const begin = () => { setProg({ idx: 0, phase: 'flowing', active: null }); r.setRunning(true); };
  const restart = () => { store.del(skey); setProg({ idx: 0, phase: 'intro', active: null }); r.reset(); };
  // 다시 열었을 때 흐르던 중이었으면 이어서 흐른다
  useEffect(() => {
    if (enabled && r.session && prog.phase === 'flowing' && !r.running && !r.busy && !r.ended) r.setRunning(true);
  }, [enabled, !!r.session]); // eslint-disable-line react-hooks/exhaustive-deps

  let coach = null;
  if (enabled) {
    if (prog.phase === 'step' && prog.active) {
      const gi = r.session?.incidents.find((i) => i.id === prog.active.incId);
      const step = prog.active.id === 'generic'
        ? { text: `${gi ? `${gi.title} 사건의 ` : ''}권고가 「${ACTION_KO[gi?.grade] ?? '보고'}」${ro(ACTION_KO[gi?.grade] ?? '보고')} 올랐습니다. 근거를 보고 결정해 보세요.`, expect: 'decide' }
        : script.steps.find((s) => s.id === prog.active.id);
      coach = { ...step, incId: prog.active.incId };
    } else if (prog.phase === 'end') coach = { text: '새벽 근무가 끝났습니다. 밤 전체 흐름을 보고 인계 보고서를 만든 뒤 다음 근무자에게 넘겨 보세요.', expect: 'handover' };
  }
  return { enabled, script, phase: prog.phase, coach, begin, restart };
}
