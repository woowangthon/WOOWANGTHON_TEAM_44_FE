export const GRADE_KO = { observe: '관찰', report: '보고 권고', control_review: '통제 검토 요청 권고' };
export const ACTION_KO = { report: '보고', control_review: '통제 검토 요청', hold: '보류' };
export const CHANNEL_KO = {
  phone_memo: '전화', disaster_sms: '재난문자', agency_notice: '기관 통보',
  police_112: '112 공조', fire_119: '119 공동대응', system_alert: '시스템 알림',
};
export const STATUS_KO = { met: '도달', approaching: '접근', not_met: '미도달', unknown: '자료 없음' };
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fmt = (min) => {
  const m = Math.floor(min);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const gradeRank = (g) => ['observe', 'report', 'control_review'].indexOf(g);
// 위험도 색: 지도 점, 사건 줄, 권고 글자에 같은 색을 쓴다. 사건마다 다른 색은 쓰지 않는다.
export const SEV = { control_review: '#b42318', report: '#b8620b', observe: '#7a8590' };
export const sevColor = (g) => SEV[g] ?? SEV.observe;
// 「기록」 조항은 어느 사건에나 해당하므로 맨 뒤로 보낸다
// 당직자가 할 일을 적은 조항(「당직자는 …한다」)을 앞에, 어느 사건에나 해당하는 「기록」 조항은 맨 뒤로
const citeRank = (c) => (/기록/.test(c.heading) ? 2 : /당직자는/.test(c.quote) ? 0 : 1);
export const citeOrder = (cs = []) => [...cs].sort((a, b) => citeRank(a) - citeRank(b));

/** 보류한 뒤 규칙표가 다시 알렸는가 */
export function reraised(inc) {
  const d = inc.decisions.at(-1);
  const n = inc.nudges.at(-1);
  return !!(d && d.action === 'hold' && n && n.at >= d.at);
}

/**
 * 사건이 사건 줄의 어느 칸에 들어가는지 정한다.
 * need: 결정할 사건(권고 이상인데 결정 전, 보류 뒤 재촉, 결정 뒤 권고가 더 오름)
 * held: 보류하고 지켜보는 중  watch: 관찰 단계  done: 결정해 처리함
 */
export function incState(inc) {
  const d = inc.decisions.at(-1);
  if (d && d.action !== 'hold') {
    const nudged = inc.nudges.some((n) => n.at > d.at);
    const rose = gradeRank(inc.grade) > gradeRank(d.ai_grade_at_decision ?? inc.grade);
    if (!nudged && !rose) return 'done';
  }
  if (d?.action === 'hold' && !reraised(inc)) return 'held';
  if (gradeRank(inc.grade) < 1) return 'watch';
  return 'need';
}

/** 결정할 사건을 급한 순서로: 재촉받은 것 > 통제 검토 요청 권고 > 보고 권고, 같으면 먼저 오른 것 */
export function needList(incidents = []) {
  return incidents.filter((i) => incState(i) === 'need').sort((a, b) =>
    (reraised(b) - reraised(a)) || (gradeRank(b.grade) - gradeRank(a.grade)) || String(a.advice_at ?? a.opened_at).localeCompare(String(b.advice_at ?? b.opened_at)));
}

/** 근거 서랍에서 먼저 열 탭: 수위가 근거면 수위, 지하차도·하부도로나 도로 침수면 지도, 그 밖에는 신호 */
export function pickTab(inc, scenario) {
  if (!inc) return 'level';
  const fac = scenario.facilities.find((f) => f.id === inc.facility_id);
  const hasSeries = fac?.gauge && scenario.timeseries?.[fac.gauge]?.length;
  if (hasSeries && inc.grade_why.some((w) => /수위|특보/.test(w))) return 'level';
  if (fac?.type === 'underpass' || /road/.test(inc.hazard ?? '')) return 'map';
  if (hasSeries) return 'level';
  return 'signals';
}

/**
 * 지금 보여 줄 화면. 규칙은 코드가 정하고, 당직자가 고정한 화면이 있으면 그것을 따른다.
 * standby 평시 / decide 결정 / overview 상황판 / night 근무 기록(인계)
 */
export function chooseView({ pinned, needs, picked, ended }) {
  if (pinned && pinned !== 'auto') return pinned;
  if (picked) return 'decide';
  if (needs.length >= 3) return 'overview';
  if (needs.length) return 'decide';
  return ended ? 'night' : 'standby';
}

export const placeOf = (scenario, inc) => scenario.places.find((p) => inc?.keys?.includes(p.id)) ?? null;
