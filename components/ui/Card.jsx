export default function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
