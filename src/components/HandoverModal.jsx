import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

// 보고서 마크다운에서 요약 단락만 뽑아 인계함에 함께 넣는다
const summaryOf = (md) => (md.split('## 요약')[1] ?? '').split('\n## ')[0].trim();

export default function HandoverModal({ report, scenario, r, onClose, onNext }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(null);
  const practice = r.kind !== 'live';
  useEffect(() => {
    ref.current?.focus();
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const download = () => {
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `인계보고서_${scenario.id}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(report.markdown); setCopied(true); } catch { setCopied(false); }
  };
  const send = async (e) => {
    e.preventDefault();
    const out = await r.handoff({ from, note, summary: report.summary_verified ? summaryOf(report.markdown) : '' });
    if (out) setSent(out.handoff);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ho-h" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="ho-h">인계 보고서</h2>
          <div className="row">
            <button className="btn" onClick={copy}>{copied ? '복사했습니다' : '마크다운 복사'}</button>
            <button className="btn" onClick={download}>.md로 내려받기</button>
            <button className="btn" onClick={() => window.print()}>인쇄·PDF</button>
            <button className="btn ghost" onClick={onClose}>닫기</button>
          </div>
        </div>
        {!r.readOnly && (
          <section className="handoff" aria-label="다음 근무자에게 넘기기">
            {!sent ? (
              <form onSubmit={send}>
                <div className="ho-text">
                  <b>다음 근무자에게 넘기기</b>
                  <span>결정 전 사건, 보류한 사건, 회신 대기를 {practice ? '연습 인계함' : `${scenario.duty.office} 인계함`}에 넣습니다. 다음 근무자가 로그인하면 첫 화면에 뜹니다.</span>
                </div>
                <div className="row">
                  <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="넘기는 사람 (예: 야간 당직 박○○)" />
                  <input className="wide" value={note} onChange={(e) => setNote(e.target.value)} placeholder="한 줄 당부 (선택)" />
                  <button className="btn dark" disabled={!!r.busy}>넘기기</button>
                </div>
              </form>
            ) : (
              <div className="ho-done" role="status">
                <span><b>넘겼습니다.</b> 확인할 것 {sent.items.length}건이 {practice ? '연습 인계함' : '인계함'}에 들어갔습니다.</span>
                {practice && onNext && <button className="btn dark" onClick={onNext}>다음 근무자 화면 보기</button>}
              </div>
            )}
          </section>
        )}
        {!report.summary_verified && <p className="blocked">AI 요약이 검증을 통과하지 못해 기록 표만 실었습니다.</p>}
        <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(report.markdown.replace(/</g, '&lt;')) }} />
      </div>
    </div>
  );
}
