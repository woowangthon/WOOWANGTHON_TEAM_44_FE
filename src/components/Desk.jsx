// 평시 오른쪽: 근무 도우미. 날씨와 알림(실제 공공 API), 자주 연락하는 곳, 필요할 때만 하천 수위.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { WATER } from '../util.js';

const short = (t) => { const m = String(t).match(/(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2})/); return m ? `${+m[2]}월 ${+m[3]}일 ${m[4]}:${m[5]}` : t; };
const CALL = ['K1', 'K11', 'K12', 'K13', 'K15', 'K5', 'K4', 'K6', 'K17', 'K7', 'K8'];

export default function Desk({ scenario, session }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let retry;
    // 한 항목이라도 늦으면 12초 뒤 한 번 더 불러온다(서버가 쉬었다 깨어난 첫 호출이 느릴 때)
    const load = (again = true) => api.live().then((x) => { setD(x); if (again && !(x.weather.ok && x.sms.ok && x.water.ok)) retry = setTimeout(() => load(false), 12000); }).catch((e) => setErr(e.message));
    load(); const id = setInterval(load, 5 * 60e3); return () => { clearInterval(id); clearTimeout(retry); };
  }, []);
  const wx = d?.weather?.ok ? d.weather.items[0] : null;
  const wxOn = wx && /발표|발효/.test(wx.title) && !/해제/.test(wx.title);
  const wet = (wxOn && /호우|홍수|태풍/.test(wx.title)) || (session?.incidents ?? []).some((i) => WATER.has(i.hazard));
  const W = d?.water;
  const contacts = CALL.map((id) => scenario.contacts.find((c) => c.id === id)).filter(Boolean);
  return (
    <div className="desk">
      <section>
        <h4>날씨와 알림</h4>
        {!d && !err && <p className="muted">불러오는 중입니다</p>}
        {err && !d && <p className="blocked">불러오지 못했습니다: {err}</p>}
        {d && (
          <>
            <p className="item"><span className="lab">기상특보</span>{d.weather.ok ? (wxOn ? wx.title.replace(/^\[특보\]\s*/, '') : '청주에 발효 중인 특보가 없습니다') : d.weather.error}</p>
            {d.sms.ok && d.sms.items.slice(0, 2).map((x, i) => (
              <p key={i} className="item"><span className="lab">재난문자</span><time>{short(x.t)}</time>{x.text}</p>
            ))}
            {d.sms.ok && !d.sms.items.length && <p className="item"><span className="lab">재난문자</span>최근 6일 동안 충북에 발송된 문자가 없습니다</p>}
          </>
        )}
        <p className="srcl">기상청 기상특보, 행정안전부 긴급재난문자(원문 그대로)</p>
      </section>
      {wet && W?.ok && W.latest && (
        <section>
          <h4>하천 수위</h4>
          <p className="item"><b>{W.station.replace(/^청주시\(|\)$/g, '')} {W.latest.wl.toFixed(2)}m</b> <time>{W.latest.t.slice(11)} 관측</time>{W.levels?.관심 != null ? `, 관심 수위 ${W.levels.관심}m` : ''}</p>
          <p className="srcl">한강홍수통제소 수위 Open API. 호우·홍수 특보나 침수 사건이 있을 때만 보입니다.</p>
        </section>
      )}
      <section>
        <h4>자주 연락하는 곳</h4>
        <ul className="calls">
          {contacts.map((c) => <li key={c.id}><b>{c.org}</b><span>{c.role.replace(/\(.*\)/, '')}</span></li>)}
        </ul>
        <p className="srcl">연락은 당직자가 전화나 메신저로 직접 합니다.</p>
      </section>
    </div>
  );
}
