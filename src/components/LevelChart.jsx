// 수위 그래프: 지금 시각까지의 실측 수위와 관측소 기준선, 권고가 오른 시각과 당직자 결정 시각.
import { useState } from 'react';
import { toMin, fmt, ACTION_KO } from '../util.js';

const W = 400;
const H = 230;
const PAD = { l: 30, r: 70, t: 14, b: 26 };
const LEVEL_STYLE = { 관심: '#8a96a0', 주의: '#b8620b', 경계: '#b42318', 심각: '#b42318', 계획홍수위: '#b42318' };

export function gaugesWithData(scenario) {
  return scenario.gauges.filter((g) => scenario.timeseries?.[g.id]?.length);
}

function pickGauge(scenario, session, inc, chosen) {
  const withData = gaugesWithData(scenario);
  if (chosen && withData.some((g) => g.id === chosen)) return withData.find((g) => g.id === chosen);
  const fac = inc && scenario.facilities.find((f) => f.id === inc.facility_id);
  if (fac?.gauge && withData.some((g) => g.id === fac.gauge)) return withData.find((g) => g.id === fac.gauge);
  const last = [...(session?.signals ?? [])].reverse().find((s) => s.data?.type === 'gauge' && withData.some((g) => g.id === s.data.gauge));
  return withData.find((g) => g.id === last?.data.gauge) ?? withData[0];
}

export default function LevelChart({ scenario, session, clock, inc }) {
  const [chosen, setChosen] = useState(null);
  const gauge = pickGauge(scenario, session, inc, chosen);
  if (!gauge) return <p className="muted">이 상황에는 수위 자료가 없습니다.</p>;
  const fac = inc && scenario.facilities.find((f) => f.id === inc.facility_id);
  const unlinked = inc && !chosen && !fac?.gauge;
  const others = gaugesWithData(scenario);
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
  const nextPt = series.find(([t]) => t > clock);
  const lastPt = shown.at(-1);
  let tip = lastPt;
  if (lastPt && nextPt && clock > lastPt[0]) {
    const k = (clock - lastPt[0]) / (nextPt[0] - lastPt[0]);
    tip = [clock, lastPt[1] + (nextPt[1] - lastPt[1]) * k];
  }
  const path = [...shown, ...(tip && tip !== lastPt ? [tip] : [])].map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const incs = (session?.incidents ?? []).filter((i) => {
    const f = scenario.facilities.find((ff) => ff.id === i.facility_id);
    return f && (f.gauge === gauge.id || f.place_ids.includes(gauge.place_id));
  });
  const marks = incs.flatMap((i) => i.decisions.map((d) => ({ t: toMin(d.at), kind: `a-${d.action}`, label: `${d.at} ${ACTION_KO[d.action]}` })))
    .filter((m) => m.t <= clock + 0.001);
  const ticks = [];
  for (let t = Math.ceil(t0 / 60) * 60; t <= t1; t += 60) ticks.push(t);

  return (
    <figure className="chart">
      <figcaption>
        {others.length > 1 ? (
          <span className="g-tabs" role="tablist" aria-label="수위관측소">
            {others.map((g) => <button key={g.id} role="tab" aria-selected={g.id === gauge.id} className={g.id === gauge.id ? 'on' : ''} onClick={() => setChosen(g.id)}>{g.name}</button>)}
          </span>
        ) : <b>{gauge.name}</b>}
        {tip && <span className="now-level">지금 {tip[1].toFixed(2)}m</span>}
      </figcaption>
      {unlinked && <p className="ref-note">이 사건과 연결된 관측소가 없어 시 전체 참고로 보여 줍니다.</p>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${gauge.name} 수위 그래프`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} className="grid-line" />
            <text x={x(t)} y={H - 8} textAnchor="middle" className="axis">{fmt(t)}</text>
          </g>
        ))}
        {levels.map(([k, v]) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={LEVEL_STYLE[k] ?? '#8a96a0'} strokeDasharray={k === '주의' ? '' : '4 4'} strokeWidth={k === '주의' ? 1.5 : 1} />
            <text x={W - PAD.r + 6} y={y(v) + 4} fill={LEVEL_STYLE[k] ?? '#8a96a0'} className="lvl">{k} {v}m</text>
          </g>
        ))}
        {marks.map((m, i) => {
          const row = marks.slice(0, i).filter((o) => Math.abs(o.t - m.t) < 45).length;
          const right = x(m.t) > W - PAD.r - 90;
          return (
            <g key={i} className={`mk ${m.kind}`}>
              <line x1={x(m.t)} x2={x(m.t)} y1={PAD.t} y2={H - PAD.b} />
              <text x={x(m.t) + (right ? -4 : 4)} y={H - PAD.b - 6 - row * 14} textAnchor={right ? 'end' : 'start'} className="mk-label">{m.label}</text>
            </g>
          );
        })}
        {path && <path d={path} className="level-line" />}
        {tip && <circle cx={x(tip[0])} cy={y(tip[1])} r="5" className="level-tip" />}
      </svg>
      <p className="srcl">{gauge.source ?? ''}</p>
    </figure>
  );
}
