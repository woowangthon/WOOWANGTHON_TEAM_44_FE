// 결재 서류 모양의 부품: 문서 머리(문서번호·결재란), 도장, 빨간 펜 여백 메모
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

/** 문서번호: 과제 id에서 만든다(moel-overtime-2611 → RL-2611-MOEL, live-… → RL-즉석-…) */
export function docNo(id) {
  const parts = String(id).split('-');
  if (parts[0] === 'live') return `RL-즉석-${parts[1].slice(0, 4).toUpperCase()}`;
  const ym = parts.find((x) => /^\d{4}$/.test(x)) ?? '0000';
  return `RL-${ym}-${parts[0].toUpperCase()}`;
}

/** 도장. kind: ok(승인) | no(반려) | sign(기안 서명) */
export function Stamp({ kind, label, small, animate }) {
  return (
    <span className={`stamp-mark stamp-${kind} ${small ? 'stamp-small' : ''} ${animate ? 'stamp-anim' : ''}`} aria-label={label}>
      <span>{label}</span>
    </span>
  );
}

/**
 * 문서 머리. stamps: { draft: 'AI 신입', review: null | '승인' | '반려' }
 */
export function DocHead({ task, round = 1, review, animate, note }) {
  return (
    <header className="doc-head">
      <div className="doc-meta">
        <p className="doc-no">
          문서번호 {docNo(task.id)}{round === 2 ? ' · 수정본' : ''}
        </p>
        <h1 className="doc-title">{task.title}</h1>
        <p className="doc-by">기안 AI 신입 · {today()} · 원자료 {task.source.publisher}</p>
        {note}
      </div>
      <table className="approval" aria-label="결재란">
        <thead><tr><th>기안</th><th>검토</th></tr></thead>
        <tbody>
          <tr>
            <td><Stamp kind="sign" label="AI 신입" small /></td>
            <td>{review ? <Stamp kind={review === '승인' ? 'ok' : 'no'} label={review} small animate={animate} /> : <span className="approval-empty">나</span>}</td>
          </tr>
        </tbody>
      </table>
    </header>
  );
}

/** 빨간 펜 여백 메모 */
export function PenNote({ children }) {
  return <span className="pen-note">{children}</span>;
}
