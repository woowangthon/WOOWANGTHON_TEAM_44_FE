export default function Placeholder({ title, children }) {
  return <main><h1>{title}</h1>{children ?? <p className="muted">준비 중입니다.</p>}</main>;
}
