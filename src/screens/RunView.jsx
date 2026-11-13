// 사수 모드: AI 동료가 실제로 끝낸 여러 단계 업무의 작업 기록을 검수한다.
// 단위를 눌러 빨간 줄(패턴·근원·메모) → 승인/반려 → 결과(사람 검수 장부의 A등급으로 채점)
import { useEffect, useRef, useState } from 'react';
import { api, myAnswers, isMaker, modelName, fmtDate } from '../api.js';
import { DocHead, LedgerTag } from '../ui/doc.jsx';
import { SourcePanel, SourceDock, StageBlock, MarkEditor } from '../ui/work.jsx';
import Result from './Result.jsx';

// 풀던 상태(빨간 줄·결재·시작 시각)를 이 기기에 임시로 둔다. 새로고침해도 이어서 풀 수 있게. 제출하면 지운다.
const draftKey = (id) => `redline:draft:${id}`;
const loadDraft = (id) => { try { return JSON.parse(localStorage.getItem(draftKey(id)) || 'null'); } catch { return null; } };
const saveDraft = (id, d) => { try { localStorage.setItem(draftKey(id), JSON.stringify(d)); } catch { /* 저장 못 해도 풀이는 계속 */ } };
const dropDraft = (id) => { try { localStorage.removeItem(draftKey(id)); } catch { /* 무시 */ } };

export default function RunView({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [marks, setMarks] = useState({});
  const [editing, setEditing] = useState(null);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null); // { answerId, result?, ledger?, pending? }
  const views = useRef(0);
  const [, bump] = useState(0); // 원자료를 열 때 화면 숫자도 바로 바뀌게
  const t0 = useRef(Date.now());
  const maker = isMaker();

  useEffect(() => {
    setData(null); setError(''); setDone(null);
    const d = loadDraft(id);
    setMarks(d?.marks ?? {}); setDecision(d?.decision ?? ''); setReason(d?.reason ?? '');
    t0.current = d?.t0 ?? Date.now(); views.current = d?.views ?? 0;
    api.run(id).then((d) => {
      setData(d);
      const prev = myAnswers.all()[id];
      if (prev) api.result(prev).then((r) => setDone({ answerId: prev, ...r })).catch(() => {});
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!data || done) return;
    saveDraft(id, { marks, decision, reason, t0: t0.current, views: views.current });
  }, [id, data, done, marks, decision, reason]);

  if (error) return <main><p className="error">{error}</p><a href="#/">미션 목록으로</a></main>;
  if (!data) return <main><p className="muted">작업 기록을 불러오는 중…</p></main>;
  const { meta, mission, docs, stages } = data;
  if (done && !done.pending && done.result) return <Result run={data} done={done} />;

  const notes = Object.fromEntries(Object.entries(marks).filter(([, m]) => m.note).map(([u, m]) => [u, m.note]));
  const unitText = (uid) => stages.flatMap((s) => s.units).find((u) => u.uid === uid)?.text ?? '';
  const playable = meta.playable || maker;
  const submit = async () => {
    setSending(true); setError('');
    try {
      const r = await api.answer({ runId: id, marks: Object.entries(marks).map(([uid, m]) => ({ uid, ...m })), decision, reason, elapsedSec: (Date.now() - t0.current) / 1000, sourceViews: views.current });
      myAnswers.set(id, r.answerId);
      dropDraft(id);
      setDone({ ...r, answer: { marks: Object.entries(marks).map(([uid, m]) => ({ uid, ...m })), sourceViews: views.current } });
      window.scrollTo(0, 0);
    } catch (e) { setError(e.message); } finally { setSending(false); }
  };

  return (
    <main className="run">
      <p className="band">
        이 작업 기록은 {fmtDate(meta.at)} <b>{modelName(meta.worker)}</b>({meta.company})가 실제로 수행한 결과입니다. 결과물은 손대지 않았습니다.
        {meta.of > 1 ? ` 같은 미션을 ${meta.of}번 돌린 판 가운데 하나입니다.` : ''} <LedgerTag status={meta.ledger.status} version={meta.ledger.version} />
      </p>
      {done?.pending && <p className="notice">{done.message} <a href="#/review">검수 화면으로</a></p>}
      <div className="sheet">
        <DocHead id={id} title={mission.title} by={`오늘 ${mission.today} · 원자료 ${Object.keys(docs).length}건 · 단계 ${stages.length}개`} drafter="AI 동료" review={null} />
        <p className="brief">{mission.brief}</p>
        <p className="small muted">
          할 일: 최종본(마지막 두 단계)을 원자료와 대조해 틀린 칸에 빨간 줄을 긋고, 이대로 내보내도 되는지 결재합니다.
          틀린 곳이 없을 수도 있습니다. 앞 단계를 펼쳐 오류가 처음 생긴 곳을 짚으면 「멈췄어야 할 곳」을 맞힌 것입니다.
        </p>
        <div className="work-grid">
          <SourceDock onOpen={() => { views.current++; bump((x) => x + 1); }}><SourcePanel docs={docs} onView={() => { views.current++; bump((x) => x + 1); }} /></SourceDock>
          <div className="work-main">
            {/* 최종본(마지막 두 단계)부터 읽고, 이상한 곳이 있을 때만 앞 단계를 펼쳐 거슬러 올라간다. 팀장이 결과를 검토하는 순서와 같다 */}
            {(() => {
              const block = (s) => <StageBlock key={s.key} stage={s} marks={marks} onPick={playable && !done ? (uid, quote) => setEditing({ uid, quote }) : undefined} notes={notes} />;
              const finals = stages.slice(-2).reverse();
              const earlier = stages.slice(0, -2).reverse();
              return (<>
                <p className="read-guide small">최종본부터 보여 드립니다. 원자료와 다른 곳이 보이면 아래 앞 단계를 펼쳐 그 내용이 처음 생긴 곳을 찾으세요.</p>
                {finals.map(block)}
                <h3 className="earlier-title">앞 단계 <span className="small muted">거슬러 올라가며 확인</span></h3>
                {earlier.map((s) => {
                  const n = s.units.filter((u) => marks[u.uid]).length;
                  return (
                    <details key={s.key} className="earlier-stage">
                      <summary><b>{s.key}</b> {s.name} <span className="small muted">· 단위 {s.units.length}개{n ? ` · 빨간 줄 ${n}` : ''}</span></summary>
                      {block(s)}
                    </details>
                  );
                })}
              </>);
            })()}
          </div>
        </div>
      </div>

      {editing && (
        <MarkEditor key={`${editing.uid}:${editing.quote}`} uid={editing.uid} quote={editing.quote} text={unitText(editing.uid)} mark={marks[editing.uid]}
          onSave={(m) => { setMarks({ ...marks, [editing.uid]: m }); setEditing(null); window.getSelection()?.removeAllRanges(); }}
          onRemove={() => { const n = { ...marks }; delete n[editing.uid]; setMarks(n); setEditing(null); }}
          onClose={() => setEditing(null)} />
      )}

      {!done && (
        <section className="decision sheet" aria-label="결재">
          <p className="decision-q">빨간 줄 {Object.keys(marks).length}개 · 원자료를 열어 본 횟수 {views.current}번. 최종본을 이대로 내보내도 됩니까?</p>
          {!playable && <p className="error">이 판은 아직 사람 검수 전이라 채점할 수 없습니다.</p>}
          <div className="decision-btns">
            <button className={`btn stamp-btn stamp-btn-ok ${decision === 'approve' ? 'on' : ''}`} onClick={() => setDecision('approve')} disabled={!playable}>승인</button>
            <button className={`btn stamp-btn stamp-btn-no ${decision === 'reject' ? 'on' : ''}`} onClick={() => setDecision('reject')} disabled={!playable}>반려</button>
          </div>
          {decision === 'reject' && (
            <label className="small">반려 사유(AI 동료에게 돌려보낼 말)
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="예: S2 판정표에서 하이테크과정 나이 조건이 원자료와 다릅니다. 원자료 A를 다시 대조해 고쳐 주세요." />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={!decision || sending || (decision === 'reject' && reason.trim().length < 4)} onClick={submit}>{sending ? '보내는 중…' : '결재하고 결과 보기'}</button>
        </section>
      )}
    </main>
  );
}
