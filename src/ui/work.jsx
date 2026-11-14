// 작업 기록 보기 부품: 원자료 패널, 단계별 산출물(단위마다 누를 수 있음), 표시 편집
import { useEffect, useRef, useState } from 'react';

/** 떠 있는 창: 열리면 첫 입력·버튼으로 초점, Esc로 닫기, 닫으면 원래 자리로 초점 */
export function useDialog(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const back = document.activeElement;
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    const on = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    window.addEventListener('keydown', on);
    return () => { window.removeEventListener('keydown', on); if (back && document.contains(back)) back.focus?.(); };
  }, []);
  return ref;
}

export const PATTERNS = ['한정어·조건 탈락', '근거보다 큰 결론', '원자료에 없는 내용', '단위·기준 시점 혼동', '날짜·기간 오류', '숫자·계산 틀림', '방향·주체 바뀜', '지시 누락', '중요 정보 누락', '원자료에 없는 인용', '기타'];
const INPUT_KO = { sources: '원자료', brief: '팀장 지시' };
export const inputsKo = (inputs) => inputs.map((x) => INPUT_KO[x] ?? x).join(' · ');

/** 원자료 칸: 넓은 화면은 왼쪽에 붙어 있고, 휴대폰 폭(820px 이하)은 「원자료 보기」로 아래에서 올라오는 서랍이 된다(작업 기록이 먼저 보이게).
 *  openKey가 바뀌면 연다(결과 화면에서 근거 칸을 눌렀을 때). onOpen은 서랍을 열 때 불린다(원자료 대조 횟수) */
export function SourceDock({ children, openKey, onOpen }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (openKey) setOpen(true); }, [openKey]);
  useEffect(() => {
    if (!open) return;
    const on = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open]);
  return (<>
    <aside id="src-dock" className={`work-src ${open ? 'open' : ''}`}>
      <div className="src-dock-head"><b>원자료</b><button className="btn" onClick={() => setOpen(false)}>닫기</button></div>
      {children}
    </aside>
    <button className="btn btn-primary src-toggle" aria-expanded={open} aria-controls="src-dock" onClick={() => { if (!open) onOpen?.(); setOpen(!open); }}>원자료 보기</button>
  </>);
}

/** 원자료 패널. onView는 문서를 열거나 문단을 누를 때마다 불린다(원자료 대조 횟수) */
export function SourcePanel({ docs, highlight = [], onView, compact }) {
  const keys = Object.keys(docs);
  const first = highlight[0]?.split('-')[0];
  const [tab, setTab] = useState(first && docs[first] ? first : keys[0]);
  const d = docs[tab];
  const hl = new Set(highlight);
  return (
    <section className={`src-panel ${compact ? 'src-compact' : ''}`} aria-label="원자료">
      <div className="src-tabs" role="tablist">
        {keys.map((k) => (
          <button key={k} role="tab" aria-selected={k === tab} className={k === tab ? 'on' : ''} onClick={() => { setTab(k); onView?.(); }} title={docs[k].title} aria-label={`원자료 ${k}: ${docs[k].title}`}>
            {k}
          </button>
        ))}
      </div>
      <h3 className="src-title">[{d.key}] {d.title}</h3>
      <ol className="src-paras">
        {d.paragraphs.map((p) => (
          <li key={p.pid} id={`p-${p.pid}`} className={hl.has(p.pid) ? 'hl' : ''} onClick={() => onView?.()}>
            <span className="pid">{p.pid}</span>
            <span className="p-text">{p.text}</span>
          </li>
        ))}
      </ol>
      <p className="src-meta small muted">
        {d.publisher} · <a href={d.url} target="_blank" rel="noreferrer">원문</a> · {String(d.license ?? '').split('.')[0]}
      </p>
    </section>
  );
}

/** 단위 하나의 상태 표시용 클래스 */
const cls = (uid, marks, review, text) => {
  const c = [];
  // 구절을 골라 그은 줄은 그 구절에만 긋는다. 구절이 없거나 문장에서 못 찾으면 문장 전체
  if (marks?.[uid]) c.push(phraseOf(marks[uid], text) ? 'marked-phrase' : 'marked');
  if (review?.[uid]) c.push(`rv-${review[uid]}`);
  return c.join(' ');
};

import { phraseOf, cleanPicked } from './phrase.js';
/** 글 안에서 고른 구절만 빨간 줄로 */
const withPhrase = (text, q) => {
  if (!q || !text.includes(q)) return text;
  const i = text.indexOf(q);
  return <>{text.slice(0, i)}<span className="phrase-mark">{q}</span>{text.slice(i + q.length)}</>;
};
/** 드래그로 고른 글자: 시작한 칸(data-uid) 안의 부분만(2자 이상). { uid, quote } 또는 null */
const pickedPhrase = (root) => {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!sel || sel.isCollapsed || !root || !root.contains(sel.anchorNode)) return null;
  const el = (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('[data-uid]');
  if (!el || !root.contains(el)) return null;
  const r = sel.getRangeAt(0).cloneRange();
  // 칸을 넘어 끌었으면 시작한 칸 안으로 자른다
  if (!el.contains(r.startContainer)) r.setStart(el, 0);
  if (!el.contains(r.endContainer)) r.setEnd(el, el.childNodes.length);
  const t = cleanPicked(r.toString(), el.querySelector('.unit-note')?.textContent ?? '');
  return t ? { uid: el.dataset.uid, quote: t } : null;
};
const hasSelection = () => { const sel = typeof window !== 'undefined' ? window.getSelection() : null; return !!sel && !sel.isCollapsed; };

/**
 * 단계 하나. units를 종류에 맞게 그린다. onPick(uid)가 있으면 단위를 누를 수 있다.
 * marks: { uid: {pattern, origin, note} }, review: { uid: 'missA'|'foundA'|'bc'|'false' } (결과 화면)
 */
export function StageBlock({ stage, onPick, marks, review, notes, hint }) {
  // 그냥 누르면 문장 전체, 드래그하면 고른 구절(놓는 순간 편집 창이 뜬다)
  const pick = (uid) => onPick && (() => { if (!hasSelection()) onPick(uid, ''); });
  const onUp = onPick ? (e) => { const p = pickedPhrase(e.currentTarget); if (p) onPick(p.uid, p.quote); } : undefined;
  const U = ({ u, as: Tag = 'span' }) => (
    <Tag className={`unit ${cls(u.uid, marks, review, u.text)} ${onPick ? 'pickable' : ''}`} onClick={pick(u.uid)} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined}
      onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(u.uid, ''); } } : undefined} data-uid={u.uid}>
      <span className="uid">{u.uid.split('.')[1]}</span> {withPhrase(u.text, phraseOf(marks?.[u.uid], u.text))}
      {notes?.[u.uid] && <span className="unit-note">{notes[u.uid]}</span>}
    </Tag>
  );
  const body = () => {
    if (stage.kind === 'table') {
      const [h, ...rows] = stage.units;
      const cols = h.text.split(' | ');
      return (
        <div className="table-wrap">
          <table className="work-table">
            <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uid} className={`unit-row ${cls(r.uid, marks, review, r.text)} ${onPick ? 'pickable' : ''}`} onClick={pick(r.uid)} tabIndex={onPick ? 0 : undefined} role={onPick ? 'button' : undefined}
                  onKeyDown={onPick ? (e) => { if (e.key === 'Enter') onPick(r.uid, ''); } : undefined} data-uid={r.uid}>
                  {r.text.split(' | ').map((c, i) => <td key={i}>{i === 0 && <span className="uid">{r.uid.split('.')[1]}</span>} {withPhrase(c, phraseOf(marks?.[r.uid], c))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.some((r) => notes?.[r.uid]) && <ul className="row-notes">{rows.filter((r) => notes?.[r.uid]).map((r) => <li key={r.uid}><b>{r.uid}</b> {notes[r.uid]}</li>)}</ul>}
        </div>
      );
    }
    if (stage.kind === 'report') {
      const [t, ...rest] = stage.units;
      return (<><h4 className="report-title"><U u={t} /></h4><p className="report-body">{rest.map((u) => <U key={u.uid} u={u} />)}</p></>);
    }
    if (stage.kind === 'sentences') return <p className="report-body">{stage.units.map((u) => <U key={u.uid} u={u} />)}</p>;
    return <ul className="work-list">{stage.units.map((u) => <U key={u.uid} u={u} as="li" />)}</ul>;
  };
  return (
    <section className="stage" id={`st-${stage.key}`} onMouseUp={onUp}>
      <header className="stage-head">
        <span className="stage-key">{stage.key}</span>
        <span className="stage-name">{stage.name}</span>
        <span className="stage-in small muted">받은 것: {inputsKo(stage.inputs)}</span>
        {hint && <span className="stage-hint small">{hint}</span>}
      </header>
      <details className="stage-inst small"><summary>이 단계에 준 지시</summary><p>{stage.instruction}</p></details>
      {body()}
    </section>
  );
}

/** 단위를 눌렀을 때 뜨는 표시 편집 */
export function MarkEditor({ uid, text, mark, quote: picked, onSave, onRemove, onClose }) {
  const [quote, setQuote] = useState(picked || mark?.quote || '');
  const [pattern, setPattern] = useState(mark?.pattern ?? '');
  const [origin, setOrigin] = useState(!!mark?.origin);
  const [note, setNote] = useState(mark?.note ?? '');
  const ref = useDialog(onClose);
  return (
    <div className="mark-editor" role="dialog" aria-modal="true" aria-label={`${uid} 빨간 줄`} ref={ref}>
      <p className="small"><b>{uid}</b> {withPhrase(text, quote && text.includes(quote) ? quote : '')}</p>
      <label className="small">틀린 구절(문장에서 드래그하면 채워집니다. 비우면 문장 전체에 줄)<input value={quote} maxLength={300} onChange={(e) => setQuote(e.target.value)} placeholder="예: 별도 마감일 없음" /></label>
      {quote && !text.replace(/ \| /g, ' ').includes(quote) && !text.includes(quote) && <p className="small error">이 구절이 문장에 그대로 없습니다. 문장에서 드래그해 고르거나 비워 두세요.</p>}
      <label className="small">패턴(고르지 않아도 됩니다)
        <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">모르겠음</option>
          {PATTERNS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="small check"><input type="checkbox" checked={origin} onChange={(e) => setOrigin(e.target.checked)} /> 이 오류는 여기서 처음 생겼다</label>
      <label className="small">메모<textarea className="note-box" rows={3} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="원자료와 무엇이 다른지" /></label>
      <div className="row-btns">
        <button className="btn btn-primary" onClick={() => onSave({ pattern, origin, note, ...(quote.trim() ? { quote: quote.trim() } : {}) })}>빨간 줄 긋기</button>
        {mark && <button className="btn" onClick={onRemove}>지우기</button>}
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
