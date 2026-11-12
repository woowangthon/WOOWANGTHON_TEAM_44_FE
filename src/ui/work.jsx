// 작업 기록 보기 부품: 원자료 패널, 단계별 산출물(단위마다 누를 수 있음), 표시 편집
import { useState } from 'react';

export const PATTERNS = ['한정어·조건 탈락', '근거보다 큰 결론', '원자료에 없는 내용', '단위·기준 시점 혼동', '날짜·기간 오류', '숫자·계산 틀림', '방향·주체 바뀜', '지시 누락', '중요 정보 누락', '원자료에 없는 인용', '기타'];
const INPUT_KO = { sources: '원자료', brief: '팀장 지시' };
export const inputsKo = (inputs) => inputs.map((x) => INPUT_KO[x] ?? x).join(' · ');

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
          <button key={k} role="tab" aria-selected={k === tab} className={k === tab ? 'on' : ''} onClick={() => { setTab(k); onView?.(); }} title={docs[k].title}>
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
const cls = (uid, marks, review) => {
  const c = [];
  if (marks?.[uid]) c.push('marked');
  if (review?.[uid]) c.push(`rv-${review[uid]}`);
  return c.join(' ');
};

/**
 * 단계 하나. units를 종류에 맞게 그린다. onPick(uid)가 있으면 단위를 누를 수 있다.
 * marks: { uid: {pattern, origin, note} }, review: { uid: 'missA'|'foundA'|'bc'|'false' } (결과 화면)
 */
export function StageBlock({ stage, onPick, marks, review, notes }) {
  const pick = (uid) => onPick && (() => onPick(uid));
  const U = ({ u, as: Tag = 'span' }) => (
    <Tag className={`unit ${cls(u.uid, marks, review)} ${onPick ? 'pickable' : ''}`} onClick={pick(u.uid)} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined}
      onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(u.uid); } } : undefined} data-uid={u.uid}>
      <span className="uid">{u.uid.split('.')[1]}</span> {u.text}
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
                <tr key={r.uid} className={`unit-row ${cls(r.uid, marks, review)} ${onPick ? 'pickable' : ''}`} onClick={pick(r.uid)} tabIndex={onPick ? 0 : undefined} role={onPick ? 'button' : undefined}
                  onKeyDown={onPick ? (e) => { if (e.key === 'Enter') onPick(r.uid); } : undefined} data-uid={r.uid}>
                  {r.text.split(' | ').map((c, i) => <td key={i}>{i === 0 && <span className="uid">{r.uid.split('.')[1]}</span>} {c}</td>)}
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
    <section className="stage" id={`st-${stage.key}`}>
      <header className="stage-head">
        <span className="stage-key">{stage.key}</span>
        <span className="stage-name">{stage.name}</span>
        <span className="stage-in small muted">받은 것: {inputsKo(stage.inputs)}</span>
      </header>
      <details className="stage-inst small"><summary>이 단계에 준 지시</summary><p>{stage.instruction}</p></details>
      {body()}
    </section>
  );
}

/** 단위를 눌렀을 때 뜨는 표시 편집 */
export function MarkEditor({ uid, text, mark, onSave, onRemove, onClose }) {
  const [pattern, setPattern] = useState(mark?.pattern ?? '');
  const [origin, setOrigin] = useState(!!mark?.origin);
  const [note, setNote] = useState(mark?.note ?? '');
  return (
    <div className="mark-editor" role="dialog" aria-label={`${uid} 표시`}>
      <p className="small"><b>{uid}</b> {text.length > 120 ? `${text.slice(0, 120)}…` : text}</p>
      <label className="small">패턴(고르지 않아도 됩니다)
        <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">모르겠음</option>
          {PATTERNS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="small check"><input type="checkbox" checked={origin} onChange={(e) => setOrigin(e.target.checked)} /> 여기서 처음 생겼다(근원)</label>
      <label className="small">메모 한 줄<input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="원자료와 무엇이 다른지" /></label>
      <div className="row-btns">
        <button className="btn btn-primary" onClick={() => onSave({ pattern, origin, note })}>빨간 줄 긋기</button>
        {mark && <button className="btn" onClick={onRemove}>지우기</button>}
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
