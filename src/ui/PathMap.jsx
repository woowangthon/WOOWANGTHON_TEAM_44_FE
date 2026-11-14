// 결과 화면 첫머리: 오류 경로 지도(가로 = 단계 S1→S5, 줄 = A등급 오류).
// 빨간 점 = 처음 틀린 단계(origin), 속 빈 점 = 옮겨 적힌 단계(spread). 놓친 오류는 빨강, 찾은 오류는 초록.
// 장부 items의 origin·spread만 쓴다(API 변경 없음). 줄을 누르면 그 오류 카드로 가고 원자료 근거를 띄운다.
const stageOf = (uid) => String(uid).split('.')[0];
const num = (k) => Number(String(k).replace(/\D/g, '')) || 0;

export default function PathMap({ items, stages, perOf, onPick }) {
  const n = stages.length;
  if (!n || !items.length) return null;
  const col = Object.fromEntries(stages.map((s, i) => [s.key, i]));
  const x = (k) => `${((col[k] + 0.5) / n) * 100}%`;
  const rows = items
    .map((it) => {
      const p = perOf(it.id);
      const from = stageOf(p?.stopAt ?? it.origin);
      const to = [...new Set((it.spread ?? []).map(stageOf))].filter((k) => k in col && k !== from);
      return { it, found: !!p?.found, from, to, last: [from, ...to].sort((a, b) => num(b) - num(a))[0] };
    })
    .filter((r) => r.from in col)
    .sort((a, b) => num(a.from) - num(b.from) || Number(a.found) - Number(b.found));
  if (!rows.length) return null;
  const missed = rows.filter((r) => !r.found);
  const stop = missed.length ? missed.map((r) => r.from).sort((a, b) => num(a) - num(b))[0] : null;
  const stopIdx = stop ? col[stop] : -1;
  const band = stopIdx >= 0 ? <rect className="pm-band" x={`${(stopIdx / n) * 100}%`} y="0" width={`${100 / n}%`} height="100%" /> : null;
  const summary = `A등급 오류 ${rows.length}개의 경로. ${missed.length ? `놓친 ${missed.length}개 가운데 ${missed.filter((r) => r.from === stop).length}개가 ${stop}에서 시작했습니다.` : '모두 찾았습니다.'}`;

  return (
    <section className="path-map" aria-label="오류 경로 지도">
      <h2>오류가 번진 길</h2>
      <p className="small muted pm-lead">{summary} 줄을 누르면 그 오류 설명과 원자료 근거로 갑니다.</p>
      <div className="pm-grid" style={{ '--pm-n': n }}>
        <div className="pm-row pm-head" aria-hidden="true">
          <span className="pm-label" />
          <div className="pm-stages">
            {stages.map((s, i) => (
              <span key={s.key} className={i === stopIdx ? 'pm-stop' : ''}>
                <b>{s.key}</b><span className="pm-sname">{s.name}</span>
              </span>
            ))}
          </div>
        </div>
        <ol className="pm-rows">
          {rows.map(({ it, found, from, to, last }, idx) => (
            <li key={it.id} style={{ '--i': idx }}>
              <button type="button" className={`pm-row ${found ? 'pm-found' : 'pm-missed'}`} onClick={() => onPick(it.id)}
                aria-label={`${found ? '찾음' : '놓침'} ${it.pattern}: ${from}에서 처음 틀려 ${to.length ? `${to.join('·')}로 옮겨짐` : '그 단계에 남음'}. 설명으로 가기`}>
                <span className="pm-label"><span className={`pm-tag ${found ? '' : 'pm-tag-red'}`}>{found ? '찾음' : '놓침'}</span> {it.pattern}</span>
                <span className="pm-strip"><svg aria-hidden="true" focusable="false">
                  {band}
                  {stages.map((s) => <line key={s.key} className="pm-tick" x1={x(s.key)} x2={x(s.key)} y1="32%" y2="68%" />)}
                  {last !== from && <line className="pm-line" x1={x(from)} x2={x(last)} y1="50%" y2="50%" />}
                  {to.map((k) => <circle key={k} className="pm-dot-spread" cx={x(k)} cy="50%" r="5.5" />)}
                  <circle className="pm-dot-origin" cx={x(from)} cy="50%" r="6.5" />
                </svg></span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="small muted pm-legend">
        <svg width="14" height="14" aria-hidden="true"><circle className="pm-dot-origin pm-missed-c" cx="7" cy="7" r="5.5" /></svg> 처음 틀린 단계
        <svg width="14" height="14" aria-hidden="true"><circle className="pm-dot-spread pm-missed-c" cx="7" cy="7" r="4.5" /></svg> 옮겨 적힌 단계
        · 빨강 = 놓친 오류, 초록 = 찾은 오류 · A등급만(B·C는 아래 참고)
        {stop && <span className="pm-stop-note"><span className="pm-stop-chip">{stop}</span> 가장 먼저 멈췄어야 할 곳</span>}
      </p>
    </section>
  );
}
