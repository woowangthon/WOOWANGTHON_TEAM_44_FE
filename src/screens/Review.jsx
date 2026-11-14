// 만든 사람 검수: 장부 항목마다 승인·수정·삭제·등급 조정·근원 확정(키보드), 직접 대조로 장부에 없는 오류 추가, 확정.
// 키: Y 승인 · D 삭제 · 1/2/3 등급 A/B/C · O 근원 확정 · J/K 다음/이전 · Tab 직접 대조로(화면에는 뜻이 적힌 버튼을 먼저 둔다)
import { useEffect, useMemo, useState, useCallback } from 'react';
import { api, reviewCode, modelName } from '../api.js';
import { SourcePanel, SourceDock, StageBlock, PATTERNS } from '../ui/work.jsx';

const STATUS = { pending: '아직 안 봄', approved: '판정함', edited: '판정함(고침)', deleted: '오류 아님으로 뺌', added: '사람이 추가' };
const GRADES = [
  { k: 'A', key: '1', label: 'A · 분명한 오류', desc: '원자료와 다르고, 읽는 사람의 결론·행동이 달라짐. 점수에 씀' },
  { k: 'B', key: '2', label: 'B · 판단이 갈림', desc: '틀렸다고 볼 수도 있고 아닐 수도 있음. 점수에 안 씀' },
  { k: 'C', key: '3', label: 'C · 사소함', desc: '표현이 어색하지만 결론은 같음. 점수에 안 씀' },
];

const ANSWERS = [
  { k: 'A', key: '1', label: '틀렸다(분명함)', desc: '원자료와 대조하면 누구나 틀렸다고 볼 것. 읽는 사람이 잘못 행동하게 됨' },
  { k: 'B', key: '2', label: '애매하다', desc: '틀렸다고 볼 수도, 아니라고 볼 수도 있음' },
  { k: 'C', key: '3', label: '사소하다', desc: '표현만 어색하고 뜻은 같음' },
  { k: 'none', key: 'D', label: '틀리지 않았다', desc: '원자료와 맞거나 문제 삼을 일이 아님' },
];
// 이 글은 괜찮은데, 이걸 옮겨 쓴 뒤 단계 글이 틀린 경우(처음 생긴 곳을 뒤 글로 옮긴다)
const LATER = { k: 'later', key: '4', label: '이 글은 맞고, 뒤에서 틀렸다', desc: '이 내용을 옮겨 쓴 뒤 단계 글이 틀림. 다음 화면에서 어느 글인지 고름' };

export default function Review({ runId }) {
  const [code, setCode] = useState(reviewCode.get());
  const [q, setQ] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!runId && code) api.reviewQueue().then(setQ).catch((e) => setError(e.message)); }, [runId, code]);
  if (!code) return <CodeGate onSet={(v) => { reviewCode.set(v); setCode(v); }} />;
  if (runId) return <ReviewRun runId={runId} />;
  if (error) return <main><p className="error">{error}</p><CodeGate onSet={(v) => { reviewCode.set(v); setCode(v); setError(''); }} /></main>;
  if (!q) return <main><p className="muted">대기열을 불러오는 중…</p></main>;
  const runs = q.runs.filter((r) => r.role !== 'baseline');
  const open = q.objections.filter((o) => o.status === 'open');
  const decided = q.objections.filter((o) => o.status !== 'open');
  const reviewedRun = new Set(q.runs.filter((r) => r.versions.some((v) => v.status === 'reviewed')).map((r) => r.runId));
  return (
    <main className="review">
      <h1>검수 대기열</h1>
      <h2>장부 검수 {runs.length}판</h2>
      <ul className="queue-list">
        {runs.map((r) => {
          const p = r.progress;
          const last = r.versions.at(-1);
          return (
            <li key={r.runId} className="sheet queue-card">
              <p className="li-head"><b>{r.missionId} · {modelName(r.worker)} 판</b> <span className="mono small muted">{r.runId}</span></p>
              <p className="small">장부 {last ? `${last.version}판(${last.status === 'reviewed' ? '사람 검수 완료' : 'AI 감사, 사람 확인 전'}, 항목 ${last.items}개)` : '없음'}</p>
              {p?.unchanged && <p className="small"><b>검수 끝</b> · 장부 {p.lastVersion}판으로 채점합니다. 고칠 게 생기면 다시 열어 고친 뒤 확정하면 다음 판이 됩니다.</p>}
              {p && !p.unchanged && (
                <>
                  <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={p.of} aria-valuenow={p.done} aria-label="검수 진행"><span style={{ width: `${p.of ? (100 * p.done) / p.of : 0}%` }} /></div>
                  <p className="small">{p.left.length ? `남은 질문 ${p.left.length}개` : '모두 답함, 확정만 남음'}</p>
                </>
              )}
              <p className="row-btns">
                {r.makerSolved
                  ? <a className="btn btn-primary" href={`#/review/${r.runId}`}>{p ? (p.unchanged ? '다시 열기(고칠 때만)' : p.left.length ? '이어서 검수' : '확정하러 가기') : '검수 시작'}</a>
                  : <><a className="btn btn-primary" href={`#/r/${r.runId}`}>먼저 정답 없이 풀기</a> <a className="small" href={`#/review/${r.runId}?force=1`}>풀지 않고 열기</a></>}
              </p>
            </li>
          );
        })}
      </ul>

      <h2>이의·자동 판정 {open.length}건 대기</h2>
      <p className="small muted">사용자가 건 이의와, AI 1차 판정이 「장부에 없는 오류 후보」로 넣은 것을 한곳에서 판정합니다. 받아들이면 장부 새 판이 생기고 그 판을 푼 사람의 결과가 다시 계산됩니다.</p>
      {!open.length && <p className="small">대기 중인 것이 없습니다.</p>}
      {open.map((o) => <ObjectionJudge key={o.id} o={o} canAccept={reviewedRun.has(o.runId) || String(o.runId).startsWith('live-')} onDone={() => api.reviewQueue().then(setQ)} />)}
      {decided.length > 0 && (
        <details className="small"><summary>판정한 것 {decided.length}건</summary>
          <ul>{decided.map((o) => <li key={o.id}>{o.source === 'auto' ? 'AI 1차 판정 후보' : '사용자 이의'} · {o.runId} {o.uid} · {o.status === 'accepted' ? `받아들임(장부 ${o.newVersion}판)` : '받아들이지 않음'} — {o.decisionNote || '이유 없음'}</li>)}</ul>
        </details>
      )}
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
  const [mode, setMode] = useState('items'); // items | direct
  const [pickUid, setPickUid] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.reviewRun(runId, force).then(setD).catch((e) => setError(e.message)), [runId, force]);
  useEffect(() => { load(); }, [load]);

  const items = d?.draft.items ?? [];
  const [skipped, setSkipped] = useState(() => { try { return JSON.parse(localStorage.getItem(`redline:reviewSkip:${runId}`) || '[]'); } catch { return []; } });
  const skip = (uid) => { const n = [...new Set([...skipped, uid])]; setSkipped(n); try { localStorage.setItem(`redline:reviewSkip:${runId}`, JSON.stringify(n)); } catch { /* 저장 못 해도 화면에서는 숨김 */ } };
  // 순서는 작업 순서(처음 생긴 곳이 앞 단계인 것부터)로 고정한다. 답해도 순서가 바뀌지 않는다. 위치는 항목 id로 기억한다
  const unitsAll = d ? d.run.stages.flatMap((st) => st.units) : [];
  const uIdx = (uid) => unitsAll.findIndex((u) => u.uid === uid);
  const order = useMemo(() => items.filter((x) => !x.mergedInto).sort((a, b) => uIdx(a.origin) - uIdx(b.origin) || a.id.localeCompare(b.id)), [items, d]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = order.filter((x) => x.review === 'pending');
  const [curId, setCurId] = useState(null);
  const it = order.find((x) => x.id === curId) ?? left[0] ?? order[0];
  const cur = order.indexOf(it);
  const setCur = (f) => { const i = typeof f === 'function' ? f(cur) : f; const x = order[Math.max(0, Math.min(i, order.length - 1))]; if (x) setCurId(x.id); };
  // 답한 뒤: 지금 문장 뒤의 남은 질문 → 없으면 앞쪽 남은 질문 → 없으면 그 자리
  const goNextPending = (fromId, list) => {
    const i = list.findIndex((x) => x.id === fromId);
    const nx = list.slice(i + 1).find((x) => x.review === 'pending') ?? list.find((x) => x.review === 'pending' && x.id !== fromId);
    setCurId(nx ? nx.id : fromId);
  };
  const next = () => setCur((c) => c + 1);
  const myMarks = d?.makerMarks ?? [];
  const units = d ? d.run.stages.flatMap((st) => st.units) : [];
  const unitText = (uid) => units.find((u) => u.uid === uid)?.text ?? '';
  // 묶인 항목 나누기: 처음 생긴 곳이 장부 항목과 같은 감사 쪽은 그 항목을 고치고(또는 뺌), 나머지는 새 항목으로 더한다
  const splitSave = async (it, sp, choices) => {
    if (busy) return;
    setBusy(true); setError('');
    const parts = [...sp.parts].sort((x, y) => (x.origin === it.origin ? -1 : 0) - (y.origin === it.origin ? -1 : 0));
    const tag = '두 감사가 다른 문장을 짚어 나눔';
    try {
      const [p0, ...rest] = parts;
      const c0 = choices[p0.company];
      if (c0 === 'none') await api.reviewOp(runId, { action: 'delete', item: it.id, note: `${tag}: ${p0.company} 쪽 오류 아님. ${note}` });
      else await api.reviewOp(runId, { action: 'edit', item: it.id, grade: c0, origin: p0.origin, wrongText: p0.wrongText, why: p0.why, pattern: p0.pattern, spread: p0.spread, evidence: p0.evidence?.length ? p0.evidence : it.evidence, byAudit: { [p0.company]: it.byAudit[p0.company] }, source: 'one', note: `${tag}: ${p0.company} 쪽. ${note}` });
      for (const p of rest) {
        const c = choices[p.company];
        if (c === 'none') continue;
        await api.reviewOp(runId, { action: 'add', split: true, splitFrom: it.id, byAudit: { [p.company]: it.byAudit[p.company] }, origin: p.origin, spread: p.spread, wrongText: p.wrongText, why: p.why, pattern: p.pattern, grade: c, evidence: p.evidence, originConfirmed: false, note: `${tag}: ${it.id}에서 ${p.company} 쪽을 떼어 냄. ${note}` });
      }
      setNote(''); await load();
    } catch (e) { setError(e.message); await load(); } finally { setBusy(false); }
  };
  const myMarksOf = (x) => myMarks.filter((m) => [x.origin, ...(x.spread ?? [])].includes(m.uid));
  const covered = new Set(items.filter((x) => !x.deleted).flatMap((x) => [x.origin, ...(x.spread ?? [])]));
  const extraMine = myMarks.filter((m) => !covered.has(m.uid));
  // 등급 고르기 = 그 등급으로 판정. 등급이 그대로면 승인, 바뀌면 고침으로 남는다
  const decide = (x, g) => op(x.grade === g && !x.deleted ? { action: 'approve', item: x.id } : { action: 'edit', item: x.id, grade: g }).then((ok) => ok && goNextPending(x.id, order));
  // 답 하나 = 판정 하나. 답한 뒤에는 남은 질문의 첫 문장으로
  const answer = (x, k) => (k === 'later' ? setLater({ id: x.id, picked: null }) : k === 'none' ? op({ action: 'delete', item: x.id }).then((ok) => ok && goNextPending(x.id, order)) : decide(x, k));
  // 「이 글은 맞고, 뒤에서 틀렸다」: 고른 글 중 가장 앞 글을 처음 생긴 곳으로, 나머지를 옮겨진 곳으로
  const [later, setLater] = useState(null);
  const unitIdx = (uid) => units.findIndex((u) => u.uid === uid);
  const moveSave = (x, picked, g) => {
    const sorted = [...picked].sort((a, b) => unitIdx(a) - unitIdx(b));
    const mine = myMarks.find((m) => m.uid === sorted[0]);
    return op({ action: 'edit', item: x.id, origin: sorted[0], spread: sorted.slice(1), wrongText: mine?.quote || '', grade: g, ...(mine?.pattern ? { pattern: mine.pattern } : {}),
      note: `사람 판단: ${x.origin}은 맞고, 뒤 단계 ${sorted.join(', ')}가 틀림. ${note}` })
      .then((ok) => ok && api.reviewOp(runId, { action: 'confirmOrigin', item: x.id, value: true, note: '사람이 처음 생긴 곳을 직접 고름' })
        .then(() => { setLater(null); return load(); }).then(() => goNextPending(x.id, order)));
  };
  const op = async (o) => {
    if (busy) return false;
    setBusy(true); setError('');
    try { await api.reviewOp(runId, { note, ...o }); setNote(''); await load(); return true; } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  };

  useEffect(() => {
    const on = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'Tab') { e.preventDefault(); setMode((m) => (m === 'items' ? 'direct' : 'items')); return; }
      if (mode !== 'items' || !it) return;
      const k = e.key.toLowerCase();
      if (k === 'y') op({ action: 'approve', item: it.id }).then(next);
      else if (k === 'd') answer(it, 'none');
      else if (['1', '2', '3'].includes(k)) decide(it, 'ABC'[Number(k) - 1]);
      else if (k === '4' && it.spread?.length) answer(it, 'later');
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
  const finalize = async () => { try { const r = await api.reviewFinalize(runId); alert(`정답표를 확정했습니다(장부 ${r.ledger.version}판). 이제 이 판으로 채점합니다.`); load(); } catch (e) { setError(e.message); } };

  return (
    <main className="review">
      <p className="band">{mission?.title ?? runId} · AI 동료 {modelName(run.worker)} · <b>남은 질문 {left.length}개</b>
        {' '}<button className="btn" onClick={() => setMode(mode === 'items' ? 'direct' : 'items')}>{mode === 'items' ? '감사가 놓친 오류 직접 찾기 (Tab)' : '질문으로 돌아가기 (Tab)'}</button>
        {' '}{d.progress?.unchanged
          ? <span className="tag">확정됨 · 장부 {d.progress.lastVersion}판(고치면 다시 확정할 수 있음)</span>
          : <button className={`btn ${left.length ? '' : 'btn-primary'}`} onClick={finalize} disabled={left.length > 0}>{left.length ? `질문 ${left.length}개에 답하면 확정할 수 있습니다` : '검수 끝, 정답표 확정'}</button>}</p>
        <p className="small"><a href="#/review">← 대기열</a></p>
      {error && <p className="error">{error}</p>}
      <p className="small muted">문장마다 「원자료와 견줘 틀렸나요?」 하나만 답하면 됩니다. 묶인 문장 나누기, 같은 오류 합치기, 오류가 옮겨진 곳 정하기는 코드가 합니다. 키보드: 1·2·3·D 답, J 건너뛰기, K 이전.</p>
      <div className="review-grid">
        <SourceDock><SourcePanel key={evid.join() || 'x'} docs={docs} highlight={evid} compact /></SourceDock>
        <div>
          {mode === 'items' && !it && <section className="sheet review-item"><p>남은 질문이 없습니다.</p></section>}
          {mode === 'items' && it && (() => {
            const text = unitText(it.origin);
            const w = it.wrongText && text.includes(it.wrongText) ? it.wrongText : '';
            const st = run.stages.find((x) => x.key === it.origin.split('.')[0].split('#')[0]);
            const stNo = run.stages.indexOf(st) + 1;
            const whys = [...new Set(Object.values(it.byAudit ?? {}).map((x) => x.why).filter(Boolean))];
            const ev = (it.evidence ?? []).filter((e) => e.quote && /^[A-F]-p/.test(e.ref));
            const memo = myMarks.find((m) => m.uid === it.origin);
            const pendingNow = it.review === 'pending';
            const answered = { approved: it.grade, edited: it.grade, added: it.grade, deleted: 'none' }[it.review];
            return (
            <section className="sheet review-item">
              <p className="li-head"><b>질문 {cur + 1} / {order.length}</b> <span className="muted small">· 작업 순서대로 · 남은 질문 {left.length}개</span>{' '}{pendingNow ? <span className="tag">아직 안 답함</span> : <span className="tag">답함 · 바꾸려면 다시 고르세요</span>}</p>

              <p className="rv-q">AI 동료가 {stNo}단계 「{st?.name}」에서 쓴 글</p>
              <blockquote className="rv-unit">{w ? <>{text.slice(0, text.indexOf(w))}<mark className="rv-wrong">{w}</mark>{text.slice(text.indexOf(w) + w.length)}</> : text}</blockquote>

              <p className="rv-q">감사가 본 문제</p>
              {whys.length > 1 ? <ul className="rv-audits">{whys.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="rv-why">{it.why}</p>}

              {ev.length > 0 && <>
                <p className="rv-q">원자료</p>
                <ul className="rv-evid">{ev.map((e, i) => <li key={i}><span className="muted small">{docs[e.ref.split('-')[0]]?.title ?? e.ref}</span><br />「{e.quote}」</li>)}</ul>
              </>}

              {memo && <div className="rv-mine small"><b>미영이 풀 때 이 글에 남긴 메모</b><p>{memo.note || '(메모 없이 빨간 줄만)'}</p></div>}

              <h3 className="rv-ask">{w ? <>노란 부분 「{w.length > 50 ? `${w.slice(0, 50)}…` : w}」</> : '이 글'}이 원자료와 견줘 틀렸나요?</h3>
              <div className="rv-choices">
                {[...ANSWERS, ...(it.spread?.length ? [LATER] : [])].map((g) => (
                  <button key={g.k} className={`btn rv-choice ${answered === g.k || later?.id === it.id && g.k === 'later' ? 'on' : ''}`} disabled={busy} onClick={() => answer(it, g.k)}>
                    <b>{g.label}</b><span>{g.desc}</span><kbd>{g.key}</kbd>
                  </button>
                ))}
              </div>

              {later?.id === it.id && (() => {
                const cands = [...it.spread].sort((a, b) => unitIdx(a) - unitIdx(b));
                const picked = later.picked ?? cands.filter((u) => myMarks.some((m) => m.uid === u));
                const toggle = (u) => setLater({ ...later, picked: picked.includes(u) ? picked.filter((x) => x !== u) : [...picked, u] });
                return (
                  <div className="rv-later">
                    <h3 className="rv-ask">뒤 단계에서 틀린 글을 모두 고르세요</h3>
                    <p className="small muted">미영이 풀 때 빨간 줄을 그은 글은 미리 골라 두었습니다. 고른 글 가운데 가장 앞 글이 오류가 처음 생긴 곳이 됩니다.</p>
                    <ul className="rv-later-list">
                      {cands.map((u) => {
                        const s2 = run.stages.find((x) => x.key === u.split('.')[0].split('#')[0]);
                        const m = myMarks.find((x) => x.uid === u);
                        const other = order.find((x) => x.id !== it.id && x.origin === u && x.review !== 'deleted');
                        return (
                          <li key={u}><label className={picked.includes(u) ? 'on' : ''}>
                            <input type="checkbox" checked={picked.includes(u)} onChange={() => toggle(u)} />
                            <span><span className="muted small">{run.stages.indexOf(s2) + 1}단계 「{s2?.name}」{m && <b> · 미영이 풀 때 빨간 줄</b>}{other && <b> · 다른 질문(질문 {order.indexOf(other) + 1})에서 이미 묻는 글: 「{(other.wrongText || '').slice(0, 30)}」</b>}</span><br />{unitText(u)}
                              {m?.note && <><br /><span className="small muted">메모: {m.note}</span></>}</span>
                          </label></li>
                        );
                      })}
                    </ul>
                    <p className="rv-q">고른 글은 얼마나 틀렸나요?</p>
                    <div className="rv-choices">
                      {ANSWERS.filter((g) => g.k !== 'none').map((g) => (
                        <button key={g.k} className="btn rv-choice" disabled={busy || !picked.length} onClick={() => moveSave(it, picked, g.k)}>
                          <b>{g.label}</b><span>{g.desc}</span>
                        </button>
                      ))}
                    </div>
                    <button className="btn" onClick={() => setLater(null)}>취소</button>
                  </div>
                );
              })()}

              <div className="row-btns">
                <button className="btn" onClick={() => setCur(Math.max(cur - 1, 0))}>이전 <kbd>K</kbd></button>
                <button className="btn" onClick={next}>건너뛰기 <kbd>J</kbd></button>
              </div>
              <details className="small rv-more"><summary>고급(평소에는 안 열어도 됨): 메모 · 감사별 원문 · 직접 고치기</summary>
                <label className="small">메모(판단 이유, 이력에 남음)<textarea className="note-box" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                <p className="muted">항목 {it.id} · 처음 생긴 곳 {it.origin} · 옮겨진 칸 {(it.spread ?? []).join(', ') || '없음'}</p>
                {Object.entries(it.byAudit ?? {}).map(([c, x]) => <p key={c}><b>{c}({modelName(x.model)}) {x.grade}</b> {x.why}</p>)}
                <EditFields it={it} onSave={(f) => op({ action: 'edit', item: it.id, ...f })} />
              </details>
            </section>
            );
          })()}
          {mode === 'direct' && extraMine.filter((m) => !skipped.includes(m.uid)).map((m) => (
            <MineCard key={m.uid} m={m} text={run.stages.flatMap((st) => st.units).find((u) => u.uid === m.uid)?.text ?? ''} triage={d.makerTriage?.judgments?.find((j) => j.uid === m.uid)} busy={busy}
              onAdd={(grade) => op({ action: 'add', origin: m.uid, grade, pattern: m.pattern || '기타', why: m.note || '(풀 때 메모 없음)', wrongText: m.quote || '', originConfirmed: !!m.origin, note: '풀이 때 그은 빨간 줄에서 추가' })}
              onSkip={() => skip(m.uid)} />
          ))}
          {mode === 'items' && cur === order.length - 1 && extraMine.length > 0 && (
            <p className="small notice">풀 때 그었는데 장부에 없는 빨간 줄이 {extraMine.length}개 있습니다. 「장부가 놓친 오류 찾기」에서 한 번 눌러 추가할 수 있습니다.</p>
          )}
          {mode === 'direct' && (
            <section className="sheet">
              <h3 className="rv-q">장부가 놓친 오류가 있나요?</h3>
              <p className="small">위 카드는 풀 때 그었는데 장부에 없는 빨간 줄입니다. 아래 작업 기록에서 다른 칸을 눌러도 추가할 수 있습니다. 노랑·빨강 칸은 이미 장부에 있습니다.</p>
              {draft.codeOnly?.length > 0 && <p className="small">코드만 찾은 후보: {draft.codeOnly.map((c) => `${c.uid}(${[...c.missing, ...(c.dday ?? []).map((x) => `남은 날 ${x.stated}≠${x.fromToday}/${x.fromPost}`)].join(', ')})`).join(' · ')}</p>}
              {pickUid && <AddItem uid={pickUid} text={run.stages.flatMap((st) => st.units).find((u) => u.uid === pickUid)?.text ?? ''} onAdd={(f) => op({ action: 'add', origin: pickUid, ...f }).then(() => setPickUid(null))} onClose={() => setPickUid(null)} />}
            </section>
          )}
          {(d.objections ?? []).filter((o) => o.status === 'open').map((o) => <ObjectionJudge key={o.id} o={o} canAccept={d.versions.some((v) => v.status === 'reviewed') || run.origin === 'live'} onDone={load} />)}
          {d.versions.some((v) => v.status === 'reviewed') && <DrillConfirm runId={runId} />}
          <p className="small muted">작업 기록은 최종본부터 보여 드립니다.</p>
          <div className="work-main">{[...run.stages].reverse().map((s) => <StageBlock key={s.key} stage={s} review={review} marks={Object.fromEntries(hlUnits.map((u) => [u, {}]))} onPick={mode === 'direct' ? setPickUid : undefined} />)}</div>
        </div>
      </div>
    </main>
  );
}

/** AI 동료가 쓴 문장(틀린 구절 강조) */
function Sentence({ uid, text, wrong, label = 'AI 동료가 쓴 문장' }) {
  const w = wrong && text.includes(wrong) ? wrong : '';
  const i = w ? text.indexOf(w) : -1;
  return (<>
    <h3 className="rv-q">{label} <span className="small muted">{uid}</span></h3>
    <blockquote className="rv-unit">{w ? <>{text.slice(0, i)}<mark className="rv-wrong">{w}</mark>{text.slice(i + w.length)}</> : <>{text}{wrong ? <><br /><span className="small">문제 구절: 「{wrong}」</span></> : null}</>}</blockquote>
  </>);
}
const Evidence = ({ ev }) => {
  const list = (ev ?? []).filter((e) => e.quote && /^[A-F]-p/.test(e.ref));
  return list.length ? <ul className="rv-evid small">{list.map((e, i) => <li key={i}>원자료 <b>{e.ref}</b> 「{e.quote}」</li>)}</ul> : null;
};
/** 풀 때 그은 빨간 줄: 이 문장 칸에 그은 것은 바로, 옮겨진 칸에 그은 것은 다른 얘기일 수 있어 접어 둔다 */
function Marks({ marks, origin, spread }) {
  const here = marks.filter((m) => m.uid === origin);
  const there = marks.filter((m) => m.uid !== origin && spread.includes(m.uid));
  return (
    <div className="rv-mine small">
      {here.length ? <><b>미영이 풀 때 이 문장({origin})에 그은 빨간 줄</b><ul>{here.map((m) => <li key={m.uid}>{m.note || '(메모 없음)'}</li>)}</ul></> : <span>미영은 풀 때 이 문장({origin})에 빨간 줄을 긋지 않았습니다.</span>}
      {there.length > 0 && (
        <details><summary className="muted">이 오류가 옮겨졌다고 감사가 본 칸에 그은 줄 {there.length}개(다른 얘기일 수 있음)</summary>
          <ul>{there.map((m) => <li key={m.uid}><b>{m.uid}</b> {m.note || '(메모 없음)'}</li>)}</ul></details>
      )}
    </div>
  );
}

/** 두 감사가 서로 다른 문장을 짚었는데 한 항목으로 묶인 경우: 문장마다 「오류인가요?」를 따로 고르고 한 번에 저장 */
function SplitCard({ it, sp, units, myMarks, busy, head, nav, onSave }) {
  const parts = [...sp.parts].sort((x, y) => (x.origin === it.origin ? -1 : 0) - (y.origin === it.origin ? -1 : 0));
  const [ch, setCh] = useState({});
  const ready = parts.every((p) => ch[p.company]);
  const opts = [...GRADES.map((g) => ({ k: g.k, label: g.label, desc: g.desc })), { k: 'none', label: '오류 아님', desc: '원자료와 맞거나 문제 삼을 일이 아님' }];
  return (
    <section className="sheet review-item">
      {head}
      <p className="notice">이 항목은 두 감사가 <b>서로 다른 문장</b>을 짚은 것이 하나로 묶여 있습니다(옛 묶기 규칙). 문장마다 따로 답해 주세요. 저장하면 둘로 나뉘어 장부에 들어갑니다.{it.review !== 'pending' ? ' 이미 한 번 판정한 항목이지만 나눠서 다시 판정할 수 있습니다.' : ''}</p>
      {parts.map((p, i) => (
        <div key={p.company} className="split-part">
          <p className="li-head"><b>{i + 1}. {p.company} 감사가 짚은 문장</b> <span className="small muted">({p.grade}등급으로 봄)</span></p>
          <Sentence uid={p.origin} text={units.find((u) => u.uid === p.origin)?.text ?? ''} wrong={p.wrongText} label="" />
          <p className="rv-why"><b>감사가 본 문제:</b> {p.why}</p>
          <Evidence ev={p.evidence} />
          <Marks marks={myMarks} origin={p.origin} spread={p.spread} />
          <p className="rv-q small">{p.origin}의 {p.wrongText ? `「${p.wrongText.slice(0, 40)}${p.wrongText.length > 40 ? '…' : ''}」` : '이 문장'}는 원자료와 견줘 오류인가요?</p>
          <div className="rv-choices">
            {opts.map((o) => <button key={o.k} className={`btn rv-choice ${ch[p.company] === o.k ? 'on' : ''}`} disabled={busy} onClick={() => setCh({ ...ch, [p.company]: o.k })}><b>{o.label}</b><span>{o.desc}</span></button>)}
          </div>
        </div>
      ))}
      <p className="row-btns"><button className="btn btn-primary" disabled={!ready || busy} onClick={() => onSave(ch)}>{ready ? '이대로 나눠서 저장하고 다음' : `문장 ${parts.length}개에 모두 답하면 저장할 수 있습니다`}</button></p>
      {nav}
    </section>
  );
}

function EditFields({ it, onSave }) {
  const [pattern, setPattern] = useState(it.pattern);
  const [origin, setOrigin] = useState(it.origin);
  const [why, setWhy] = useState(it.why);
  // 번진 곳: 이 항목 때문에 틀어진 뒤 단계 단위. 채점에서 여기 그은 빨간 줄도 이 오류를 찾은 것으로 센다
  const spreadStr = (it.spread ?? []).join(', ');
  const [spread, setSpread] = useState(spreadStr);
  useEffect(() => { setPattern(it.pattern); setOrigin(it.origin); setWhy(it.why); setSpread((it.spread ?? []).join(', ')); }, [it.id, it.pattern, it.origin, it.why, spreadStr]);
  const spreadList = [...new Set(spread.split(/[\s,]+/).filter((x) => /^S\d+(#\d+)?\.[\w]+$/.test(x)))];
  const dirty = pattern !== it.pattern || origin !== it.origin || why !== it.why || spreadList.join(', ') !== spreadStr;
  return (
    <details className="small"><summary>고치기(패턴·근원·번진 곳·이유)</summary>
      <label>패턴<select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label>근원 단위<input value={origin} onChange={(e) => setOrigin(e.target.value)} /></label>
      <label>번진 곳(쉼표로 구분, 같은 오류가 실제로 옮겨진 단위만)<textarea rows={2} value={spread} onChange={(e) => setSpread(e.target.value)} /></label>
      <label>이유<textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></label>
      <button className="btn" disabled={!dirty} onClick={() => onSave({ pattern, origin, why, spread: spreadList })}>고친 것 저장</button>
    </details>
  );
}

function AddItem({ uid, text, onAdd, onClose }) {
  const [pattern, setPattern] = useState('기타');
  const [why, setWhy] = useState('');
  const [wrongText, setWrong] = useState('');
  const [ev, setEv] = useState('');
  const add = (grade) => onAdd({ grade, pattern, why, wrongText, originConfirmed: true, evidence: ev.split(/[\s,]+/).filter(Boolean).map((ref) => ({ ref, quote: '' })) });
  return (
    <div className="mark-editor" role="dialog" aria-label={`${uid} 장부에 추가`}>
      <p className="small"><b>{uid}</b> {text}</p>
      <label className="small">무엇이 틀렸나요?(필수, 한 문장)<textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="예: 원자료 D-p3은 「관심 있는 대학생」인데 3·4학년 모두에게 권함" /></label>
      <label className="small">틀린 구절(선택)<input value={wrongText} onChange={(e) => setWrong(e.target.value)} /></label>
      <label className="small">근거 원자료 문단(선택, 예: A-p3)<input value={ev} onChange={(e) => setEv(e.target.value)} /></label>
      <label className="small">패턴(모르면 기타)<select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></label>
      <p className="rv-q small">어느 등급으로 추가할까요?</p>
      <div className="rv-choices">
        {GRADES.map((g) => <button key={g.k} className="btn rv-choice" disabled={!why.trim()} onClick={() => add(g.k)}><b>{g.label}로 추가</b><span>{g.desc}</span></button>)}
        <button className="btn rv-choice" onClick={onClose}><b>닫기</b><span>추가하지 않음</span></button>
      </div>
    </div>
  );
}

/** 풀 때 그었는데 장부에 없는 빨간 줄: 한 번 눌러 장부에 추가 */
function MineCard({ m, text, triage, busy, onAdd, onSkip }) {
  const q = m.quote && text.includes(m.quote) ? m.quote : '';
  return (
    <section className="sheet review-item mine-card">
      <p className="li-head"><b>풀 때 그은 빨간 줄 {m.uid}</b>{m.origin ? ' · 처음 생긴 곳으로 표시함' : ''}{m.pattern ? ` · ${m.pattern}` : ''}</p>
      <blockquote className="rv-unit">{q ? <>{text.slice(0, text.indexOf(q))}<mark className="rv-wrong">{q}</mark>{text.slice(text.indexOf(q) + q.length)}</> : text}</blockquote>
      <p className="small"><b>그때 메모:</b> {m.note || '(메모 없음)'}</p>
      {triage && <p className="small muted">AI 1차 판정(사람 확인 전): {VERDICT_KO[triage.verdict]} — {triage.why}</p>}
      <h3 className="rv-q">이 칸은 장부에 없는 오류인가요?</h3>
      <div className="rv-choices">
        {GRADES.map((g) => <button key={g.k} className="btn rv-choice" disabled={busy} onClick={() => onAdd(g.k)}><b>{g.label}로 추가</b><span>{g.desc}</span></button>)}
        <button className="btn rv-choice" disabled={busy} onClick={onSkip}><b>오류 아님 · 넘기기</b><span>장부에 넣지 않음(이 브라우저에서 숨김)</span></button>
      </div>
    </section>
  );
}
export const VERDICT_KO = { grounded: '원자료 근거가 있는 지적', ungrounded: '원자료에서 근거를 찾지 못함', unclear: '판단이 어려움', same: '장부의 이유와 같은 문제', different: '장부의 이유와 다른 문제' };

/** 번진 곳: 두 감사가 함께 댄 칸과 한 감사만 댄 칸을 나눠 보이고, 한 번 눌러 줄이거나 더한다 */
function SpreadPick({ it, split, busy, onSave }) {
  const spread = it.spread ?? [];
  const both = split?.both ?? [];
  const one = (split?.one ?? []).filter((u) => spread.includes(u));
  const cand = [...new Set([...(it.spreadCandidates ?? []), ...(split?.one ?? [])])].filter((u) => !spread.includes(u));
  const origins = [...new Set(Object.values(it.byAudit ?? {}).map((b) => b.origin).filter(Boolean))];
  return (
    <div className="spread-pick small">
      <h3 className="rv-q">이 오류가 옮겨진 칸은 어디인가요? <span className="muted">(여기 그은 빨간 줄도 이 오류를 찾은 것으로 셉니다)</span></h3>
      {origins.length > 1 && <p className="notice">두 감사가 짚은 처음 생긴 곳이 다릅니다({origins.join(' / ')}). 서로 다른 오류가 하나로 묶였을 수 있으니 아래 「자세히」의 감사별 이유를 견줘 보세요.</p>}
      <p>지금 장부: {spread.length ? spread.join(', ') : '없음'} ({spread.length}칸)</p>
      {split && <p className="muted">그중 두 감사가 함께 댄 칸 {spread.filter((u) => both.includes(u)).length}개{one.length ? ` · 한 감사만 댄 칸 ${one.length}개(${one.join(', ')})` : ''}</p>}
      <div className="row-btns">
        {one.length > 0 && <button className="btn" disabled={busy} onClick={() => onSave(spread.filter((u) => !one.includes(u)), '번진 곳을 두 감사가 함께 댄 칸만 남김')}>두 감사가 함께 댄 칸만 남기기</button>}
        {spread.length > 0 && <button className="btn" disabled={busy} onClick={() => onSave([], '번진 곳 없음(처음 생긴 곳만)')}>옮겨진 칸 없음</button>}
      </div>
      {cand.length > 0 && <p>더할 수 있는 칸(한 감사만 댐): {cand.map((u) => <button key={u} className="btn small" disabled={busy} onClick={() => onSave([...spread, u], `번진 곳에 ${u} 더함`)}>+ {u}</button>)}</p>}
    </div>
  );
}

function ObjectionJudge({ o, canAccept = true, onDone }) {
  const [note, setNote] = useState('');
  const [pattern, setPattern] = useState('기타');
  const [msg, setMsg] = useState('');
  const auto = o.source === 'auto';
  const decide = async (accept, grade = 'A') => {
    const op = !accept ? null : o.kind === 'notError' ? { action: 'delete', item: o.item } : { action: 'add', origin: o.uid, grade, pattern, why: (o.triage?.note || o.reason).slice(0, 300), originConfirmed: false, evidence: (o.evidence ?? []).map((ref) => ({ ref, quote: o.triage?.evidence?.find((e) => e.ref === ref)?.quote ?? '' })) };
    try { const r = await api.reviewObjection(o.id, accept, note, op); setMsg(r.live ? '판정을 남겼습니다(팀장 모드 장부는 채점에 쓰지 않아 새 판은 만들지 않습니다)' : accept ? `받아들임 → 장부 ${r.newVersion}판` : '받아들이지 않음'); onDone?.(); } catch (e) { setMsg(e.message); }
  };
  return (
    <section className="sheet objection">
      <p className="li-head"><span className={`tag ${auto ? '' : 'tag-red'}`}>{auto ? 'AI 1차 판정 후보' : '사용자 이의'}</span> <b>{o.missionId ? `${o.missionId} · ` : ''}{o.uid}</b> <span className="mono small muted">{o.runId}</span></p>
      {o.unitText && <blockquote className="rv-unit">{o.unitText}</blockquote>}
      <p className="small"><b>{auto ? 'AI가 본 근거' : '이의 이유'}:</b> {o.reason}</p>
      {(o.triage?.evidence ?? []).filter((e) => e.found).map((e, i) => <p key={i} className="small muted">원자료 <b>{e.ref}</b> 「{e.quote}」</p>)}
      {!o.triage && (o.evidence ?? []).length > 0 && <p className="small muted">근거로 든 문단: {o.evidence.join(', ')}</p>}
      {o.itemsAt?.length > 0 && <p className="small muted">이 칸에 걸친 장부 항목: {o.itemsAt.map((x) => `${x.id}(${x.grade}, ${x.pattern})`).join(', ')}</p>}
      {msg ? <p className="small">{msg}</p> : !canAccept ? <p className="small notice">이 판은 장부를 먼저 검수해 확정해야 판정할 수 있습니다(받아들이면 확정 장부에 새 판을 만듭니다).</p> : o.kind === 'missing' ? (
        <>
          <h3 className="rv-q">이 칸은 장부에 없는 오류인가요?</h3>
          <label className="small">패턴(모르면 기타) <select value={pattern} onChange={(e) => setPattern(e.target.value)}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <div className="rv-choices">
            {GRADES.map((g) => <button key={g.k} className="btn rv-choice" onClick={() => decide(true, g.k)}><b>네, {g.label}</b><span>장부에 추가하고 새 판을 만듭니다</span></button>)}
            <button className="btn rv-choice" onClick={() => decide(false)}><b>아니요</b><span>장부를 그대로 둡니다</span></button>
          </div>
        </>
      ) : (
        <>
          <h3 className="rv-q">장부 항목 {o.item}은 오류가 아닌가요?</h3>
          <div className="rv-choices">
            <button className="btn rv-choice" onClick={() => decide(true)}><b>네, 오류가 아님</b><span>장부에서 빼고 새 판을 만듭니다</span></button>
            <button className="btn rv-choice" onClick={() => decide(false)}><b>아니요, 오류가 맞음</b><span>장부를 그대로 둡니다</span></button>
          </div>
        </>
      )}
      {!msg && canAccept && <label className="small">판정 이유(선택, 공개 수치와 이력에 남음)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>}
    </section>
  );
}

/** 짧은 연습(F4) 문항 확정: 틀린 문장 문항은 장부에서 자동, 「맞는 문장」 문항은 만든 사람이 하나씩 확정한다(정답표가 틀렸을 수 있는 문장을 「맞다」로 단정하지 않게) */
const DRILL_SKIP_DEFAULT = { 'S2.r4': 1, 'S3.i3': 1, 'S4.b2': 1, 'S5.n3': 1, 'S5.n1': 1 }; // 설계안 3.4: L1과 같은 조건을 뺐는데 장부에서 맞다고 본 문장(판단이 갈림)
function DrillConfirm({ runId }) {
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [okPick, setOkPick] = useState({}); // uid → { use, paras:[pid] }
  const [skipErr, setSkipErr] = useState({});
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    api.reviewDrill(runId).then((r) => {
      setC(r);
      const init = {};
      for (const o of r.candidates.ok) init[o.uid] = { use: !DRILL_SKIP_DEFAULT[o.uid], paras: (o.suggest ?? []).slice(0, 1).map((x) => x.pid) };
      setOkPick(init);
    }).catch((e) => setError(e.message));
  }, [runId]);
  if (error) return <section className="sheet"><h3 className="rv-q">짧은 연습 문항 확정</h3><p className="error">{error}</p></section>;
  if (!c) return null;
  const set = (uid, f) => setOkPick({ ...okPick, [uid]: { ...okPick[uid], ...f } });
  const okN = Object.values(okPick).filter((x) => x.use && x.paras.length).length;
  const errN = c.candidates.error.filter((e) => !skipErr[e.uid]).length;
  const save = async () => {
    try {
      const r = await api.reviewDrillSave(runId, {
        ledgerVersion: c.ledgerVersion,
        ok: Object.entries(okPick).filter(([, x]) => x.use && x.paras.length).map(([uid, x]) => ({ uid, paras: x.paras.slice(0, 2) })),
        skipError: Object.keys(skipErr).filter((u) => skipErr[u]),
        skip: Object.entries(okPick).filter(([, x]) => !x.use).map(([uid]) => ({ uid, reason: DRILL_SKIP_DEFAULT[uid] ? '같은 조건을 뺀 문장인데 장부에서 맞다고 봄(판단이 갈림)' : '만든 사람이 뺌' })),
      });
      setSaved(r.drillset);
    } catch (e) { setError(e.message); }
  };
  const last = c.drillsets?.at?.(-1);
  return (
    <section className="sheet" aria-label="짧은 연습 문항 확정">
      <h3 className="rv-q">짧은 연습 문항을 확정할까요?</h3>
      <p className="small">틀린 문장 {c.candidates.error.length}개는 장부에서 자동으로 문항이 됩니다. 아래 「맞는 문장」 후보 {c.candidates.ok.length}개는 학생에게 「이 문장은 맞다」고 알려 주게 되므로, 하나씩 보고 낼지 정해 주세요. 판단이 갈리는 5개(설계안 3.4)는 미리 빼 두었습니다. 감사 표시는 감사 모델이 짚었다가 사람 검수에서 지운 흔적이니, 읽어 보고 정하세요.{last ? ` 지금 세트: ${last.version}판(${last.questions?.length ?? '?'}문항).` : ' 아직 확정한 세트가 없습니다.'}</p>
      <ol className="rv-later-list" style={{ listStyle: 'decimal', paddingLeft: '1.4em' }}>
        {c.candidates.ok.map((o) => {
          const x = okPick[o.uid] ?? { use: false, paras: [] };
          const flagged = o.flags?.audits?.length ? o.flags.audits.map((a) => `${a.company} ${a.as}${a.grade ? ` ${a.grade}` : ''}`).join(', ') : '';
          return (
            <li key={o.uid} style={{ marginBottom: 10 }}>
              <p className="rv-unit" style={{ margin: '4px 0' }}><span className="mono">{o.uid}</span> {o.text}</p>
              {flagged && <p className="small" style={{ color: 'var(--amber)' }}>감사 표시: {flagged}{o.flags.audits[0]?.why ? ` — ${o.flags.audits[0].why}` : ''}</p>}
              {DRILL_SKIP_DEFAULT[o.uid] && <p className="small" style={{ color: 'var(--amber)' }}>설계안 3.4에서 빼자고 한 문장(L1과 같은 조건을 뺌)</p>}
              <div className="row-btns">
                <button className={`btn small ${x.use ? 'on' : ''}`} onClick={() => set(o.uid, { use: true })}>맞는 문장으로 냄</button>
                <button className={`btn small ${!x.use ? 'on' : ''}`} onClick={() => set(o.uid, { use: false })}>빼기</button>
              </div>
              {x.use && <p className="small">함께 보여 줄 원자료 문단(1~2개): {(o.suggest ?? []).map((sg) => (
                <label key={sg.pid} className="chk"><input type="checkbox" checked={x.paras.includes(sg.pid)} onChange={(e) => set(o.uid, { paras: e.target.checked ? [...x.paras, sg.pid].slice(-2) : x.paras.filter((p) => p !== sg.pid) })} /> {sg.pid}</label>
              ))}</p>}
            </li>
          );
        })}
      </ol>
      <details className="small"><summary>틀린 문장 문항 {c.candidates.error.length}개(자동, 뺄 것만 고르기)</summary>
        <ul>{c.candidates.error.map((e) => <li key={e.uid}><label className="chk"><input type="checkbox" checked={!skipErr[e.uid]} onChange={(ev) => setSkipErr({ ...skipErr, [e.uid]: !ev.target.checked })} /> <span className="mono">{e.uid}</span> {e.text}</label></li>)}</ul>
      </details>
      <p className="row-btns"><button className="btn btn-primary" onClick={save} disabled={!!saved}>이대로 확정(틀린 문장 {errN} + 맞는 문장 {okN} = {errN + okN}문항)</button></p>
      {saved && <p className="small">확정했습니다: 세트 {saved.version}판 · {saved.n}문항(틀린 {saved.error}, 맞는 {saved.ok}) · 장부 {saved.ledgerVersion}판 기준. 이제 이 판을 결재한 기기에서 짧은 연습이 열립니다.</p>}
    </section>
  );
}
