// 결재 서류 모양의 부품: 문서 머리(문서번호·결재란), 도장, 빨간 펜 여백 메모
/** 문서번호: 판 id에서 만든다(m4-base-openai-11121700-1 → RL-M4-1112-O1, live-… → RL-라이브-…) */
export function docNo(id) {
  const p = String(id).split('-');
  if (p[0] === 'live') return `RL-라이브-${p[1].slice(0, 5).toUpperCase()}`;
  return `RL-${p[0].toUpperCase()}-${(p[3] ?? '').slice(0, 4)}-${(p[2] ?? 'x')[0].toUpperCase()}${p[4] ?? ''}`;
}

/** 도장. kind: ok(승인) | no(반려) | sign(기안 서명) */
export function Stamp({ kind, label, small, animate }) {
  return (
    <span className={`stamp-mark stamp-${kind} ${small ? 'stamp-small' : ''} ${animate ? 'stamp-anim' : ''}`} aria-label={label}>
      <span>{label}</span>
    </span>
  );
}

/** 문서 머리. drafter = 기안(AI 동료 모델 이름), review = null | '승인' | '반려' */
export function DocHead({ id, title, by, drafter, review, animate, note, phoneHideApproval }) {
  return (
    <header className={`doc-head${phoneHideApproval ? ' doc-head-run' : ''}`}>
      <div className="doc-meta">
        <p className="doc-no">문서번호 {docNo(id)}</p>
        <h1 className="doc-title">{title}</h1>
        {by && <p className="doc-by">{by}</p>}
        {note}
      </div>
      <table className="approval" aria-label="결재란">
        <thead><tr><th>기안</th><th>검토</th></tr></thead>
        <tbody>
          <tr>
            <td><Stamp kind="sign" label={drafter} small /></td>
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

/** 장부 상태 표시: 화면·README·발표에서 같은 말을 쓴다 */
export function LedgerTag({ status, version }) {
  if (status === 'reviewed') return <span className="ltag ltag-ok">정답표: 사람 검수 완료 · 장부 {version}판</span>;
  if (status === 'ai') return <span className="ltag ltag-ai">AI 감사(두 회사 이상) · 사람 확인 전{version ? ` · 장부 ${version}판` : ''}</span>;
  return <span className="ltag">장부 없음</span>;
}
