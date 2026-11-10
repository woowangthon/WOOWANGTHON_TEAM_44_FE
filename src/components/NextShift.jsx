// 연습에서 넘긴 인계가 다음 근무자에게 어떻게 보이는지. 다음 근무자의 첫 화면과 같은 «넘겨받은 것» 카드를 띄운다.
import { useEffect, useState } from 'react';
import { api, inboxQuery } from '../api.js';
import Received from './Received.jsx';

export default function NextShift({ onLive, onClose }) {
  const [h, setH] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { api.inbox(inboxQuery(true)).then((x) => setH(x.latest)).catch((e) => setErr(e.message)); }, []);
  const mark = async (body) => {
    setBusy(true);
    try { const r = await api.markHandoff({ ...inboxQuery(true), ...body }); setH(r.handoff); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="modal-back">
      <div className="nextshift" role="dialog" aria-modal="true" aria-labelledby="ns-h">
        <p className="kicker">연습, 다음 근무자가 로그인했을 때</p>
        <h2 id="ns-h">다음 근무 첫 화면</h2>
        <p className="sub">앞 근무자가 넘긴 것이 받은 전화 적기보다 먼저 보입니다. 항목을 이어받으면 이 근무의 인계 보고서에 남습니다.</p>
        {err && <p className="blocked">{err}</p>}
        {!h && !err && <p className="muted">인계함을 여는 중입니다</p>}
        {h && <Received h={h} practice busy={busy} onTake={(id, item) => mark({ op: 'take', id, item })} onReceive={(id) => mark({ op: 'receive', id })} />}
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>연습으로 돌아가기</button>
          <button className="btn dark" onClick={onLive}>실제 근무로 돌아가기</button>
        </div>
      </div>
    </div>
  );
}
