// BE 호출과 이 브라우저에만 두는 값(기기 ID, 만든 사람 표시, 검수 코드).
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
  json(k, d = null) { try { return JSON.parse(localStorage.getItem(k) ?? 'null') ?? d; } catch { return d; } },
};

/** 무작위 기기 ID. 이름·연락처와 이어지지 않는다 */
export function deviceId() {
  let id = store.get('ss:device');
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = (globalThis.crypto?.randomUUID?.() ?? `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    store.set('ss:device', id);
  }
  return id;
}

/** 주소에 ?maker=1 이 붙어 들어온 기기는 만든 사람으로 따로 센다(한 번 들어오면 이 브라우저에 남는다) */
export function isMaker() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('maker') === '1') store.set('ss:maker', '1');
    if (q.get('maker') === '0') store.set('ss:maker', '0');
  } catch { /* */ }
  return store.get('ss:maker') === '1';
}

/** 이 브라우저에서 푼 판: runId → answerId */
export const myAnswers = {
  all: () => store.json('ss2:answers', {}),
  set(runId, answerId) { const a = myAnswers.all(); a[runId] = answerId; store.set('ss2:answers', JSON.stringify(a)); },
  drop(runId) { const a = myAnswers.all(); delete a[runId]; store.set('ss2:answers', JSON.stringify(a)); },
};
/** 다시 풀기: 앞 결과(answerId)를 따로 두고 판을 새로 연다. 다시 푼 기록은 서버가 「첫 풀이 아님」으로 저장해 분포·내 실력 유형 통계에 넣지 않는다 */
export const retry = {
  prev: (runId) => store.get(`ss2:retryPrev:${runId}`),
  start(runId, answerId) { store.set(`ss2:retryPrev:${runId}`, answerId); myAnswers.drop(runId); },
  cancel(runId) { const p = retry.prev(runId); if (p) myAnswers.set(runId, p); store.set(`ss2:retryPrev:${runId}`, ''); },
  end(runId) { store.set(`ss2:retryPrev:${runId}`, ''); },
};
/** 선택 계정: 기록은 기록 코드(= 이 브라우저의 무작위 기기 ID)에 묶여 있고, 계정은 그 코드를 아이디·비밀번호에 묶어 다른 기기에서 이어 보게 한다 */
const newDeviceId = () => globalThis.crypto?.randomUUID?.() ?? `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
async function useDevice(id, user) {
  store.set('ss:device', id); store.set('ss:user', user || '');
  // 이 기기에서 푼 판(결과 화면을 다시 여는 데 쓰는 runId → answerId)을 서버 기록으로 다시 채운다
  try {
    const h = await req('/api/play', { action: 'history', deviceId: id });
    const a = {}; for (const x of h.history ?? []) if (x.kind === 'shadow' && x.id) a[x.runId] = x.id;
    store.set('ss2:answers', JSON.stringify(a));
  } catch { /* 기록을 못 읽어도 로그인은 그대로 */ }
}
export const account = {
  name: () => store.get('ss:user') || '',
  async signup(username, password, code) { const r = await req('/api/account', { action: 'signup', username, password, code: (code || '').trim() || deviceId() }); await useDevice(r.deviceId, r.username); return r; },
  async login(username, password) { const r = await req('/api/account', { action: 'login', username, password }); await useDevice(r.deviceId, r.username); return r; },
  async restore(code) { const r = await req('/api/account', { action: 'code', code: (code || '').trim() }); await useDevice(r.deviceId, ''); return r; },
  status: () => req('/api/account', { action: 'status', deviceId: deviceId() }),
  /** 로그아웃: 이 브라우저는 새 기록 코드로 비회원이 된다(같은 브라우저를 쓰는 다른 사람이 내 기록을 보지 않게) */
  logout() { store.set('ss:user', ''); store.set('ss:device', newDeviceId()); store.set('ss2:answers', '{}'); },
};
export const reviewCode = { get: () => store.get('ss2:review') ?? '', set: (v) => store.set('ss2:review', v) };

async function req(path, body, headers = {}) {
  const r = await fetch(`${BASE}${path}`, body
    ? { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }
    : { headers });
  const j = await r.json().catch(() => ({ error: `서버 응답을 읽지 못했습니다(${r.status})` }));
  if (!r.ok) throw Object.assign(new Error(j.error || `요청 실패(${r.status})`), { status: r.status });
  return j;
}
const who = () => ({ deviceId: deviceId(), maker: isMaker() });
const rv = () => ({ 'x-review-code': reviewCode.get() });

export const api = {
  missions: () => req('/api/missions'),
  mission: (id) => req(`/api/missions?mission=${encodeURIComponent(id)}`),
  run: (id) => req(`/api/missions?run=${encodeURIComponent(id)}`),
  answer: (b) => req('/api/play', { action: 'answer', ...b, ...who() }),
  result: (answerId) => req('/api/play', { action: 'result', answerId }),
  objection: (b) => req('/api/play', { action: 'objection', ...b, ...who() }),
  triage: (answerId) => req('/api/play', { action: 'triage', answerId }),
  history: () => req('/api/play', { action: 'history', deviceId: deviceId() }),
  patterns: () => req('/api/play', { action: 'patterns', deviceId: deviceId() }),
  stats: () => req('/api/stats'),
  lead: (action, b = {}) => req('/api/lead', { action, ...b, ...who() }),
  patch: (b) => req('/api/lead', { action: 'patch', ...b, ...who() }),
  drill: (action, b = {}) => req('/api/drill', { action, ...b, ...who() }),
  reviewQueue: () => req('/api/review', null, rv()),
  reviewRun: (id, force) => req(`/api/review?run=${encodeURIComponent(id)}${force ? '&force=1' : ''}`, null, rv()),
  reviewOp: (runId, op) => req('/api/review', { runId, op }, rv()),
  reviewFinalize: (runId) => req('/api/review', { runId, finalize: true }, rv()),
  reviewDrill: (runId) => req(`/api/review?run=${encodeURIComponent(runId)}&drill=1`, null, rv()),
  reviewDrillSave: (runId, drillset) => req('/api/review', { runId, drillset }, rv()),
  reviewObjection: (objectionId, accept, note, op) => req('/api/review', { objectionId, accept, note, op }, rv()),
};

export const COMPANY_KO = { Anthropic: 'Anthropic', OpenAI: 'OpenAI', Google: 'Google' };
export const modelName = (m) => ({ 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-opus-5-5': 'Claude Opus 5.5', 'gpt-6.1-sol': 'GPT-6.1 Sol', 'gpt-6-astra': 'GPT-6 Astra', 'gemini-3.8-flash': 'Gemini 3.8 Flash', 'gemini-4-argon': 'Gemini 4 Argon', 'gemini-4-carbon': 'Gemini 4 Carbon' }[m] ?? m);
export const fmtDate = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
