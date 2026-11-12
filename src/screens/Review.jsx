// 만든 사람 검수: 장부 항목마다 승인·수정·삭제·등급 조정·근원 확정(키보드), 직접 대조로 장부에 없는 오류 추가, 확정.
// 키: Y 승인 · D 삭제 · 1/2/3 등급 A/B/C · O 근원 확정 · J/K 다음/이전 · N 고른 단위로 항목 추가 · Tab 직접 대조로
import { useEffect, useMemo, useState, useCallback } from 'react';
import { api, reviewCode, modelName } from '../api.js';
import { SourcePanel, StageBlock, PATTERNS } from '../ui/work.jsx';

export default function Review({ runId }) {
  const [code, setCode] = useState(reviewCode.get());
  const [q, setQ] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!runId && code) api.reviewQueue().then(setQ).catch((e) => setError(e.message)); }, [runId, code]);
  if (!code) return <CodeGate onSet={(v) => { reviewCode.set(v); setCode(v); }} />;
  if (runId) return <ReviewRun runId={runId} />;
  if (error) return <main><p className="error">{error}</p><CodeGate onSet={(v) => { reviewCode.set(v); setCode(v); setError(''); }} /></main>;
  if (!q) return <main><p className="muted">대기열을 불러오는 중…</p></main>;
  return (
    <main>
      <h1>검수 대기열</h1>
      <table className="inbox-table">
        <thead><tr><th>판</th><th>미션·지시</th><th>작업 모델</th><th>장부 판</th><th>내 풀이</th><th></th></tr></thead>
        <tbody>
          {q.runs.filter((r) => r.role !== 'baseline').map((r) => (
            <tr key={r.runId}>
              <td className="mono">{r.runId}</td><td>{r.missionId} · {r.style}</td><td>{modelName(r.worker)}</td>
              <td>{r.versions.map((v) => `${v.version}판(${v.status === 'reviewed' ? '검수' : 'AI'}, ${v.items})`).join(' → ')}{r.draft ? ' · 초안 있음' : ''}</td>
              <td>{r.makerSolved ? '풀었음' : <a href={`#/r/${r.runId}`}>먼저 풀기</a>}</td>
              <td>{r.makerSolved ? <a className="btn" href={`#/review/${r.runId}`}>검수</a> : <a className="small" href={`#/review/${r.runId}?force=1`}>풀지 않고 열기</a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>이의 제기 {q.objections.filter((o) => o.status === 'open').length}건 대기</h2>
      <ul>{q.objections.map((o) => <li key={o.id}><span className="mono">{o.id}</span> {o.status} · {o.runId} · {o.kind === 'missing' ? '장부에 없는 오류' : '오류가 아님'} {o.uid} — {o.reason} {o.status === 'open' && <a href={`#/review/${o.runId}`}>판정하러</a>}</li>)}</ul>
    </main>
  );
}

function CodeGate({ onSet }) {
  const [v, setV] = useState('');
  return (
    <main><h1>검수 화면</h1><p>만든 사람 전용입니다. 검수 코드를 넣어 주세요(이 브라우저에만 저장).</p>
      <input type="password" value={v} onChange={(e) => setV(e.target.value)} aria-label="검수 코드" /> <button className="btn" onClick={() => onSet(v)}>들어가기</button></main>
  );
}

function ReviewRun({ runId }) {
  const force = /force=1/.test(location.hash);
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [cur, setCur] = useState(0);
  const [mode, setMode] = useState('items'); // items | direct
  const [pickUid, setPickUid] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.reviewRun(runId, force).then(setD).catch((e) => setError(e.message)), [runId, force]);
  useEffect(() => { load(); }, [load]);

  const items = d?.draft.items ?? [];
  // 순서: 두 감사 일치 → 한쪽만 → 사람 추가. 검수 화면은 등급 A부터
  const order = useMemo(() => [...items].sort((a, b) => (a.source === 'both' ? 0 : 1) - (b.source === 'both' ? 0 : 1) || (a.grade ?? 'Z').localeCompare(b.grade ?? 'Z')), [items]);
  const it = order[cur];
  const op = async (o) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await api.reviewOp(runId, { note, ...o }); setNote(''); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  useEffect(() => {
    const on = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'Tab') { e.preventDefault(); setMode((m) => (m === 'items' ? 'direct' : 'items')); return; }
      if (mode !== 'items' || !it) return;
      const k = e.key.toLowerCase();
      if (k === 'y') op({ action: 'approve', item: it.id }).then(() => setCur((c) => Math.min(c + 1, order.length - 1)));
      else if (k === 'd') op({ action: 'delete', item: it.id }).then(() => setCur((c) => Math.min(c + 1, order.length - 1)));
      else if (['1', '2', '3'].includes(k)) op({ action: 'edit', item: it.id, grade: 'ABC'[Number(k) - 1] });
      else if (k === 'o') op({ action: 'confirmOrigin', item: it.id, value: !it.originConfirmed });
      else if (k === 'j' || e.key === 'ArrowRight') setCur((c) => Math.min(c + 1, order.length - 1));
      else if (k === 'k' || e.key === 'ArrowLeft') setCur((c) => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  if (error && !d) return <main><p className="error">{error}</p><a href="#/review">대기열</a></main>;
  if (!d) return <main><p className="muted">불러오는 중…</p></main>;
  const { run, docs, draft, mission } = d;
  const done = items.filter((x) => x.review !== 'pending').length;
  const hlUnits = it ? [it.origin, ...(it.spread ?? [])] : [];
  const review = Object.fromEntries(items.filter((x) => !x.deleted).flatMap((x) => [x.origin, ...(x.spread ?? [])].map((u) => [u, x.grade === 'A' ? 'missA' : 'bc'])));
  const evid = (it?.evidence ?? []).map((e) => e.ref).filter((r) => /^[A-F]-p/.test(r));
  const finalize = async () => { try { const r = await api.reviewFinalize(runId); alert(`장부 ${r.ledger.version}판으로 확정했습니다`); load(); } catch (e) { setError(e.message); } };

  return (
    <main className="review">
      <p className="band">{runId} · {modelName(run.worker)} · 장부 초안(바탕 {draft.base}판) · 항목 {items.length}(두 감사 일치 {items.filter((x) => x.source === 'both').length} · 한쪽만 {items.filter((x) => x.source === 'one').length} · 사람 {items.filter((x) => x.source === 'human' || x.source === 'objection').length}) · 코드만 후보 {draft.codeOnly?.length ?? 0} · 진행 {done}/{items.length}
        {' '}<button className="btn" onClick={() => setMode(mode === 'items' ? 'direct' : 'items')}>{mode === 'items' ? '직접 대조로(Tab)' : '항목 검수로(Tab)'}</button>
        {' '}<button className="btn btn-primary" onClick={finalize} disabled={done < items.filter((x) => x.grade).length}>확정(새 판)</button></p>
      {error && <p className="error">{error}</p>}
      <p className="small muted">키: Y 승인 · D 삭제 · 1/2/3 등급 A/B/C · O 근원 확정 · J/K 다음/이전 · Tab 직접 대조. 메모 칸에 적은 말이 다음 동작의 이유로 남습니다.</p>
      <div className="review-grid">
        <aside className="work-src"><SourcePanel key={evid.join() || 'x'} docs={docs} highlight={evid} compact /></aside>
        <div>
          {mode === 'items' && it && (
            <section className="sheet review-item">
              <p className="li-head"><b>{it.id}</b> · {it.source === 'both' ? '두 감사 일치' : it.source === 'one' ? '한 감사만' : '사람 추가'} · <b>{it.grade}</b>{it.gradeSplit ? '(감사 간 등급 엇갈림)' : ''} · {it.pattern} · {it.review}{it.originConfirmed ? ' · 근원 확정' : ''} <span className="muted">({cur + 1}/{order.length})</span></p>
              <p>근원 <b>{it.origin}</b>{it.spread?.length ? <> → 번짐 {it.spread.join(', ')}</> : null} 「{it.wrongText}」</p>
              {Object.entries(it.byAudit ?? {}).map(([c, b]) => (
                <p key={c} className="small"><b>{c}({modelName(b.model)}) {b.grade}</b> 근원 {b.origin}: {b.why} <span className="muted">코드: 구절 {b.code?.wrongInUnit ? '○' : '×'} · 근거 {b.code?.evidence?.filter((e) => e.found).length ?? 0}/{b.code?.evidence?.length ?? 0}{b.code?.numNotInSource?.length ? ` · 원자료에 없는 숫자 ${b.code.numNotInSource.join(',')}` : ''}</span></p>
              ))}
              {!Object.keys(it.byAudit ?? {}).length && <p className="small">{it.why}</p>}
              <p className="small muted">막는 지시: {it.prevent || '—'}</p>
              <EditFields it={it} onSave={(f) => op({ action: 'edit', item: it.id, ...f })} />
              <label className="small">메모(이유)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <div className="row-btns">
                <button className="btn btn-primary" onClick={() => op({ action: 'approve', item: it.id })}>승인 Y</button>
                <button className="btn" onClick={() => op({ action: 'delete', item: it.id })}>삭제 D</button>
                <button className="btn" onClick={() => op({ action: 'confirmOrigin', item: it.id, value: !it.originConfirmed })}>근원 {it.originConfirmed ? '확정 풀기' : '확정'} O</button>
                <button className="btn" onClick={() => setCur(Math.max(cur - 1, 0))}>이전 K</button>
                <button className="btn" onClick={() => setCur(Math.min(cur + 1, order.length - 1))}>다음 J</button>
              </div>
            </section>
          )}
          {mode === 'direct' && (
            <section className="sheet">
              <p><b>직접 대조</b>: 원자료와 단계별 산출물을 나란히 보고, 장부에 없는 오류가 있는 단위를 눌러 추가합니다. 노랑·빨강은 이미 장부에 있는 단위입니다.</p>
              {draft.codeOnly?.length > 0 && <p className="small">코드만 찾은 후보: {draft.codeOnly.map((c) => `${c.uid}(${[...c.missing, ...(c.dday ?? []).map((x) => `남은 날 ${x.stated}≠${x.fromToday}/${x.fromPost}`)].join(', ')})`).join(' · ')}</p>}
              {pickUid && <AddItem uid={pickUid} onAdd={(f) => op({ action: 'add', origin: pickUid, ...f }).then(() => setPickUid(null))} onClose={() => setPickUid(null)} />}
            </section>
          )}
          {(d.objections ?? []).filter((o) => o.status === 'open').map((o) => <ObjectionJudge key={o.id} o={o} items={items} onDone={load} />)}
          <div className="work-main">{run.stages.map((s) => <StageBlock key={s.key} stage={s} review={review} marks={Object.fromEntries(hlUnits.map((u) => [u, {}]))} onPick={mode === 'direct' ? setPickUid : undefined} />)}</div>
        </div>
      </div>
    </main>
  );
}

function EditFields({ it, onSave }) {
  const [pattern, setPattern] = useState(it.pattern);
  const [origin, setOrigin] = useState(it.origin);
  const [why, setWhy] = useState(it.why);
  useEffect(() => { setPattern(it.pattern); setOrigin(it.origin); setWhy(it.why); }, [it.id, it.pattern, it.origin, it.why]);
  const dirty = pattern !== it.pattern || origin !== it.origin || why !== it.why;
  return (
    <details className="small"><summary>고치기(패턴·근원·이유)</summary>
      <label>패턴<select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label>근원 단위<input value={origin} onChange={(e) => setOrigin(e.target.value)} /></label>
      <label>이유<textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></label>
      <button className="btn" disabled={!dirty} onClick={() => onSave({ pattern, origin, why })}>고친 것 저장</button>
    </details>
  );
}

function AddItem({ uid, onAdd, onClose }) {
  const [grade, setGrade] = useState('A');
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [why, setWhy] = useState('');
  const [wrongText, setWrong] = useState('');
  const [ev, setEv] = useState('');
  return (
    <div className="mark-editor" role="dialog" aria-label="항목 추가">
      <p><b>{uid}</b>에 항목 추가</p>
      <label className="small">등급<select value={grade} onChange={(e) => setGrade(e.target.value)}><option>A</option><option>B</option><option>C</option></select></label>
      <label className="small">패턴<select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="small">틀린 구절<input value={wrongText} onChange={(e) => setWrong(e.target.value)} /></label>
      <label className="small">근거 문단(예: A-p3)<input value={ev} onChange={(e) => setEv(e.target.value)} /></label>
      <label className="small">이유<textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></label>
      <div className="row-btns"><button className="btn btn-primary" disabled={!why.trim()} onClick={() => onAdd({ grade, pattern, why, wrongText, originConfirmed: true, evidence: ev.split(/[\s,]+/).filter(Boolean).map((ref) => ({ ref, quote: '' })) })}>추가</button><button className="btn" onClick={onClose}>닫기</button></div>
    </div>
  );
}

function ObjectionJudge({ o, items, onDone }) {
  const [note, setNote] = useState('');
  const [grade, setGrade] = useState('A');
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [msg, setMsg] = useState('');
  const decide = async (accept) => {
    const op = !accept ? null : o.kind === 'notError' ? { action: 'delete', item: o.item } : { action: 'add', origin: o.uid, grade, pattern, why: o.reason, originConfirmed: false, evidence: (o.evidence ?? []).map((ref) => ({ ref, quote: '' })) };
    try { const r = await api.reviewObjection(o.id, accept, note, op); setMsg(accept ? `받아들임 → 장부 ${r.newVersion}판` : '받아들이지 않음'); onDone(); } catch (e) { setMsg(e.message); }
  };
  return (
    <section className="sheet objection">
      <p><b>이의 {o.id}</b> · {o.kind === 'missing' ? '장부에 없는 오류' : `오류가 아님(${o.item})`} · 단위 {o.uid} · 근거 {(o.evidence ?? []).join(', ') || '—'}</p>
      <p>{o.reason}</p>
      {o.kind === 'missing' && <p className="small">받아들이면 추가할 항목: <select value={grade} onChange={(e) => setGrade(e.target.value)}><option>A</option><option>B</option><option>C</option></select> <select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></p>}
      <label className="small">판정 이유<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row-btns"><button className="btn btn-primary" onClick={() => decide(true)} disabled={!note.trim()}>받아들임</button><button className="btn" onClick={() => decide(false)} disabled={!note.trim()}>받아들이지 않음</button></div>
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
