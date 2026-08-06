export default function Button({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  const variantClass =
    variant === "primary"
      ? "btn primary"
      : variant === "danger"
        ? "btn danger"
        : variant === "ghost"
          ? "btn ghost"
          : "btn";
  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
