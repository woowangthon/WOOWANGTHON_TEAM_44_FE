// #/account 기록 보관: 비회원은 기록 코드로, 원하면 아이디·비밀번호 계정으로. 계정 없이도 모든 기능을 쓴다
import { useEffect, useState } from 'react';
import { account, deviceId } from '../api.js';

export default function Account() {
  const [name, setName] = useState(account.name());
  const [code, setCode] = useState(deviceId());
  const [bound, setBound] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ su: '', sp: '', sp2: '', sc: deviceId(), lu: '', lp: '', rc: '' });
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { account.status().then((r) => setBound(r.account)).catch(() => {}); }, [code]);
  const done = (text) => { setName(account.name()); setCode(deviceId()); setF((x) => ({ ...x, sp: '', sp2: '', lp: '', sc: deviceId() })); setMsg(text); setError(''); window.dispatchEvent(new HashChangeEvent('hashchange')); };
  const run = async (fn) => { setBusy(true); setMsg(''); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const signup = (e) => { e.preventDefault(); if (f.sp !== f.sp2) { setError('비밀번호 두 칸이 다릅니다'); return; } run(async () => { await account.signup(f.su, f.sp, f.sc); done('계정을 만들었습니다. 이 기록 코드의 기록이 그대로 계정에 이어집니다.'); }); };
  const login = (e) => { e.preventDefault(); run(async () => { await account.login(f.lu, f.lp); done('로그인했습니다. 계정의 기록을 이어서 보여 드립니다.'); }); };
  const restore = (e) => { e.preventDefault(); const old = deviceId(); run(async () => { await account.restore(f.rc); done(`그 기록 코드로 바꿨습니다. 바꾸기 전 이 브라우저의 기록 코드는 ${old}입니다(다시 쓰려면 적어 두세요).`); }); };
  const copy = () => { navigator.clipboard?.writeText(code).then(() => setMsg('기록 코드를 복사했습니다.'), () => {}); };

  return (
    <main className="account">
      <h1>기록 보관</h1>
      <p className="small muted">계정 없이도 모든 기능을 씁니다. 기록은 이 브라우저가 만든 기록 코드(무작위 번호)에 묶여 있어, 다른 기기에서 이어 보려면 기록 코드를 쓰거나 계정을 만듭니다. 이름·이메일·연락처는 받지 않습니다.</p>
      {msg && <p className="notice" role="status">{msg}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="sheet" aria-label="지금 상태">
        <h2>{name ? <>로그인: {name}</> : '비회원'}</h2>
        <p>이 브라우저의 기록 코드 <code className="acct-code">{code}</code> <button className="btn btn-sm" onClick={copy}>복사</button></p>
        <p className="small muted">{name ? '로그아웃하면 이 브라우저는 새 기록 코드로 비회원이 됩니다. 기록은 계정에 남아 있어 다시 로그인하면 이어집니다.' : bound ? '이 기록 코드는 계정에 묶여 있습니다. 다른 기기에서는 아이디로 로그인하세요.' : '기록 코드를 아는 사람은 이 기록을 볼 수 있습니다. 남에게 보여 주지 마세요.'}</p>
        {name && <p><button className="btn" onClick={() => { account.logout(); done('로그아웃했습니다. 이 브라우저는 새 기록 코드로 비회원입니다.'); }}>로그아웃</button></p>}
      </section>

      {!name && (
        <div className="acct-grid">
          <form className="sheet" onSubmit={signup} aria-label="회원가입">
            <h2>회원가입</h2>
            <p className="small muted">기록 코드를 넣으면 그 기록을 유지한 채 계정을 만듭니다. 처음엔 이 브라우저의 코드가 들어 있습니다.</p>
            <label>아이디<input value={f.su} onChange={on('su')} autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" placeholder="영문·숫자·밑줄 3~20자" /></label>
            <label>비밀번호<input type="password" value={f.sp} onChange={on('sp')} autoComplete="new-password" required minLength={8} maxLength={72} placeholder="8자 이상" /></label>
            <label>비밀번호 확인<input type="password" value={f.sp2} onChange={on('sp2')} autoComplete="new-password" required minLength={8} maxLength={72} /></label>
            <label>이어 갈 기록 코드<input value={f.sc} onChange={on('sc')} spellCheck={false} /></label>
            <p><button className="btn btn-primary" disabled={busy}>계정 만들기</button></p>
          </form>
          <div className="acct-col">
          <form className="sheet" onSubmit={login} aria-label="로그인">
            <h2>로그인</h2>
            <label>아이디<input value={f.lu} onChange={on('lu')} autoComplete="username" required /></label>
            <label>비밀번호<input type="password" value={f.lp} onChange={on('lp')} autoComplete="current-password" required /></label>
            <p><button className="btn btn-primary" disabled={busy}>로그인</button></p>
          </form>
          <form className="sheet" onSubmit={restore} aria-label="기록 코드로 이어 보기">
            <h2>기록 코드로 이어 보기</h2>
            <p className="small muted">다른 기기에서 받은 기록 코드를 넣으면 이 브라우저가 그 기록을 이어 씁니다. 계정에 묶인 코드는 로그인해야 합니다.</p>
            <label>기록 코드<input value={f.rc} onChange={on('rc')} spellCheck={false} required /></label>
            <p><button className="btn" disabled={busy}>이 코드로 이어 보기</button></p>
          </form>
          </div>
        </div>
      )}
      <p className="small muted">비밀번호는 서버에 원문으로 저장하지 않습니다(scrypt 해시). 비밀번호를 잊으면 되찾을 방법이 없으니, 기록 코드도 함께 적어 두세요.</p>
    </main>
  );
}
