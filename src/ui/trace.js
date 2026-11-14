// F2 근거 대조 추적: 풀이 동안 「어느 원자료 문단이 언제 화면에 보였나」와 빨간 줄·결재 순서를 조용히 모은다.
// 이벤트 = [t(풀이 시작부터 ms), type, ref, ms?]. 벽시계 시각은 남기지 않는다. 결과 피드백에만 쓰고 점수에는 넣지 않는다.
// type: open·close(서랍), tab(문서), view(문단이 1.5초 이상 보임, ms=보인 시간), tap(문단 누르기), stage(앞 단계 펼치기), mark·unmark, decide
import { createContext, useContext } from 'react';

export const MAX_EVENTS = 2000;
export const VIEW_MIN_MS = 1500;
export const TraceContext = createContext(null);
export const useTraceCtx = () => useContext(TraceContext);

/** 이벤트 모음. getT0 = 풀이 시작 시각을 돌려주는 함수, initial = draft에 저장해 둔 { events, dropped, engaged } */
export function makeTrace(getT0, initial) {
  const st = { events: [...(initial?.events ?? [])], dropped: initial?.dropped ?? 0, engaged: !!initial?.engaged, listeners: new Set() };
  const now = () => Math.max(0, Math.round(Date.now() - getT0()));
  const notify = () => st.listeners.forEach((f) => f());
  return {
    push(type, ref = '', ms) {
      const t = type === 'view' && ms ? Math.max(0, now() - ms) : now();
      const last = st.events.at(-1);
      // 같은 문단이 이어서 보이면 하나로 합친다
      if (type === 'view' && last && last[1] === 'view' && last[2] === ref) { last[3] = (last[3] ?? 0) + (ms ?? 0); notify(); return; }
      st.events.push(ms != null ? [t, type, ref, Math.round(ms)] : [t, type, ref]);
      if (st.events.length > MAX_EVENTS) {
        const i = st.events.findIndex((e) => e[1] === 'view');
        st.events.splice(i >= 0 ? i : 0, 1);
        st.dropped++;
      }
      notify();
    },
    engage() { if (!st.engaged) { st.engaged = true; notify(); } },
    get engaged() { return st.engaged; },
    snapshot: () => ({ v: 1, events: st.events.map((e) => [...e]), dropped: st.dropped, engaged: st.engaged }),
    toPayload: () => ({ v: 1, dropped: st.dropped, events: [...st.events].sort((a, b) => a[0] - b[0]).map((e) => [...e]) }),
    subscribe(f) { st.listeners.add(f); return () => st.listeners.delete(f); },
  };
}
