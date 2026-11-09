// 「당직메이트 없이 보기」: 같은 시각까지 들어온 신호를 받은 창구별로 묶지 않고 그대로 보여 준다.
const LANES = [
  { k: ['phone_memo'], title: '전화', how: '수화기를 들고 받아 적은 메모' },
  { k: ['agency_notice'], title: '기관 통보문', how: '팩스·메신저·공문으로 온 통보' },
  { k: ['police_112', 'fire_119'], title: '112·119 공조', how: '경찰·소방 상황실의 전화와 공조 요청' },
  { k: ['disaster_sms'], title: '재난문자', how: '휴대전화로 받은 문자' },
  { k: ['system_alert'], title: '시스템 알림', how: '수위·특보 시스템 화면 각각' },
];

export default function Scatter({ scenario, session, pending }) {
  const sigs = [...(session?.signals ?? []), ...(pending ? [pending] : [])];
  return (
    <section className="scatter" aria-labelledby="scatter-h">
      <div className="scatter-head">
        <h2 id="scatter-h">당직메이트가 없으면</h2>
        <p>같은 {sigs.length}건이 다섯 창구로 따로 들어옵니다. 어느 것이 같은 사건인지, 어떤 기준에 닿았는지, 누구에게 알려야 하는지는 당직자 혼자 맞춰 봐야 합니다.</p>
      </div>
      <div className="lanes">
        {LANES.map((l) => {
          const xs = sigs.filter((s) => l.k.includes(s.channel));
          return (
            <div key={l.title} className="lane">
              <h3>{l.title} <span className="n">{xs.length}</span></h3>
              <p className="how">{l.how}</p>
              <ol>
                {[...xs].reverse().map((s) => (
                  <li key={s.id} className="paper">
                    <time>{s.t}</time> <span className="from">{s.from}</span>
                    <p>{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
      <p className="scatter-foot">{scenario.signals.length}건 중 {sigs.length}건이 들어온 시각까지입니다. 위의 「당직메이트로 보기」를 누르면 같은 신호를 사건별로 묶은 화면으로 돌아갑니다.</p>
    </section>
  );
}
