// 첫 화면: 기관 접속 코드로 들어가거나, 체험 기간에는 체험 계정으로 바로 들어간다. 한 번 들어가면 이 브라우저는 다시 묻지 않는다.
import { useEffect, useState } from 'react';
import { api, auth } from '../api.js';

const md = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };

export default function Login({ onIn }) {
  const [access, setAccess] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.access().then(setAccess).catch(() => setAccess({ open: false, code_required: true })); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const ok = await api.login(code.trim()).catch(() => false);
    setBusy(false);
    if (!ok) { setErr('접속 코드가 맞지 않습니다. 다시 확인해 주세요.'); return; }
    auth.set({ kind: 'code', code: code.trim() });
    onIn();
  };
  const guest = () => { auth.set({ kind: 'guest' }); onIn(); };

  return (
    <div className="login">
      <div className="login-side">
        <span className="wm">당직메이트</span>
        <p className="login-lead">야간 당직실로 흩어져 들어오는 전화와 신호를 사건으로 묶고, 처리할 부서와 매뉴얼 조항을 찾아 당직자의 결정을 돕습니다.</p>
        <ul className="login-roles">
          <li><b>AI</b><span>전화, 기관 통보, 재난문자, 112·119 공조, 수위 알림을 사건으로 묶고, 매뉴얼 조항을 원문 그대로 찾고, 연락할 때 볼 전달 사항을 정리합니다.</span></li>
          <li><b>규칙표</b><span>통제 기준에 닿았는지, 어느 부서에 넘길 일인지와 권고 등급은 코드로 정합니다.</span></li>
          <li><b>당직자</b><span>담당 부서 전달, 보고, 통제 검토 요청, 보류를 고르고 실제 연락을 합니다. 당직메이트는 그 결정을 인계 보고서로 남겨 다음 근무자에게 넘깁니다.</span></li>
        </ul>
      </div>
      <form className="login-card" onSubmit={submit}>
        <h1>근무 시작</h1>
        <label className="field">
          <span>소속</span>
          <input value="청주시청 당직실" readOnly aria-readonly="true" />
        </label>
        <label className="field">
          <span>기관 접속 코드</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn dark wide" disabled={!code.trim() || busy}>접속</button>
        {access?.open && (
          <>
            <div className="or"><span>또는</span></div>
            <button type="button" className="btn wide guest" onClick={guest}>체험 계정으로 시작</button>
            <p className="note">체험 계정은 {md(access.until)}까지 열려 있습니다. AI 기능을 그대로 쓸 수 있습니다.</p>
          </>
        )}
        <button type="button" className="link quiet" onClick={() => onIn({ record: true })}>로그인 없이 저장된 연습 기록 둘러보기</button>
      </form>
    </div>
  );
}
