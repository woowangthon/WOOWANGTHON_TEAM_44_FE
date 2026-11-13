// 사수 모드 결과: A 찾음·헛짚음·판정, 번진 경로, 멈췄어야 할 곳, 패턴·확인 습관·막는 지시, B·C 참고, 이의 제기
import { useEffect, useState } from 'react';
import { api, modelName } from '../api.js';
import { DocHead, LedgerTag, Stamp } from '../ui/doc.jsx';
import { SourcePanel, SourceDock, StageBlock, useDialog } from '../ui/work.jsx';

const refs = (it) => [it.origin, ...(it.spread ?? [])];

export default function Result({ run, done }) {
  const { meta, mission, docs, stages } = run;
  const { result: g, ledger: L, before, changed, answerId } = done;
  const [focus, setFocus] = useState(null);
  const [focusTick, setFocusTick] = useState(0); // 근거 칸을 누를 때마다 휴대폰 폭에서 원자료 서랍을 연다
  const [ob, setOb] = useState(null);
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

  return (
    <main className="run result">
      <p className="band">
        <LedgerTag status={L.status} version={L.version} /> · 감사 {L.audits.map((a) => modelName(a.model)).join(', ')} · 사람 검수에서 승인 {L.changes.approved} · 수정 {L.changes.edited} · 삭제 {L.changes.deleted} · 추가 {L.changes.added}
      </p>
      {changed && before && (
        <p className="notice">장부가 {before.ledgerVersion}판에서 {g.ledgerVersion}판으로 바뀌었습니다(이의 제기 등). {before.ledgerVersion}판 기준 A {before.counts.foundA}/{before.counts.A} → {g.ledgerVersion}판 기준 A {g.counts.foundA}/{g.counts.A}.</p>
      )}
      <div className="sheet">
        <DocHead id={meta.runId} title={mission.title} by={`작업 ${modelName(meta.worker)} · 검토 나`} drafter="AI 동료" review={g.decision === 'approve' ? '승인' : '반려'} animate />
        <div className="score-row">
          <div className="score-box"><b>{g.counts.foundA}/{g.counts.A}</b><span>A등급 오류 찾음</span></div>
          <div className="score-box"><b>{g.counts.falseMarks}</b><span>헛짚음(장부에 없는 곳)</span></div>
          <div className="score-box"><b>{g.decisionOk ? '맞음' : '틀림'}</b><span>결재 판정({g.shouldReject ? '최종본에 A가 남아 반려가 맞음' : '최종본에 A가 없어 승인이 맞음'})</span></div>
          <div className="score-box"><b>{g.counts.originable ? `${g.counts.originHits}/${g.counts.originable}` : '—'}</b><span>{g.counts.originable ? '처음 생긴 곳(멈췄어야 할 곳) 짚음' : '처음 생긴 곳: 이 판은 사람이 확정한 항목이 없어 세지 않음'}</span></div>
          <div className="score-box"><b>{done.answer?.sourceViews ?? '—'}</b><span>원자료를 열어 본 횟수</span></div>
        </div>
        <p className="small muted">점수는 사람이 검수한 장부의 A등급(원자료와 대조하면 누구나 같은 결론이 나는 오류)으로만 매깁니다. B·C는 판단이 갈릴 수 있어 참고로만 보여 드립니다. 기록용 합계 {g.score}점(찾음 50 · 정확도 20 · 결재 20 · 처음 생긴 곳 10).</p><p className="small muted">헛짚음 = 장부에 없는 곳에 그은 빨간 줄입니다.{splitMarks.length ? ' 판단이 갈리는 칸(한 감사만 오류가 옮겨졌다고 본 칸)에 그은 줄은 찾음에도 헛짚음에도 넣지 않습니다.' : ''}</p>

        <Learned A={A} perOf={perOf} falseMarks={g.falseMarks} decisionOk={g.decisionOk} shouldReject={g.shouldReject} />

        <h2>A등급 오류 {A.length}개</h2>
        {!A.length && <p>이 판에는 A등급 오류가 없습니다. AI 동료가 늘 틀리지는 않습니다. 승인이 맞는 판입니다.</p>}
        <ol className="ledger-list">
          {A.map((it) => {
            const p = perOf(it.id);
            return (
              <li key={it.id} className={p?.found ? 'found' : 'missed'}>
                <p className="li-head">
                  <span className={`tag ${p?.found ? '' : 'tag-red'}`}>{p?.found ? '찾음' : '놓침'}</span> <b>{it.pattern}</b> · 처음 생긴 곳 <button className="linkish" onClick={() => { setFocus(it.id); setFocusTick((t) => t + 1); }} aria-label={`${it.origin} 근거 원자료 보기`}>{it.origin}</button>
                  {it.spread.length > 0 && <> → 옮겨진 곳 {it.spread.join(' → ')}</>}
                </p>
                <p>「{it.wrongText}」 — {it.why}</p>
                {!p?.found && <p className="stop-tip"><b>어디서 멈췄어야 했나:</b> {it.origin.split('.')[0]} 단계. 여기서 원자료와 대조했으면 {it.spread.length ? `${it.spread.map((u) => u.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).join('·')}로 번지지 않았습니다` : '최종본에 남지 않았습니다'}.</p>}
                <p className="small"><b>확인 습관:</b> {it.habit}</p>
                {it.prevent && <p className="small"><b>막는 지시:</b> {it.prevent}</p>}
                {it.fix && <p className="small muted">고친 문장: {it.fix}</p>}
                <p className="small muted">근거: {(it.evidence ?? []).map((e) => `${e.ref} 「${e.quote}」`).join(' / ') || '—'} · 판정: {Object.entries(it.byAudit).map(([c, b]) => `${c} ${b.grade}`).join(', ') || '사람 추가'}</p>
              </li>
            );
          })}
        </ol>
        {BC.length > 0 && (
          <details className="bc">
            <summary>B·C 참고 {BC.length}개(점수 없음, 판단이 갈릴 수 있는 곳)</summary>
            <ul>{BC.map((it) => <li key={it.id}><b>{it.grade}</b> {it.pattern} · {it.origin} 「{it.wrongText}」 — {it.why}</li>)}</ul>
          </details>
        )}
        {splitMarks.length > 0 && <p className="small"><span className="tag tag-split">판단이 갈리는 칸</span> {splitMarks.map((s) => `${s.uid}(${s.items.join('·')}가 옮겨졌을 수 있는 칸)`).join(', ')}. 감사 하나만 오류가 옮겨졌다고 본 칸이라 점수에 넣지 않았습니다(찾음·헛짚음 모두 아님).</p>}
        {g.falseMarks.length > 0 && <p className="small">장부에 없는 곳에 그은 줄: {g.falseMarks.join(', ')}. 장부와 생각이 다르면 아래 작업 기록에서 그 칸을 눌러 이의를 제기할 수 있습니다.</p>}
        <Triage tri={tri} marks={marks} items={items} />

        <h2>작업 기록 다시 보기</h2>
        <p className="small muted">초록 = 찾은 A, 빨강 = 놓친 A, 노랑 = B·C, 하늘색 = 판단이 갈리는 칸, 회색 줄 = 헛짚음. 단위를 누르면 이의를 제기할 수 있습니다.</p>
        <div className="work-grid">
          <SourceDock openKey={focusTick}><SourcePanel key={focus ?? 'none'} docs={docs} highlight={hl} /></SourceDock>
          <div className="work-main">{stages.map((s) => <StageBlock key={s.key} stage={s} marks={myMarks} review={review} onPick={(uid) => setOb({ uid, kind: review[uid] && review[uid] !== 'false' && review[uid] !== 'split' ? 'notError' : 'missing' })} />)}</div>
        </div>
      </div>
      {ob && <Objection runId={run.meta.runId} answerId={answerId} ob={ob} items={items} onClose={() => setOb(null)} />}
      <p className="next"><a className="btn" href="#/">다른 미션</a> <a className="btn" href="#/me">내 기록</a></p>
    </main>
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

/** 결과에서 배운 것: 놓친 패턴, 멈췄어야 할 곳, 다음에 넣을 지시 한 줄 */
function Learned({ A, perOf, falseMarks, decisionOk, shouldReject }) {
  const missed = A.filter((it) => !perOf(it.id)?.found);
  const pats = [...new Set(missed.map((it) => it.pattern))];
  const stops = [...new Set(missed.map((it) => it.origin.split('.')[0]))];
  const prevent = missed.find((it) => it.prevent)?.prevent;
  return (
    <section className="learned" aria-label="이번 판에서 배운 것">
      <h2>이번 판에서 배운 것</h2>
      <ul>
        <li>{A.length ? (missed.length ? `A등급 ${A.length}개 가운데 ${missed.length}개를 놓쳤습니다. 놓친 유형: ${pats.join(', ')}.` : `A등급 ${A.length}개를 모두 찾았습니다.`) : '이 판에는 A등급 오류가 없었습니다. AI 동료가 늘 틀리지는 않습니다.'}</li>
        {missed.length > 0 && <li>멈췄어야 할 곳: {stops.join('·')} 단계. 이 단계 결과를 원자료와 한 번 더 대조했으면 뒤 단계로 번지지 않았습니다.</li>}
        <li>결재: {decisionOk ? '맞게 판단했습니다' : '판단이 틀렸습니다'}({shouldReject ? '최종본에 A가 남아 반려가 맞음' : '최종본에 A가 없어 승인이 맞음'}).{falseMarks.length ? ` 장부에 없는 곳에 ${falseMarks.length}번 줄을 그었습니다.` : ''}</li>
        {prevent && <li>다음에 맡길 때 넣을 지시: 「{prevent}」</li>}
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
