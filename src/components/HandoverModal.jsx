import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

export default function HandoverModal({ report, scenario, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
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
        {!report.summary_verified && <p className="blocked">AI 요약이 검증을 통과하지 못해 기록 표만 실었습니다.</p>}
        <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(report.markdown.replace(/</g, '&lt;')) }} />
      </div>
    </div>
  );
}
