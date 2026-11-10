// 당직메이트 없이 받았다면: 같은 신호를 받은 창구별로 묶지 않고 그대로 보여 준다.
const LANES = [
  { k: ['phone_memo'], title: '전화', how: '수화기를 들고 받아 적은 메모' },
  { k: ['agency_notice'], title: '기관 통보', how: '팩스·메신저·공문으로 온 통보' },
  { k: ['police_112', 'fire_119'], title: '112·119 공조', how: '경찰·소방 상황실의 전화와 공조 요청' },
  { k: ['disaster_sms'], title: '재난문자', how: '휴대전화로 받은 문자' },
  { k: ['system_alert'], title: '시스템 알림', how: '수위·특보 시스템 화면 각각' },
];

export default function Scatter({ session, onClose }) {
  const sigs = session?.signals ?? [];
  const incs = session?.incidents ?? [];
  return (
    <div className="scatter" role="dialog" aria-modal="true" aria-labelledby="scatter-h">
      <div className="scatter-head">
        <div>
          <h2 id="scatter-h">당직메이트 없이 받았다면</h2>
          <p>같은 {sigs.length}건이 다섯 창구로 따로 들어옵니다. 어느 것이 같은 사건인지, 어떤 기준에 닿았는지, 누구에게 알려야 하는지는 당직자 혼자 맞춰 봐야 합니다.</p>
        </div>
        <dl className="contrast" aria-label="같은 신호를 당직메이트로 보면">
          <dt>당직메이트로 보면</dt>
          <dd><b>{incs.length}</b>개 사건</dd>
          <dd className="c-ctl"><b>{incs.filter((i) => i.grade === 'control_review').length}</b>건 통제 검토 요청 권고</dd>
          <dd className="c-rep"><b>{incs.filter((i) => i.grade === 'report').length}</b>건 보고 권고</dd>
          <dd className="c-hum"><b>{incs.reduce((n, i) => n + i.decisions.length, 0)}</b>번 결정 기록</dd>
        </dl>
        <button className="btn dark" onClick={onClose}>당직메이트로 보기</button>
      </div>
      <div className="lanes">
        {LANES.map((l) => {
          const xs = sigs.filter((s) => l.k.includes(s.channel));
          return (
            <div key={l.title} className="lane">
              <h3>{l.title} <span className="n">{xs.length}</span></h3>
              <p className="how">{l.how}</p>
              <ol>{[...xs].reverse().map((s) => <li key={s.id} className="paper"><time>{s.t}</time> <span className="from">{s.from}</span><p>{s.body}</p></li>)}</ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
