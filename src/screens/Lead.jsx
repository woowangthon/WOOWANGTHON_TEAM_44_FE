// 팀장 모드: 일 나누기(블록) → 단계마다 지시 → AI 동료가 실제로 작업 → 원자료와 대조·승인/반려(재작업 1회) → 서명 → 다른 회사 두 감사 → 결과
// 결과는 「AI 감사(두 회사) · 사람 확인 전」이고 점수가 아니라 결과 지표만 보여 준다.
import { useEffect, useRef, useState } from 'react';
import { api, modelName } from '../api.js';
import { SourcePanel, SourceDock, StageBlock, inputsKo } from '../ui/work.jsx';
import { Objection } from './Result.jsx';

const KIND_KO = { list: '목록', table: '표', sentences: '문장', report: '보고', lines: '짧은 줄', check: '확인(원자료 대조)' };
const FATE = { final: '최종본에 남음', earlier: '앞 단계에만 있음', blocked: '반려로 막음', remained: '반려했지만 비슷한 문장이 남음' };
// 지시 습관 점검(서버 lead.js habits()와 같은 규칙). 점수가 아니라 쓰는 동안 보는 체크리스트
const HABITS = [
  ['sourcesToLater', '뒤 단계에도 원자료를 넘김', (plan) => plan.slice(1).some((p) => p.inputs.includes('sources'))],
  ['evidence', '근거(출처) 표시를 요구함', (_, all) => /근거|출처|\[[A-F]\]|문단|어디서/.test(all)],
  ['verbatim', '숫자·조건을 원문 표기대로 옮기라고 함', (_, all) => /원문|그대로|표기|바꾸지/.test(all)],
  ['date', '오늘·게시일 기준을 알려 줌', (_, all) => /오늘|날짜|기준일|게시|올리는 날|11월\s?1[0-9]일/.test(all)],
  ['unknown', '자료에 없으면 「확인 필요」로 두라고 함', (_, all) => /확인 필요|모르면|없으면|추측|지어내|없는 내용/.test(all)],
  ['checkStage', '확인 단계를 넣음', (plan) => plan.some((p) => p.kind === 'check')],
];
const STYLE_KO = { base: '기본(단계로 나눴지만 뒤 단계는 앞 결과만 받음)', rough: '대충(한 번에 맡김)', careful: '잘 맡김(모든 단계에 원자료 + 습관 지시)' };

export default function Lead({ missionId }) {
  const [m, setM] = useState(null);
  const [docs, setDocs] = useState(null);
  const [plan, setPlan] = useState(null);
  const [company, setCompany] = useState('');
  const [s, setS] = useState(null); // 서버 상태
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [sign, setSign] = useState({ checked: '', unchecked: '' });
  const views = useRef(0);

  useEffect(() => {
    api.missions().then(async (d) => {
      const mm = d.missions.find((x) => x.id === missionId);
      if (!mm) { setError('없는 미션'); return; }
      setM(mm);
      setPlan(mm.stages.map((st) => ({ kind: st.kind, name: st.name, inputs: st.key === 'S1' ? ['sources', 'brief'] : [`S${Number(st.key.slice(1)) - 1}`], instruction: '' })));
      api.mission(missionId).then((r) => setDocs(r.docs));
    }).catch((e) => setError(e.message));
  }, [missionId]);

  const call = async (label, fn) => {
    setBusy(label); setError('');
    try { const r = await fn(); setS(r); return r; } catch (e) { setError(e.message); return null; } finally { setBusy(''); }
  };
  // 서명 뒤 감사를 끝날 때까지 하나씩 부른다(한 요청에 감사 하나)
  useEffect(() => {
    if (s?.phase === 'audit' && !busy && !error) call('감사 중', () => api.lead('audit', { id: s.id }));
  }, [s?.phase, s?.auditsDone?.length, busy, error]);

  if (error && !m) return <main><p className="error">{error}</p></main>;
  if (!m || !plan) return <main><p className="muted">불러오는 중…</p></main>;
  const pv = () => { const n = views.current; views.current = 0; return n; };

  // ---------- 1·2 일 나누기와 지시 ----------
  if (!s) {
    const keys = plan.map((_, i) => `S${i + 1}`);
    const set = (i, f) => setPlan(plan.map((p, j) => (j === i ? { ...p, ...f } : p)));
    const toggle = (i, x) => set(i, { inputs: plan[i].inputs.includes(x) ? plan[i].inputs.filter((y) => y !== x) : [...plan[i].inputs, x] });
    const ready = plan.every((p) => p.instruction.trim() && p.inputs.length);
    const all = plan.map((p) => p.instruction).join('\n');
    const base = (i) => m.stages[i]?.instruction ?? '';
    const fillBase = () => setPlan(plan.map((p, i) => (p.instruction.trim() ? p : { ...p, instruction: base(i) || p.instruction })));
    return (
      <main className="lead">
        <h1>{m.title} · 맡기기</h1>
        <p className="brief">{m.brief}</p>
        <p className="small">1) 일을 단계로 나누고 단계마다 무엇을 넘길지 고릅니다. 2) 단계마다 지시를 씁니다. 3) AI 동료가 실제로 일하면 결과를 원자료와 대조해 승인하거나 반려합니다(단계마다 재작업 1번). 4) 최종본에 서명하면 작업 기록을 처음 보는 다른 회사 모델 두 개가 감사합니다. 한 곳이 시간 안에 끝나지 않으면 끝난 감사만 반영하고 그렇게 표시합니다.</p>
        <section className="todo-card" aria-label="지시 습관 점검">
          <h2 className="todo-title">지시 습관 점검 <span className="small muted" style={{ fontWeight: 400 }}>쓰는 동안 바뀝니다 · 점수 아님</span></h2>
          <ul className="habits" style={{ margin: '4px 0 8px', columns: 2 }}>{HABITS.map(([k, label, f]) => { const ok = f(plan, all); return <li key={k} className={ok ? 'ok' : 'no'}>{ok ? '○' : '×'} {label}</li>; })}</ul>
          <p className="row-btns" style={{ margin: 0 }}><button type="button" className="btn small" onClick={fillBase}>빈 단계를 기본 지시로 채우기</button><span className="small muted" style={{ alignSelf: 'center' }}>기본 지시는 고정 판을 만들 때 쓴 지시입니다. 그대로 두면 고정 판과 비슷한 오류가 날 수 있습니다. 고쳐 써 보세요.</span></p>
        </section>
        <div className="work-grid">
          <SourceDock onOpen={() => { views.current++; }}>{docs ? <SourcePanel docs={docs} onView={() => { views.current++; }} /> : <p className="muted small">원자료 불러오는 중…</p>}</SourceDock>
          <div>
            {plan.map((p, i) => (
              <section key={i} className="stage plan-block">
                <header className="stage-head">
                  <span className="stage-key">{keys[i]}</span>
                  <select value={p.kind} onChange={(e) => set(i, { kind: e.target.value })} aria-label="블록 종류">{Object.entries(KIND_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input className="plan-name" value={p.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="단계 이름" maxLength={20} />
                  <button className="btn small" disabled={plan.length <= 2} onClick={() => setPlan(plan.filter((_, j) => j !== i).map((q) => ({ ...q, inputs: q.inputs.filter((x) => !/^S\d/.test(x) || Number(x.slice(1)) <= plan.length - 1) })))}>빼기</button>
                </header>
                <p className="small">받을 것: {['sources', 'brief', ...keys.slice(0, i)].map((x) => (
                  <label key={x} className="chk"><input type="checkbox" checked={p.inputs.includes(x)} onChange={() => toggle(i, x)} /> {inputsKo([x])}</label>
                ))}</p>
                <textarea rows={3} value={p.instruction} maxLength={1500} onChange={(e) => set(i, { instruction: e.target.value })} placeholder={`${keys[i]}에서 AI 동료에게 시킬 일`} aria-label={`${keys[i]} 지시`} />
                {i < plan.length - 1 && plan.length < 7 && <button className="btn small" onClick={() => setPlan([...plan.slice(0, i + 1), { kind: 'check', name: '확인', inputs: ['sources', `S${i + 1}`], instruction: '' }, ...plan.slice(i + 1)])}>여기 뒤에 확인 단계 넣기</button>}
              </section>
            ))}
            <p className="small"><label htmlFor="worker-co">작업 모델:</label> <select id="worker-co" value={company} onChange={(e) => setCompany(e.target.value)}><option value="">무작위(회사 셋 가운데)</option><option>Anthropic</option><option>OpenAI</option><option>Google</option></select> · 감사는 작업 모델과 다른 회사 둘이 합니다. 하루 2번까지(기기별).</p>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={!ready || !!busy} onClick={() => call('시작', () => api.lead('start', { missionId, plan, workerCompany: company || undefined }))}>{busy || '맡기기 시작'}</button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- 3 실행·대조 / 4 서명 / 5·6 감사·결과 ----------
  const cur = s.plan[s.cursor];
  return (
    <main className="lead">
      <p className="band">작업 모델 <b>{modelName(s.worker)}</b>({s.workerCompany}) · 감사 {s.auditors.map(modelName).join(', ')} · {s.label}</p>
      <h1>{m.title}</h1>
      <div className="work-grid">
        <SourceDock onOpen={() => { views.current++; }}>{docs && <SourcePanel docs={docs} onView={() => { views.current++; }} />}</SourceDock>
        <div>
          {s.stages.map((st) => <StageBlock key={st.key} stage={{ ...st, inputs: s.plan.find((p) => p.key === st.key)?.inputs ?? [], instruction: '' }} />)}
          {s.phase === 'work' && (
            <section className="sheet">
              <h2>{cur.key} {cur.name} <span className="small muted">받을 것: {inputsKo(cur.inputs)}</span></h2>
              {!s.pending?.units && <button className="btn btn-primary" disabled={!!busy} onClick={() => call('작업 중', () => api.lead('stage', { id: s.id }))}>{busy || (s.pending?.rejected ? '반려 사유를 붙여 다시 시키기' : `${cur.key} 시키기`)}</button>}
              {busy && <p className="small muted">AI 동료가 일하는 중입니다(실제 호출, 보통 10~40초).</p>}
              {s.pending?.units && (
                <>
                  <StageBlock stage={{ key: cur.key, name: `${cur.name}${s.pending.attempt === 2 ? '(다시 한 결과)' : ''}`, kind: cur.kind, inputs: cur.inputs, instruction: '', units: s.pending.units }} />
                  <p className="small">원자료와 대조해 보고 판단합니다. 반려는 단계마다 한 번입니다.</p>
                  {s.pending.attempt < 2 && <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="반려 사유(무엇이 원자료와 다른지, 어떻게 고칠지)" aria-label="반려 사유" />}
                  <div className="row-btns">
                    <button className="btn btn-primary" disabled={!!busy} onClick={() => call('', () => api.lead('verdict', { id: s.id, verdict: 'ok', sourceViews: pv() }))}>승인하고 다음</button>
                    {s.pending.attempt < 2 && <button className="btn" disabled={!!busy || reason.trim().length < 4} onClick={async () => { await call('', () => api.lead('verdict', { id: s.id, verdict: 'reject', reason, sourceViews: pv() })); setReason(''); }}>반려</button>}
                  </div>
                </>
              )}
            </section>
          )}
          {s.phase === 'sign' && (
            <section className="sheet">
              <h2>최종본 서명</h2>
              <label className="small">확인한 것<textarea rows={2} value={sign.checked} onChange={(e) => setSign({ ...sign, checked: e.target.value })} /></label>
              <label className="small">확인하지 못한 것(솔직하게)<textarea rows={2} value={sign.unchecked} onChange={(e) => setSign({ ...sign, unchecked: e.target.value })} /></label>
              <button className="btn btn-primary" disabled={!!busy} onClick={() => call('', () => api.lead('signoff', { id: s.id, ...sign, sourceViews: pv() }))}>서명하고 감사 맡기기</button>
            </section>
          )}
          {s.phase === 'audit' && (
            <section className="sheet">
              <h2>독립 감사 중</h2>
              <p>작업 기록을 처음 보는 감사관이 원자료와 단계별 산출물만 받아 읽고 있습니다.</p>
              <ul>{s.auditors.map((a) => { const d = s.auditsDone.find((x) => x.model === a); return <li key={a}>{modelName(a)}: {d ? `끝(${d.count}항목, ${d.sec}초)` : '읽는 중…'}</li>; })}</ul>
              {s.auditErrors?.length > 0 && <p className="small error">{s.auditErrors.join(' / ')}</p>}
            </section>
          )}
          {error && <p className="error">{error} {s.phase === 'audit' && <button className="btn" onClick={() => setError('')}>다시 시도</button>}</p>}
          {s.phase === 'done' && <LeadResult s={s} />}
        </div>
      </div>
    </main>
  );
}

function LeadResult({ s }) {
  const r = s.result;
  const L = s.ledger;
  const [ob, setOb] = useState(null);
  const inL = (uid) => L.items.some((x) => [x.origin, ...(x.spread ?? [])].includes(uid));
  const review = Object.fromEntries(L.items.flatMap((x) => [x.origin, ...(x.spread ?? [])].map((u) => [u, x.grade === 'A' ? 'missA' : 'bc'])));
  const A = L.items.filter((x) => x.grade === 'A');
  const myFinal = r.counts.Afinal;
  return (
    <section className="sheet lead-result">
      <p className="band"><span className="ltag ltag-ai">{s.label}</span> 감사 {r.auditors.map((a) => `${modelName(a.model)} ${a.count}항목`).join(', ')}. 틀렸다고 생각하면 아래에서 이의를 제기할 수 있습니다.</p>
      {r.auditErrors?.length > 0 && <p className="notice">감사 {r.auditErrors.length}곳이 끝나지 않아 {r.auditors.length}곳의 감사만 반영했습니다({r.auditErrors.map((e) => { const [c, rest = ''] = e.split(':'); return `${c} 감사 ${rest.trim().split(' (')[0] || '응답 실패'}`; }).join(', ')}). 같은 미션의 기준 판(감사 여러 곳)과 바로 견주기 어렵습니다.</p>}
      <div className="score-row">
        <div className="score-box"><b>{myFinal}</b><span>최종본에 남은 A</span></div>
        <div className="score-box"><b>{r.blocked}</b><span>반려로 막은 A{r.remainedAfterReject ? ` · 반려했지만 비슷한 문장이 남은 A ${r.remainedAfterReject}` : ''}</span></div>
        <div className="score-box"><b>{r.humanMatchedA}</b><span>A 중 사람이 확인한 오류와 같은 것</span></div>
        <div className="score-box"><b>{r.sourceViews}</b><span>원자료를 열어 본 횟수</span></div>
        <div className="score-box"><b>{r.calls}번 · {r.minutes}분</b><span>호출·시간</span></div>
      </div>
      <p className="small muted">반려로 막음은 글자 비교 기준입니다. 반려된 결과에서 감사가 짚은 틀린 구절이 다시 한 결과에 비슷하게(글자쌍 70% 이상) 남지 않았으면 막은 것으로 셉니다. 말을 바꿔 남은 오류는 막은 것으로 셀 수 있습니다.</p>
      <h3>같은 미션, 다른 맡기기 방식과 견주기</h3>
      <table className="eval-table">
        <thead><tr><th>맡긴 방식</th><th>판 수</th><th>최종본 A 평균</th></tr></thead>
        <tbody>
          {Object.entries(r.baseline).map(([k, b]) => <tr key={k}><td>{STYLE_KO[k] ?? k}</td><td>{b.n}</td><td>{b.meanAfinal}</td></tr>)}
          <tr className="row-warn"><td><b>내 판</b></td><td>1</td><td>{myFinal}</td></tr>
        </tbody>
      </table>
      <p className="small muted">한 판은 운이 섞입니다. 기준은 같은 미션을 여러 번 돌린 평균입니다(AI 감사 기준, 사람 검수한 판은 검수 장부 기준). 한 번에 맡긴 판은 단계가 2개라 오류가 날 칸 자체가 적습니다. 판 수가 적어 방식 사이의 차이는 아직 결론이 아닙니다.</p>
      <h3>내 지시에 있던 것과 없던 것</h3>
      <ul className="habits">{Object.values(r.habits).map((h) => <li key={h.label} className={h.ok ? 'ok' : 'no'}>{h.ok ? '○' : '×'} {h.label}</li>)}</ul>
      <h3>A등급 {A.length}개</h3>
      <ol className="ledger-list">
        {A.map((it) => (
          <li key={it.id} className={it.fate === 'blocked' ? 'found' : 'missed'}>
            <p className="li-head"><span className={`tag ${it.fate === 'blocked' ? '' : 'tag-red'}`}>{FATE[it.fate] ?? ''}</span> <b>{it.pattern}</b> · 처음 생긴 곳 {it.origin}{it.spread.length ? ` → ${it.spread.join(' → ')}` : ''}{it.matchesHuman ? ' · 사람이 확인한 오류와 같음' : ''}</p>
            <p>「{it.wrongText}」 — {it.why}</p>
            {it.prevent && <p className="small"><b>막는 지시:</b> {it.prevent}</p>}
            <p className="small muted">판정: {Object.entries(it.byAudit).map(([c, b]) => `${c} ${b.grade}`).join(', ')}</p>
          </li>
        ))}
      </ol>
      <details><summary>B·C {L.items.length - A.length}개</summary><ul>{L.items.filter((x) => x.grade !== 'A').map((it) => <li key={it.id}>{it.grade} {it.pattern} · {it.origin} — {it.why}</li>)}</ul></details>
      <h3>감사가 틀렸다고 생각하면</h3>
      <p className="small">이 장부는 AI 감사만 본 것입니다. 아래 칸을 눌러 「장부에 없는 오류다」 또는 「오류가 아니다」를 근거와 함께 보낼 수 있습니다. 만든 사람이 원자료와 대조해 판정합니다. 빨강 = 감사가 본 A, 노랑 = B·C.</p>
      <div className="work-main">{[...s.stages].reverse().map((st) => <StageBlock key={st.key} stage={{ ...st, inputs: s.plan.find((p) => p.key === st.key)?.inputs ?? [], instruction: '' }} review={review} onPick={(uid) => setOb({ uid, kind: inL(uid) ? 'notError' : 'missing' })} />)}</div>
      {ob && <Objection runId={s.id} answerId={null} ob={ob} items={L.items} onClose={() => setOb(null)} />}
    </section>
  );
}
