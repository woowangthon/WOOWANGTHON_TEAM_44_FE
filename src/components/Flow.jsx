// 이 사건의 흐름: 신호, 권고, 재촉, 결정을 시각 순으로 한 줄씩. 보류한 뒤 무엇이 바뀌었는지가 보이게 한다.
import { ACTION_KO, GRADE_KO, CHANNEL_KO } from '../util.js';

const basis = (s) => (s.live ? '직접 입력' : s.record?.basis === 'added' ? '가상 추가' : /실측/.test(s.record?.source ?? '') ? '실측' : null);

export function flowItems(session, inc) {
  const items = [];
  inc.signal_ids.forEach((sid) => {
    const s = session.signals.find((x) => x.id === sid);
    if (s) items.push({ t: s.t, o: 0, kind: 'sig', text: s.norm?.one_line ?? s.body, sub: [CHANNEL_KO[s.channel], basis(s)].filter(Boolean).join(', ') });
  });
  inc.grade_history.forEach((g) => items.push({ t: g.at, o: 1, kind: `grade g-${g.grade}`, text: `권고 「${GRADE_KO[g.grade]}」`, sub: '규칙표' }));
  inc.nudges.forEach((n) => items.push({ t: n.at, o: 2, kind: 'nudge', text: n.text, sub: '규칙표 재촉' }));
  inc.decisions.forEach((d) => items.push({ t: d.at, o: 3, kind: `dec a-${d.action}`, text: `당직자 ${ACTION_KO[d.action]}: ${d.reason}`, sub: null }));
  return items.sort((a, b) => a.t.localeCompare(b.t) || a.o - b.o);
}

export default function Flow({ session, inc }) {
  return (
    <ol className="flow">
      {flowItems(session, inc).map((x, i) => (
        <li key={i} className={x.kind}>
          <time>{x.t}</time><i aria-hidden="true" />
          <span>{x.text}{x.sub && <small>{x.sub}</small>}</span>
        </li>
      ))}
    </ol>
  );
}
