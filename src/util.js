export const GRADE_KO = { observe: '관찰', report: '보고 권고', control_review: '통제 검토 요청 권고' };
export const ACTION_KO = { report: '보고', control_review: '통제 검토 요청', hold: '보류' };
export const CHANNEL_KO = {
  phone_memo: '전화 메모', disaster_sms: '재난문자', agency_notice: '기관 통보문',
  police_112: '112 공조', fire_119: '119 공동대응', system_alert: '시스템 알림',
};
export const STATUS_KO = { met: '도달', approaching: '접근', not_met: '미도달', unknown: '자료 없음' };
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fmt = (min) => {
  const m = Math.floor(min);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const gradeRank = (g) => ['observe', 'report', 'control_review'].indexOf(g);
// 사건 번호별 색(지도 점, 신호 띠, 사건 탭에 같은 색)
const INC_COLORS = ['#2563eb', '#c2410c', '#7c3aed', '#0f766e', '#be185d', '#4d7c0f', '#b45309', '#0369a1'];
export const incColor = (no) => INC_COLORS[((no ?? 1) - 1) % INC_COLORS.length];
// 「기록」 조항은 어느 사건에나 해당하므로 맨 뒤로 보낸다
export const citeOrder = (cs = []) => [...cs].sort((a, b) => (/기록/.test(a.heading) ? 1 : 0) - (/기록/.test(b.heading) ? 1 : 0));
