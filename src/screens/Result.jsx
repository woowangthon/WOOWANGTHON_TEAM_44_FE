// 사수 모드 결과: A 찾음·헛짚음·판정, 번진 경로, 멈췄어야 할 곳, 패턴·확인 습관·막는 지시, B·C 참고, 이의 제기
import { useState } from 'react';
import { api, modelName } from '../api.js';
import { DocHead, LedgerTag, Stamp } from '../ui/doc.jsx';
import { SourcePanel, StageBlock } from '../ui/work.jsx';

const refs = (it) => [it.origin, ...(it.spread ?? [])];

export default function Result({ run, done }) {
  const { meta, mission, docs, stages } = run;
  const { result: g, ledger: L, before, changed, answerId } = done;
  const [focus, setFocus] = useState(null);
  const [ob, setOb] = useState(null);
  const marks = Object.fromEntries((done.answer?.marks ?? []).map((m) => [m.uid, m]));
  const myMarks = Object.keys(marks).length ? marks : Object.fromEntries((g.perItem ?? []).flatMap((p) => p.hitUnits.map((u) => [u, {}])).concat(g.falseMarks.map((u) => [u, {}])));
  // 단위별 결과 색: 찾은 A, 놓친 A, B·C, 헛짚음
  const review = {};
  for (const p of g.perItem) for (const u of [p.origin, ...p.spread]) review[u] = p.grade === 'A' ? (p.found ? 'foundA' : 'missA') : review[u] ?? 'bc';
  for (const u of g.falseMarks) review[u] = 'false';
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
          <div className="score-box"><b>{g.counts.originable ? `${g.counts.originHits}/${g.counts.originable}` : '—'}</b><span>근원(멈췄어야 할 곳) 짚음</span></div>
          <div className="score-box"><b>{done.answer?.sourceViews ?? '—'}</b><span>원자료 대조 횟수</span></div>
        </div>
        <p className="small muted">점수는 사람이 검수한 장부의 A등급(원자료와 대조하면 누구나 같은 결론이 나는 오류)으로만 매깁니다. B·C는 판단이 갈릴 수 있어 참고로만 보여 드립니다. 기록용 합계 {g.score}점.</p>

        <h2>A등급 오류 {A.length}개</h2>
        {!A.length && <p>이 판에는 A등급 오류가 없습니다. AI 동료가 늘 틀리지는 않습니다. 승인이 맞는 판입니다.</p>}
        <ol className="ledger-list">
          {A.map((it) => {
            const p = perOf(it.id);
            return (
              <li key={it.id} className={p?.found ? 'found' : 'missed'}>
                <p className="li-head">
                  <span className={`tag ${p?.found ? '' : 'tag-red'}`}>{p?.found ? '찾음' : '놓침'}</span> <b>{it.pattern}</b> · 근원 <button className="linkish" onClick={() => setFocus(it.id)}>{it.origin}</button>
                  {it.spread.length > 0 && <> → 번짐 {it.spread.join(' → ')}</>}
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
        {g.falseMarks.length > 0 && <p className="small">헛짚은 곳: {g.falseMarks.join(', ')}. 장부와 생각이 다르면 아래에서 이의를 제기할 수 있습니다.</p>}

        <h2>작업 기록 다시 보기</h2>
        <p className="small muted">초록 = 찾은 A, 빨강 = 놓친 A, 노랑 = B·C, 회색 줄 = 헛짚음. 단위를 누르면 이의를 제기할 수 있습니다.</p>
        <div className="work-grid">
          <aside className="work-src"><SourcePanel key={focus ?? 'none'} docs={docs} highlight={hl} /></aside>
          <div className="work-main">{stages.map((s) => <StageBlock key={s.key} stage={s} marks={myMarks} review={review} onPick={(uid) => setOb({ uid, kind: review[uid] && review[uid] !== 'false' ? 'notError' : 'missing' })} />)}</div>
        </div>
      </div>
      {ob && <Objection run={run} answerId={answerId} ob={ob} items={items} onClose={() => setOb(null)} />}
      <p className="next"><a className="btn" href="#/">다른 미션</a> <a className="btn" href="#/me">내 기록</a></p>
    </main>
  );
}

function Objection({ run, answerId, ob, items, onClose }) {
  const [kind, setKind] = useState(ob.kind);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [msg, setMsg] = useState('');
  const item = items.find((x) => refs(x).includes(ob.uid));
  const send = async () => {
    try {
      const r = await api.objection({ runId: run.meta.runId, answerId, kind, uid: ob.uid, item: item?.id ?? null, evidence: evidence.split(/[\s,]+/).filter(Boolean), reason });
      setMsg(r.message);
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="mark-editor" role="dialog" aria-label="이의 제기">
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
