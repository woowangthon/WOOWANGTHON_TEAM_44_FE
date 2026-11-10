// 받은 전화 적기. 적은 메모도 기관 신호와 같은 AI 단계를 거쳐 사건으로 묶인다.
import { useState } from 'react';

export default function MemoBox({ onMemo, busy, suggest, compact, readOnly }) {
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const r = await onMemo(body, from);
    if (r) { setBody(''); setFrom(''); }
  };
  if (readOnly) return null;
  return (
    <form className={`memo ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <h3>받은 전화 적기</h3>
      <textarea rows={compact ? 2 : 3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="예: 용암동 아파트 앞 인도에서 상수도관이 터져 물이 차도로 흐른다는 전화" />
      <div className="row">
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="건 사람 (선택)" />
        <button className="btn dark" disabled={busy || !body.trim()}>사건으로 넣기</button>
      </div>
      {suggest && !body && (
        <button type="button" className="chip fill" onClick={() => { setBody(suggest.body); setFrom(suggest.from); }}>
          들은 내용 채우기: {suggest.from}
        </button>
      )}
    </form>
  );
}
