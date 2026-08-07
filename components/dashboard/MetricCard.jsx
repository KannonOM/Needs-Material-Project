import Card from "../ui/Card";

export default function MetricCard({ label, value, hint, active, onClick }) {
  return (
    <Card
      as="button"
      type="button"
      className={`metric-card${active ? " active" : ""}`}
      onClick={onClick}
      title={hint}
    >
      <label>{label}</label>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </Card>
  );
}
