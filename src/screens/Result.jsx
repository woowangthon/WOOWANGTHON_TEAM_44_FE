// 사수 모드 결과(놓친 것 따라가기): 한 줄 판정 → 오류가 번진 길·배운 것 → 놓친 A 카드(근거 칩·출처 칩·막아 보기) → 찾은 A·B·C(접기) → 작업 기록 다시 보기(S5→S1) → 이 정답표에 대해, 이의 제기
import { useEffect, useState } from 'react';
import { api, modelName, myAnswers } from '../api.js';
import { DocHead, LedgerTag, Stamp } from '../ui/doc.jsx';
import { SourcePanel, SourceDock, StageBlock, useDialog } from '../ui/work.jsx';
import PathMap from '../ui/PathMap.jsx';
import Slide from '../ui/Slide.jsx';

const refs = (it) => [it.origin, ...(it.spread ?? [])];

export default function Result({ run, done }) {
  const { meta, mission, docs, stages } = run;
  const { result: g, ledger: L, before, changed, answerId } = done;
  const [focus, setFocus] = useState(null);
  const [focusTick, setFocusTick] = useState(0); // 근거 칸을 누를 때마다 휴대폰 폭에서 원자료 서랍을 연다
  const [ob, setOb] = useState(null);
  const [openFound, setOpenFound] = useState(false);
  // AI 1차 판정(표시만, 점수와 무관): 결과를 먼저 보이고 판정은 뒤에서 한 번 부른다. 실패하면 판정 없이 둔다
  const [tri, setTri] = useState(done.triage ?? null);
  useEffect(() => {
    if (!answerId || tri?.status === 'done' || tri?.status === 'failed' || tri?.status === 'skipped') return;
    let stop = false, n = 0;
    const go = () => api.triage(answerId).then((r) => {
      if (stop) return;
      setTri(r.triage);
      if (r.triage?.status === 'running' && n++ < 8) setTimeout(go, 15000);
    }).catch(() => { if (!stop) setTri({ status: 'failed' }); });
    go();
    return () => { stop = true; };
  }, [answerId]);
  const triOf = (uid) => (tri?.status === 'done' ? tri.judgments.find((j) => j.uid === uid) : null);
  const marks = Object.fromEntries((done.answer?.marks ?? []).map((m) => [m.uid, m]));
  const myMarks = Object.keys(marks).length ? marks : Object.fromEntries((g.perItem ?? []).flatMap((p) => p.hitUnits.map((u) => [u, {}])).concat(g.falseMarks.map((u) => [u, {}])));
  // 단위별 결과 색: 찾은 A, 놓친 A, B·C, 헛짚음
  const review = {};
  for (const p of g.perItem) for (const u of [p.origin, ...p.spread]) review[u] = p.grade === 'A' ? (p.found ? 'foundA' : 'missA') : review[u] ?? 'bc';
  for (const u of g.falseMarks) review[u] = 'false';
  // 판단이 갈리는 칸: 한 감사만 옮겨졌다고 본 후보 칸에 그은 줄(점수 없음). 서버가 옛 판이면 없을 수 있다
  const splitMarks = g.splitMarks ?? [];
  for (const s of splitMarks) review[s.uid] = 'split';
  const items = L.items;
  const A = items.filter((x) => x.grade === 'A');
  const BC = items.filter((x) => x.grade !== 'A');
  const perOf = (id) => g.perItem.find((p) => p.id === id);
  const hl = focus ? (items.find((x) => x.id === focus)?.evidence ?? []).map((e) => e.ref).filter((r) => /^[A-F]-p/.test(r)) : [];

  const missedA = A.filter((it) => !perOf(it.id)?.found);
  const foundA = A.filter((it) => perOf(it.id)?.found);
  const stageName = (k) => stages.find((s) => s.key === k)?.name ?? '';
  // 지도에서 줄을 누르면: 그 오류 카드로 스크롤하고 초점을 옮긴다(찾은 오류는 접기를 연다). 원자료 강조는 그 항목 근거로 바꿔 둔다
  const pick = (id) => {
    setFocus(id);
    if (perOf(id)?.found) setOpenFound(true);
    setTimeout(() => { const el = document.getElementById(`item-${id}`); if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); } }, 0);
  };
  const evOf = (id) => g.evidenceUse?.items?.find((x) => x.id === id) ?? null;
  // 처음 생긴 칸으로: 아래 작업 기록 다시 보기에서 그 칸을 반짝이고, 원자료 근거 문단을 강조한다
  const goUnit = (it) => {
    setFocus(it.id); setFocusTick((t) => t + 1);
    setTimeout(() => {
      const el = document.querySelector(`.replay [data-uid="${it.origin}"]`);
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }, 40);
  };
  const card = (it) => {
    const p = perOf(it.id);
    const ev = evOf(it.id);
    const srcRefs = (it.evidence ?? []).map((e) => (typeof e === 'string' ? e : e.ref)).filter((r) => /^[A-Z]-p\d+$/.test(r ?? ''));
    return (
      <Slide as="li" from="left" key={it.id} id={`item-${it.id}`} tabIndex={-1} className={p?.found ? 'found' : 'missed'}>
        <p className="li-head">
          <span className={`tag ${p?.found ? 'tag-ok' : 'tag-red'}`}>{p?.found ? '찾음' : '놓침'}</span> <b>{it.pattern}</b> · 처음 생긴 곳 <button className="linkish" onClick={() => goUnit(it)} aria-label={`${it.origin} 칸과 근거 원자료 보기`}>{it.origin}</button>
          {it.spread.length > 0 && <> → 옮겨진 곳 {it.spread.join(' → ')}</>}
        </p>
        <p className="li-what">{it.wrongText ? <>「{it.wrongText}」 — </> : null}{it.why}</p>
        <div className="chips">
          {srcRefs.map((r) => {
            const st = !ev ? null : p?.found ? (ev.checked === 'source' ? ['보고 그음', 'chip-ok'] : ev.checked === 'stage' ? ['앞 단계로 확인', 'chip-navy'] : ['보기 전에 그음', 'chip-warn']) : (ev.looked ? ['봤지만 놓침', 'chip-warn'] : ['한 번도 안 봄', 'chip-red']);
            return <button key={r} type="button" className={`chip ${st?.[1] ?? ''}`} onClick={() => goUnit(it)} title="누르면 원자료에서 이 문단을 강조합니다">근거 {r}{st ? ` · ${st[0]}` : ''}</button>;
          })}
          <Provenance it={it} L={L} />
          {it.crowd?.n > 0 && <span className="chip">{it.crowd.rate == null ? `처음 푼 사람 ${it.crowd.n}명(5명부터 찾은 비율을 보여 드립니다)` : `처음 푼 사람 ${it.crowd.n}명 중 ${Math.round(it.crowd.rate * 100)}%가 찾음`}</span>}
        </div>
        {it.fix && <p className="li-fix"><b>고친 문장:</b> {it.fix}</p>}
        {!p?.found && <p className="stop-tip"><b>어디서 멈췄어야 했나:</b> {it.origin.split('.')[0]} 단계. 여기서 원자료와 대조했으면 {it.spread.length ? `${it.spread.map((u) => u.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).join('·')}로 번지지 않았습니다` : '최종본에 남지 않았습니다'}.</p>}
        <details className="li-more">
          <summary>확인 습관 · 막는 지시 · 근거</summary>
          <p className="small"><b>확인 습관:</b> {it.habit}</p>
          {it.prevent && <p className="small"><b>막는 지시:</b> {it.prevent}</p>}
          <p className="small muted">근거: {(it.evidence ?? []).map((e) => (typeof e === 'string' ? e : `${e.ref} 「${e.quote}」`)).join(' / ') || '—'} · 판정: {Object.entries(it.byAudit ?? {}).map(([c, b]) => `${c} ${b.grade}`).join(', ') || '사람 추가'}</p>
        </details>
        {!p?.found && <Patch runId={meta.runId} it={it} stage={stages.find((s) => s.key === it.origin.split('.')[0])} />}
      </Slide>
    );
  };

  return (
    <main className="run result">
      {changed && before && (
        <p className="notice">장부가 {before.ledgerVersion}판에서 {g.ledgerVersion}판으로 바뀌었습니다(이의 제기 등). {before.ledgerVersion}판 기준 A {before.counts.foundA}/{before.counts.A} → {g.ledgerVersion}판 기준 A {g.counts.foundA}/{g.counts.A}.</p>
      )}
      <div className="sheet">
        <DocHead id={meta.runId} title={mission.title} by={`작업 ${modelName(meta.worker)} · 검토 나`} drafter="AI 동료" review={g.decision === 'approve' ? '승인' : '반려'} animate />
        <section className="verdict" aria-label="한 줄 판정">
          <p className="verdict-line"><Verdict g={g} /></p>
          <div className="score-row score-main">
            <div className="score-box"><b>{g.counts.foundA}/{g.counts.A}</b><span>A등급 오류 찾음</span></div>
            <div className="score-box"><b>{g.decisionOk ? '맞음' : '틀림'}</b><span>결재 판정</span></div>
          </div>
          <p className="small score-sub">헛짚음(장부에 없는 곳) {g.counts.falseMarks}개 · 처음 생긴 곳 짚음 {g.counts.originable ? `${g.counts.originHits}/${g.counts.originable}` : '— (사람이 확정한 항목이 없어 세지 않음)'} · 기록용 합계 {g.score}점/100</p>
          <details className="score-how small">
            <summary>점수 매기는 법</summary>
            <p className="muted">점수는 사람이 검수한 장부의 A등급(원자료와 대조하면 누구나 같은 결론이 나는 오류)으로만 매깁니다. 배점은 찾음 50 · 정확도 20 · 결재 20 · 처음 생긴 곳 10입니다. B·C는 판단이 갈릴 수 있어 참고로만 보여 드립니다. 헛짚음은 장부에 없는 곳에 그은 빨간 줄입니다.{splitMarks.length ? ' 판단이 갈리는 칸(한 감사만 오류가 옮겨졌다고 본 칸)에 그은 줄은 찾음에도 헛짚음에도 넣지 않습니다.' : ''}</p>
          </details>
        </section>

        <div className="result-top">
          <PathMap items={A} stages={stages} perOf={perOf} onPick={pick} />
          <Learned A={A} perOf={perOf} stageName={stageName} falseMarks={g.falseMarks} decisionOk={g.decisionOk} shouldReject={g.shouldReject} ev={g.evidenceUse} cal={g.calibration} />
        </div>

        {!A.length && <p>이 판에는 A등급 오류가 없습니다. AI 동료가 늘 틀리지는 않습니다. 승인이 맞는 판입니다.</p>}
        {missedA.length > 0 && <>
          <h2>놓친 A등급 오류 {missedA.length}개</h2>
          <ol className="ledger-list">{missedA.map(card)}</ol>
        </>}
        {foundA.length > 0 && (
          <details className="found-list" open={!missedA.length || openFound} onToggle={(e) => setOpenFound(e.currentTarget.open)}>
            <summary>찾은 A등급 오류 {foundA.length}개</summary>
            <ol className="ledger-list">{foundA.map(card)}</ol>
          </details>
        )}
        {g.falseMarks.length > 0 && <p className="small">장부에 없는 곳에 그은 줄: {g.falseMarks.join(', ')}. 장부와 생각이 다르면 아래 작업 기록에서 그 칸을 눌러 이의를 제기할 수 있습니다.</p>}
        {BC.length > 0 && (
          <details className="bc">
            <summary>B·C 참고 {BC.length}개(점수 없음, 판단이 갈릴 수 있는 곳)</summary>
            <ul>{BC.map((it) => <li key={it.id}><b>{it.grade}</b> {it.pattern} · {it.origin} {it.wrongText ? `「${it.wrongText}」 ` : ''}— {it.why}</li>)}</ul>
          </details>
        )}
        {splitMarks.length > 0 && <p className="small"><span className="tag tag-split">판단이 갈리는 칸</span> {splitMarks.map((s) => `${s.uid}(${s.items.join('·')}가 옮겨졌을 수 있는 칸)`).join(', ')}. 감사 하나만 오류가 옮겨졌다고 본 칸이라 점수에 넣지 않았습니다(찾음·헛짚음 모두 아님).</p>}
        <Triage tri={tri} marks={marks} items={items} />

        <h2>작업 기록 다시 보기</h2>
        <p className="small muted">풀 때와 같이 최종본부터 보여 드립니다. 초록 = 찾은 A, 빨강 = 놓친 A, 노랑 = B·C, 하늘색 = 판단이 갈리는 칸, 회색 줄 = 헛짚음. 단위를 누르면 이의를 제기할 수 있습니다.</p>
        <div className="work-grid">
          <SourceDock openKey={focusTick}><SourcePanel key={focus ?? 'none'} docs={docs} highlight={hl} /></SourceDock>
          <div className="work-main replay">{stages.slice().reverse().map((s) => <StageBlock key={s.key} stage={s} marks={myMarks} review={review} onPick={(uid) => setOb({ uid, kind: review[uid] && review[uid] !== 'false' && review[uid] !== 'split' ? 'notError' : 'missing' })} />)}</div>
        </div>
        <details className="about-ledger">
          <summary>이 정답표에 대해</summary>
          <p className="small"><LedgerTag status={L.status} version={L.version} /> · 감사 {L.audits.map((a) => modelName(a.model)).join(', ')} · 사람 검수에서 승인 {L.changes.approved} · 수정 {L.changes.edited} · 삭제 {L.changes.deleted} · 추가 {L.changes.added}</p>
          <p className="small muted">작업 기록을 처음 보는 감사 모델이 오류 후보를 내고, 사람이 원자료와 대조해 승인·수정·삭제·추가한 결과입니다. 자세한 과정은 <a href="#/about">만든 방법과 검증</a>에 있습니다.</p>
        </details>
      </div>
      {ob && <Objection runId={run.meta.runId} answerId={answerId} ob={ob} items={items} onClose={() => setOb(null)} />}
      <Slide as="section" from="up" className="sheet" style={{ marginTop: 16 }} aria-label="이어서 연습">
        <h2 style={{ marginTop: 0 }}>이어서 연습</h2>
        <p>이 판의 문장으로 「맞다 / 틀렸다」를 고르는 짧은 연습입니다. 하루 3문항입니다.</p>
        <p><a className="btn btn-primary" href={`#/drill`}>짧은 연습 3문항</a></p>
      </Slide>
      <NextStep runId={meta.runId} />
    </main>
  );
}

/** 맨 위 한 줄 판정: 결재가 맞았나 + A등급을 몇 개 찾았나 */
function Verdict({ g }) {
  const { A, foundA } = g.counts;
  const ap = g.decision === 'approve';
  const head = g.decisionOk ? (ap ? '승인이 맞았습니다.' : '반려가 맞았습니다.') : (ap ? '승인은 맞지 않았습니다.' : '반려는 맞지 않았습니다.');
  const why = g.decisionOk ? '' : (g.shouldReject ? ' 최종본에 A등급 오류가 남아 있어 반려해야 했습니다.' : ' 최종본에 A등급 오류가 없어 승인해도 되는 판이었습니다.');
  const found = !A ? ' 이 판에는 A등급 오류가 없습니다.' : foundA === A ? ` A등급 오류 ${A}개를 모두 찾았습니다.` : ` ${g.decisionOk ? '다만 ' : ''}꼭 잡아야 할 A등급 오류 ${A}개 가운데 ${foundA ? `${foundA}개만` : '하나도 못'} 찾았습니다.`;
  return <><b>{head}</b>{why}{found}</>;
}

/** 다음 행동 하나: 아직 안 푼 판이 있으면 그 판, 없으면 습관 도감 */
function NextStep({ runId }) {
  const [next, setNext] = useState(null);
  useEffect(() => {
    api.missions().then((d) => {
      const solved = myAnswers.all();
      setNext((d?.missions ?? []).flatMap((m) => m.fixed).find((f) => f.playable && f.runId !== runId && !solved[f.runId]) ?? null);
    }).catch(() => {});
  }, [runId]);
  return (
    <p className="next">
      {next ? <a className="btn btn-primary" href={`#/r/${next.runId}`}>다음 판 풀기</a> : <a className="btn" href="#/patterns">습관 도감 보기</a>}
      {' '}<a href="#/">오늘의 연습</a> · <a href="#/me">내 실력</a>
    </p>
  );
}

const VERDICT = {
  grounded: '새 오류 후보 · 운영자 확인 중',
  ungrounded: '원자료에서 근거를 찾지 못했습니다',
  unclear: '판단이 어렵습니다',
  same: '내 메모가 장부의 이유와 같은 문제를 가리킵니다',
  different: '같은 칸이지만 내 메모는 장부와 다른 문제를 가리킵니다',
};
/** AI 1차 판정 칸: 사람 확인 전, 점수와 무관 */
function Triage({ tri, marks, items }) {
  if (tri?.status === 'skipped') return null;
  if (!tri || tri.status === 'running' || !tri.status) return <p className="small muted triage">AI 1차 판정 중… (내 빨간 줄이 원자료 근거가 있는지 보는 중입니다. 점수와는 관계없습니다)</p>;
  if (tri.status === 'failed') return null; // 실패하면 판정 없이 결과만
  const fresh = tri.judgments.filter((j) => j.kind === 'new');
  const same = tri.judgments.filter((j) => j.kind === 'same');
  if (!fresh.length && !same.length) return null;
  return (
    <section className="triage" aria-label="AI 1차 판정">
      <h3>내 빨간 줄에 대한 AI 1차 판정 <span className="ltag ltag-ai">AI 1차 판정 · 사람 확인 전</span></h3>
      <p className="small muted">점수에는 넣지 않습니다. 「새 오류 후보」는 만든 사람이 원자료와 대조해 판정하고, 받아들이면 장부 새 판이 나와 결과가 다시 계산됩니다.</p>
      {fresh.length > 0 && <><p className="small"><b>장부에 없는 곳에 그은 줄</b></p>
        <ul className="small">{fresh.map((j) => <li key={j.uid}><b>{j.uid}</b> {j.verdict === 'grounded' ? <span className="tag">{VERDICT.grounded}</span> : VERDICT[j.verdict]} — {j.why}{j.evidence.filter((e) => e.found).length > 0 && <span className="muted"> (근거 {j.evidence.filter((e) => e.found).map((e) => `${e.ref} 「${e.quote}」`).join(' / ')})</span>}</li>)}</ul></>}
      {same.length > 0 && <><p className="small"><b>장부 항목과 같은 칸에 그은 줄</b> (칸이 겹쳐 「찾음」으로 셌지만, 이유까지 같은지 따로 봅니다)</p>
        <ul className="small">{same.map((j) => <li key={j.uid}><b>{j.uid}</b>{j.cand ? <span className="tag tag-split">판단이 갈리는 칸 · 점수 없음</span> : ' '}{VERDICT[j.verdict]} — {j.why}{marks[j.uid]?.note ? <span className="muted"> · 내 메모: {marks[j.uid].note}</span> : null}</li>)}</ul></>}
      <p className="small muted">판정 모델 {tri.model ?? '—'} · {tri.sec ?? '—'}초</p>
    </section>
  );
}

/** 결과에서 배운 것: 놓친 패턴, 가장 먼저 멈췄어야 할 단계, 다음에 넣을 지시 한 줄 */
function Learned({ A, perOf, stageName, falseMarks, decisionOk, shouldReject, ev, cal }) {
  const missed = A.filter((it) => !perOf(it.id)?.found);
  const pats = [...new Set(missed.map((it) => it.pattern))];
  const stageOf = (it) => String(perOf(it.id)?.stopAt ?? it.origin).split('.')[0];
  const num = (k) => Number(String(k).replace(/\D/g, '')) || 0;
  const byStage = {};
  for (const it of missed) byStage[stageOf(it)] = (byStage[stageOf(it)] ?? 0) + 1;
  const stops = Object.keys(byStage).sort((a, b) => num(a) - num(b));
  const first = stops[0];
  const prevent = missed.find((it) => it.prevent)?.prevent;
  return (
    <section className="learned" aria-label="이번 판에서 배운 것">
      <h2>이번 판에서 배운 것</h2>
      <ul>
        <li>{A.length ? (missed.length ? `A등급 ${A.length}개 가운데 ${missed.length}개를 놓쳤습니다. 놓친 유형: ${pats.join(', ')}.` : `A등급 ${A.length}개를 모두 찾았습니다.`) : '이 판에는 A등급 오류가 없었습니다. AI 동료가 늘 틀리지는 않습니다.'}</li>
        {first && <li>가장 먼저 멈췄어야 할 곳: <b>{first}{stageName(first) ? ` ${stageName(first)}` : ''}</b>. 놓친 {missed.length}개 가운데 {byStage[first]}개가 여기서 시작됐습니다{stops.length > 1 ? ` (나머지: ${stops.slice(1).map((k) => `${k} ${byStage[k]}개`).join(', ')})` : ''}. 이 단계 결과를 원자료와 한 번 더 대조했으면 뒤 단계로 번지지 않았습니다.</li>}
        <li>결재: {decisionOk ? '맞게 판단했습니다' : '판단이 틀렸습니다'}({shouldReject ? '최종본에 A가 남아 반려가 맞음' : '최종본에 A가 없어 승인이 맞음'}).{falseMarks.length ? ` 장부에 없는 곳에 ${falseMarks.length}번 줄을 그었습니다.` : ''}</li>
        {ev && (ev.engaged === false
          ? <li>원자료 패널을 열지 않아 근거 대조 기록이 없습니다. 다음 판에서는 원자료를 펼쳐 문장마다 대조해 보세요.</li>
          : <li>근거 대조: {ev.found?.n ? `찾은 오류 ${ev.found.n}개 가운데 ${ev.found.checked}개는 근거 문단이 화면에 보인 뒤에 그었습니다.` : ''}{ev.missed?.n ? ` 놓친 오류 ${ev.missed.n}개 가운데 ${ev.missed.neverLooked}개는 근거 문단이 한 번도 화면에 나오지 않았습니다${(ev.items ?? []).filter((x) => !x.found && !x.looked).flatMap((x) => x.refs ?? []).length ? `(${[...new Set((ev.items ?? []).filter((x) => !x.found && !x.looked).flatMap((x) => x.refs ?? []))].join(', ')})` : ''}.` : ''}</li>)}
        {cal && (cal.sure?.n || cal.unsure?.n) ? <li>확신: 확실하다고 그은 줄 {cal.sure?.n ?? 0}개 가운데 {cal.sure?.correct ?? 0}개, 의심으로 그은 줄 {cal.unsure?.n ?? 0}개 가운데 {cal.unsure?.correct ?? 0}개가 A등급 오류 칸이었습니다.{(cal.sure?.n ?? 0) >= 2 && (cal.sure.correct / cal.sure.n) < 0.5 ? ' 확실하다고 한 줄이 절반 넘게 빗나갔습니다. 근거 문단을 짚은 뒤에 「확실」을 고르는 습관을 들여 보세요.' : (cal.unsure?.n ?? 0) >= 1 && cal.unsure.correct === cal.unsure.n ? ' 의심한 줄이 모두 맞았습니다. 의심이 들면 원자료를 한 번 더 보고 확실로 바꿔도 됩니다.' : ''}</li> : null}
        {prevent && <li>다음에 맡길 때 넣을 지시: 「{prevent}」 아래 놓친 오류 카드의 「이 오류 막아 보기」에서 직접 써 볼 수 있습니다.</li>}
      </ul>
    </section>
  );
}

/** 이의 제기(사수·팀장 모드 결과 공통) */
export function Objection({ runId, answerId, ob, items, onClose }) {
  const [kind, setKind] = useState(ob.kind);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [msg, setMsg] = useState('');
  const item = items.find((x) => refs(x).includes(ob.uid));
  const dref = useDialog(onClose);
  const send = async () => {
    try {
      const r = await api.objection({ runId, answerId, kind, uid: ob.uid, item: item?.id ?? null, evidence: evidence.split(/[\s,]+/).filter(Boolean), reason });
      setMsg(r.message);
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="mark-editor" role="dialog" aria-modal="true" aria-label="이의 제기" ref={dref}>
      <p><b>{ob.uid}</b> 이의 제기</p>
      <div className="seg">
        <button className={kind === 'missing' ? 'on btn' : 'btn'} onClick={() => setKind('missing')}>장부에 없는 오류다</button>
        <button className={kind === 'notError' ? 'on btn' : 'btn'} onClick={() => setKind('notError')} disabled={!item}>오류가 아니다{item ? ` (${item.id})` : ''}</button>
      </div>
      <label className="small">근거 원자료 문단(예: A-p3)<input value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      <label className="small">이유<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={800} /></label>
      {msg && <p className="small">{msg}</p>}
      <div className="row-btns"><button className="btn btn-primary" onClick={send} disabled={reason.trim().length < 8 || !!msg}>보내기</button><button className="btn" onClick={onClose}>닫기</button></div>
    </div>
  );
}

/** 정답표 출처 칩(F8): 이 항목을 누가 짚고 어떻게 확정했나(서버 provenance, 결재 뒤에만 옴) */
const FIELD_KO = { grade: '등급', origin: '처음 생긴 곳' };
function Provenance({ it, L }) {
  const pv = it.provenance;
  const by = pv?.audits?.companies ?? Object.keys(it.byAudit ?? {});
  const of = pv?.audits?.of ?? L.audits?.length ?? 0;
  const added = pv?.human?.review === 'added' || pv?.human?.source === 'human' || (!by.length && String(it.id).startsWith('H'));
  const cc = pv?.codeCheck;
  return (<>
    {added ? <span className="chip chip-red" title="감사 모델이 모두 놓쳐 사람이 추가한 오류">감사가 모두 놓침 · 사람 추가</span>
      : <span className="chip" title={by.join(', ')}>감사 {by.length}/{of}곳이 짚음</span>}
    {cc && (cc.quotesVerbatim ? <span className="chip">근거 인용이 원자료에 그대로 있음(코드 대조)</span> : cc.refsExist === false ? <span className="chip chip-warn">근거 문단 번호 확인 필요</span> : null)}
    <span className="chip chip-ok">사람 확정 · 장부 {pv?.ledgerVersion ?? L.version}판{pv?.human?.originConfirmed === 'human' ? ' · 처음 생긴 곳도 사람이 고름' : ''}</span>
    {(pv?.changes ?? []).map((c, i) => <span key={i} className="chip chip-navy" title={`장부 ${c.inVersion ?? ''}판에서 바뀜`}>사람 검수에서 {FIELD_KO[c.field] ?? c.field} {c.before}→{c.after}</span>)}
  </>);
}

const PV = { blocked: ['막음', 'blocked', '이 오류가 다시 나오지 않았습니다.'], remained: ['남음', 'remained', '같은 오류가 글자 그대로 또는 말을 바꿔 남았습니다.'], new: ['새 오류', 'new', '이 오류는 막았지만 다른 오류가 생겼습니다.'] };
/** 막아 보기(F6): 놓친 오류가 생긴 단계 하나만 지시를 고쳐 실제로 다시 시킨다 */
function Patch({ runId, it, stage }) {
  const [open, setOpen] = useState(false);
  const [ins, setIns] = useState(stage?.instruction ?? '');
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  if (!stage) return null;
  const go = async () => {
    setBusy(true); setError(''); setR(null);
    try { setR(await api.patch({ runId, itemId: it.id, instruction: ins })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (!open) return <p className="row-btns"><button className="btn" onClick={() => setOpen(true)}>이 오류 막아 보기</button><span className="small muted" style={{ alignSelf: 'center' }}>{stage.key} 단계 지시만 고쳐 AI 동료에게 다시 시킵니다</span></p>;
  const v = r ? PV[r.verdict] : null;
  return (
    <section className="patch" aria-label="막아 보기">
      <p style={{ marginTop: 0 }}><b>{stage.key} {stage.name}</b> 단계만 다시 시킵니다. 받는 것: {(stage.inputs ?? []).map((x) => (x === 'sources' ? '원자료' : x === 'brief' ? '팀장 지시' : x)).join(' · ')}. 같은 작업 모델이 같은 입력으로 다시 합니다.</p>
      {it.prevent && <p className="small">힌트(막는 지시): 「{it.prevent}」 <button type="button" className="linkish" onClick={() => setIns(`${ins.trim()}\n${it.prevent}`.trim())}>지시 끝에 넣기</button></p>}
      <label className="small">이 단계에 줄 지시(고쳐 쓰세요)<textarea rows={4} value={ins} maxLength={1500} onChange={(e) => setIns(e.target.value)} /></label>
      <div className="row-btns">
        <button className="btn btn-primary" disabled={busy || ins.trim().length < 8} onClick={go}>{busy ? 'AI 동료가 다시 하는 중…(보통 30초)' : '이 단계만 다시 시키기'}</button>
        <button className="btn" onClick={() => setOpen(false)}>접기</button>
      </div>
      <p className="small muted">실제 모델을 부릅니다. 기기당 하루 5번. 판정은 사람 확인 전이며 점수에 넣지 않습니다.</p>
      {error && <p className="error">{error}</p>}
      {r && (
        <div className="patch-out">
          <p className={`patch-verdict ${v[1]}`}>판정: {v[0]} — {v[2]}</p>
          {r.judge?.why && <p className="small">감사({modelName(r.judge.model)}): {r.judge.why}</p>}
          {r.judge?.remains_quote && <p className="small">남은 구절: 「{r.judge.remains_quote}」</p>}
          {r.judge?.new_error_quote && <p className="small">새 오류: 「{r.judge.new_error_quote}」</p>}
          <p className="small muted">코드 판정: 틀린 구절이 새 결과에 {r.code?.remain == null ? '판단하지 않음(구절이 짧음)' : `${Math.round(r.code.remain * 100)}% 남음(기준 ${Math.round(r.code.threshold * 100)}%)`} · {r.sec}초 · {r.label}</p>
          <details><summary className="small">다시 한 결과 보기</summary>
            <ul className="work-list">{r.after.map((u) => <li key={u.uid}><span className="uid">{u.uid.split('.')[1]}</span>{u.text}</li>)}</ul>
          </details>
        </div>
      )}
    </section>
  );
}
