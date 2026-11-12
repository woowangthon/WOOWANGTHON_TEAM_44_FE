// BE 호출과 이 브라우저에만 두는 값(기기 ID, 만든 사람 표시, 내 기록).
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

/** 내 기록: 이 브라우저에만 남는다 */
export const myRecords = {
  all: () => store.json('ss:records', []),
  add(r) { store.set('ss:records', JSON.stringify([r, ...myRecords.all()].slice(0, 100))); },
};

/** 이 브라우저에서 결재한 과제 id(목록의 「결재함」 표시용) */
export const doneIds = () => new Set(myRecords.all().map((r) => r.taskId));

async function req(path, body) {
  const r = await fetch(`${BASE}${path}`, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : {});
  const j = await r.json().catch(() => ({ error: `서버 응답을 읽지 못했습니다(${r.status})` }));
  if (!r.ok) throw Object.assign(new Error(j.error || `요청 실패(${r.status})`), { status: r.status });
  return j;
}

export const api = {
  tasks: () => req('/api/tasks'),
  task: (id) => req(`/api/task?id=${encodeURIComponent(id)}`),
  grade: (b) => req('/api/grade', { ...b, deviceId: deviceId(), maker: isMaker() }),
  livePool: () => req('/api/live'),
  liveStart: (b) => req('/api/live', { op: 'start', ...b, deviceId: deviceId(), maker: isMaker() }),
  liveStep: (jobId) => req('/api/live', { op: 'step', jobId }),
  stats: () => req('/api/stats'),
  feedback: (b) => req('/api/feedback', { ...b, deviceId: deviceId(), maker: isMaker() }),
};
