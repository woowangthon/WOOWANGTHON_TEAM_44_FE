// 이전 근무에서 넘겨받은 것. 당직실 인계함(서버)에 남은 마지막 인계를 보여 주고, 항목마다 이어받을 수 있다.
const KIND = { undecided: '결정 전', held: '보류 중', raised: '권고 오름', pending: '회신 대기' };
const when = (iso) => { try { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };

export default function Received({ h, onTake, onReceive, busy, practice }) {
  if (!h) return null;
  const open = h.items.filter((i) => !h.taken.includes(i.key)).length;
  return (
    <section className="received" aria-label="넘겨받은 것">
      <div className="rc-head">
        <h3>넘겨받은 것<em>{h.items.length}</em></h3>
        <span className="sub">{h.from}, {h.period}{h.sent_at ? `, ${when(h.sent_at)}에 넘김` : ''}{practice ? ', 연습' : ''}</span>
      </div>
      {h.note && <p className="rc-note">{h.note}</p>}
      {h.items.length ? (
        <ul>
          {h.items.map((i) => {
            const took = h.taken.includes(i.key);
            return (
              <li key={i.key} className={took ? 'took' : ''}>
                <span className={`k k-${i.kind}`}>{KIND[i.kind]}</span>
                <div><b>#{i.incident_no} {i.title}</b><span className="t">{i.text}</span></div>
                {took ? <span className="done">이어받음</span>
                  : <button className="btn small" disabled={busy} onClick={() => onTake(h.id, i.key)}>이어받기</button>}
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">미결 항목 없이 넘겼습니다.</p>}
      <div className="rc-foot">
        <span className="sub">이어받은 항목은 이 근무 인계 보고서의 「이전 근무에서 넘겨받은 것」에 남습니다.</span>
        {!h.received_at && <button className="link quiet" disabled={busy} onClick={() => onReceive(h.id)}>{open ? '나머지는 확인만 함' : '인계 받음'}</button>}
      </div>
    </section>
  );
}
