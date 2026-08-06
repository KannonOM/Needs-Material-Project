export default function Input({ className = "", ...props }) {
  return <input className={`control ${className}`.trim()} {...props} />;
}
