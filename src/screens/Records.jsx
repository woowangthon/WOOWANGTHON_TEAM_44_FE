// 내 기록: 이 브라우저에만 남는 결재 기록과 오류 유형별로 놓친 비율
import { useEffect, useState } from 'react';
import { api, myRecords } from '../api.js';

const FOCUSABLE = ['숫자·단위', '원자료에 없음', '방향·주체가 바뀜', '근거보다 큰 결론'];

export function summarize(records) {
  const types = {};
  let found = 0, missed = 0, fa = 0, found2 = 0, ok = 0;
  for (const r of records) {
    found += r.found ?? 0; missed += r.missed ?? 0; fa += r.falseAlarms ?? 0; found2 += r.found2 ?? 0;
    if (r.decisionOk) ok++;
    for (const [t, x] of Object.entries(r.byType ?? {})) {
      types[t] ??= { planted: 0, found: 0 };
      types[t].planted += x.planted; types[t].found += x.found;
    }
  }
  const weak = Object.entries(types).filter(([, x]) => x.planted >= 1).sort((a, b) => a[1].found / a[1].planted - b[1].found / b[1].planted)[0];
  return { n: records.length, found, missed, fa, found2, ok, types, weak: weak && weak[1].found < weak[1].planted ? weak[0] : null };
}

export default function Records() {
  const records = myRecords.all();
  const s = summarize(records);
  const [all, setAll] = useState(null);
  useEffect(() => { api.stats().then(setAll).catch(() => setAll(null)); }, []);
  return (
    <main className="records">
      <article className="sheet">
        <p className="doc-no">내 기록 · 이 브라우저에만 남습니다</p>
        <h1 className="doc-title">내 결재 기록</h1>
        {!records.length ? (
          <p>아직 결재한 문서가 없습니다. <a href="#/">결재함</a>에서 하나 골라 보세요.</p>
        ) : (
          <>
            <table className="eval-table">
              <tbody>
                <tr><th>결재한 문서</th><td><b className="big">{s.n}</b>건 · 판정이 맞은 문서 {s.ok}건</td></tr>
                <tr><th>찾은 틀린 문장</th><td><b className="big">{s.found}</b>곳{s.found2 ? ` (그 가운데 수정본에서 찾은 곳 ${s.found2})` : ''}</td></tr>
                <tr className={s.missed ? 'row-bad' : ''}><th>놓친 틀린 문장</th><td><b className="big">{s.missed}</b>곳</td></tr>
                <tr className={s.fa ? 'row-warn' : ''}><th>멀쩡한데 짚음</th><td><b className="big">{s.fa}</b>곳</td></tr>
              </tbody>
            </table>
            {Object.keys(s.types).length > 0 && (
              <section>
                <h2>오류 유형별</h2>
                <ul className="type-bars">
                  {Object.entries(s.types).map(([t, x]) => (
                    <li key={t}>
                      <span className="tb-name">{t}</span>
                      <span className="tb-bar" aria-hidden="true"><span style={{ width: `${(x.found / x.planted) * 100}%` }} /></span>
                      <span className="tb-num">{x.found}/{x.planted}</span>
                    </li>
                  ))}
                </ul>
                {s.weak && <p className="tendency">가장 많이 놓친 유형은 <b>{s.weak}</b>입니다. 다음 문서에서는 이 유형을 먼저 의심해 보세요.</p>}
              </section>
            )}
            <section>
              <h2>약점 맞춤 보고서</h2>
              <p className="muted small">고른 유형 위주로 오류를 심은 새 보고서를 AI 신입에게 받습니다.</p>
              <div className="focus-btns">
                {FOCUSABLE.map((t) => (
                  <a key={t} className={`btn ${s.weak === t ? 'btn-primary' : ''}`} href={`#/new?focus=${encodeURIComponent(t)}`}>{t}{s.weak === t ? ' (가장 많이 놓침)' : ''}</a>
                ))}
              </div>
            </section>
            <h2>문서별</h2>
            <ul className="rec-list">
              {records.map((r) => (
                <li key={r.at}>
                  <span>{r.title}{r.live ? ' (새 보고서)' : ''}</span>
                  <span className="muted small">
                    찾음 {r.found} · 놓침 {r.missed} · 잘못 짚음 {r.falseAlarms} · {r.rounds === 2 ? '2차까지 · ' : ''}{r.decision} {r.decisionOk ? '(맞음)' : '(틀림)'}
                    {typeof r.score === 'number' ? ` · ${r.score}점` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Everyone all={all} mine={s.types} />
      </article>
    </main>
  );
}

/** 모두의 기록: 결재함 문서를 처음 결재한 사람들(만든 사람 제외)이 오류 유형별로 찾은 비율 */
function Everyone({ all, mine }) {
  if (!all) return null;
  const rows = Object.entries(all.types ?? {}).filter(([, x]) => x.planted > 0).sort((a, b) => a[1].found / a[1].planted - b[1].found / b[1].planted);
  return (
    <section className="everyone">
      <h2>모두의 기록</h2>
      <p className="muted small">결재함 문서를 처음 결재한 사람 {all.firstPlays ?? 0}명의 기록입니다(만든 사람의 판은 빼고 셉니다). 이름 없이 셉니다.</p>
      {rows.length === 0 ? <p className="muted">아직 기록이 없습니다.</p> : (
        <ul className="type-bars">
          {rows.map(([t, x]) => {
            const me = mine?.[t];
            return (
              <li key={t}>
                <span className="tb-name">{t}</span>
                <span className="tb-bar" aria-hidden="true"><span style={{ width: `${(x.found / x.planted) * 100}%` }} /></span>
                <span className="tb-num">{Math.round((x.found / x.planted) * 100)}%</span>
                {me && <span className="tb-me muted small">나 {Math.round((me.found / me.planted) * 100)}%</span>}
              </li>
            );
          })}
        </ul>
      )}
      {all.feedback && (all.feedback.yes + all.feedback.no) > 0 && <p className="muted small">「도움이 됐나요」 예 {all.feedback.yes} · 아니오 {all.feedback.no}</p>}
    </section>
  );
}
