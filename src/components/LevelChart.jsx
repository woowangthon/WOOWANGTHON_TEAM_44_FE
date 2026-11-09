// 상황판 수위 그래프: 시나리오 시각까지의 수위와 특보 기준선, 권고가 오른 시각과 당직자 결정 시각을 함께 그린다.
import { useState } from 'react';
import { toMin, fmt, GRADE_KO, ACTION_KO } from '../util.js';

const W = 440;
const H = 250;
const PAD = { l: 34, r: 74, t: 14, b: 26 };
const LEVEL_STYLE = {
  관심: '#7b8794', 주의: '#9a6700', 경보: '#c2410c', 경계: '#c2410c', 심각: '#b3261e', 계획홍수위: '#b3261e',
};
// 관측소 기준 수위 이름: 관심 < 주의(홍수주의보 기준) < 경계(홍수경보 기준) < 심각

// 보여 줄 관측소: 당직자가 고른 것 > 선택한 사건의 시설에 걸린 것 > 가장 최근 수위 알림이 온 것
function pickGauge(scenario, session, focusInc, chosen) {
  const withData = scenario.gauges.filter((g) => scenario.timeseries?.[g.id]?.length);
  if (chosen && withData.some((g) => g.id === chosen)) return withData.find((g) => g.id === chosen);
  const fac = focusInc && scenario.facilities.find((f) => f.id === focusInc.facility_id);
  if (fac?.gauge && withData.some((g) => g.id === fac.gauge)) return withData.find((g) => g.id === fac.gauge);
  const last = [...(session?.signals ?? [])].reverse().find((s) => s.data?.type === 'gauge' && withData.some((g) => g.id === s.data.gauge));
  return withData.find((g) => g.id === last?.data.gauge) ?? withData[0];
}

export default function LevelChart({ scenario, session, clock, focusInc }) {
  const [chosen, setChosen] = useState(null);
  const gauge = pickGauge(scenario, session, focusInc, chosen);
  if (!gauge) return null;
  const others = scenario.gauges.filter((g) => scenario.timeseries?.[g.id]?.length);
  const series = scenario.timeseries[gauge.id].map(([t, v]) => [toMin(t), v]);
  const t0 = toMin(scenario.clock.start);
  const t1 = toMin(scenario.clock.end);
  const levels = Object.entries(gauge.chart_levels ?? gauge.levels ?? {}).filter(([, v]) => typeof v === 'number');
  const vals = [...series.map(([, v]) => v), ...levels.map(([, v]) => v)];
  const lo = Math.floor((Math.min(...vals) - 0.3) * 2) / 2;
  const hi = Math.ceil((Math.max(...vals) + 0.2) * 2) / 2;
  const x = (t) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const shown = series.filter(([t]) => t <= clock + 0.001);
  // 지금 시각까지 선형 보간한 끝점
  const nextPt = series.find(([t]) => t > clock);
  const lastPt = shown.at(-1);
  let tip = lastPt;
  if (lastPt && nextPt && clock > lastPt[0]) {
    const k = (clock - lastPt[0]) / (nextPt[0] - lastPt[0]);
    tip = [clock, lastPt[1] + (nextPt[1] - lastPt[1]) * k];
  }
  const path = [...shown, ...(tip && tip !== lastPt ? [tip] : [])].map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // 이 관측소가 걸린 사건의 권고·결정
  const incs = (session?.incidents ?? []).filter((i) => {
    const fac = scenario.facilities.find((f) => f.id === i.facility_id);
    return fac && (fac.gauge === gauge.id || [...fac.place_ids, ...(fac.near ?? []).map((n) => n.place_id)].includes(gauge.place_id));
  });
  const marks = incs.flatMap((i) => [
    ...i.grade_history.map((g) => ({ t: toMin(g.at), kind: `g-${g.grade}`, label: GRADE_KO[g.grade].replace(' 요청', ''), no: i.no })),
    ...i.decisions.map((d) => ({ t: toMin(d.at), kind: `a-${d.action}`, label: `결정 ${ACTION_KO[d.action]}`, no: i.no, human: true })),
  ]).filter((m) => m.t <= clock + 0.001);

  const ticks = [];
  for (let t = Math.ceil(t0 / 30) * 30; t <= t1; t += 30) ticks.push(t);

  return (
    <figure className="chart">
      <figcaption>
        {others.length > 1 ? (
          <span className="g-tabs" role="tablist" aria-label="수위관측소">
            {others.map((g) => (
              <button key={g.id} role="tab" aria-selected={g.id === gauge.id} className={g.id === gauge.id ? 'on' : ''} onClick={() => setChosen(g.id)}>{g.name}</button>
            ))}
          </span>
        ) : <b>{gauge.name}</b>}
        <b>수위</b>
        {tip && <span className="now-level">지금 {tip[1].toFixed(2)}m</span>}
        <span className="sub src-line">{gauge.source ?? ''}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${gauge.name} 수위 그래프`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} className="grid-line" />
            <text x={x(t)} y={H - 10} textAnchor="middle" className="axis">{fmt(t)}</text>
          </g>
        ))}
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <text key={v} x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{v.toFixed(1)}</text>
        ))}
        {levels.map(([k, v]) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={LEVEL_STYLE[k] ?? '#7b8794'} strokeDasharray="5 4" strokeWidth="1.5" />
            <text x={W - PAD.r + 6} y={y(v) + 4} fill={LEVEL_STYLE[k] ?? '#7b8794'} className="lvl">{k} {v}m</text>
          </g>
        ))}
        {path && <path d={path} className="level-line" />}
        {tip && <circle cx={x(tip[0])} cy={y(tip[1])} r="5" className="level-tip" />}
        {marks.map((m, i) => {
          // AI·규칙표 권고는 위쪽, 당직자 결정은 아래쪽에 이름을 단다
          const row = marks.slice(0, i).filter((o) => o.human === m.human && Math.abs(o.t - m.t) < 25).length;
          const ty = m.human ? H - PAD.b - 8 - row * 15 : PAD.t + 12 + row * 15;
          const right = x(m.t) > W - PAD.r - 120;
          return (
            <g key={i} className={`mk ${m.kind}`}>
              <line x1={x(m.t)} x2={x(m.t)} y1={PAD.t} y2={H - PAD.b} />
              <text x={x(m.t) + (right ? -4 : 4)} y={ty} textAnchor={right ? 'end' : 'start'} className="mk-label">{m.label}</text>
            </g>
          );
        })}
        {clock >= t0 && clock <= t1 && <line x1={x(clock)} x2={x(clock)} y1={PAD.t} y2={H - PAD.b} className="now-line" />}
      </svg>
    </figure>
  );
}
