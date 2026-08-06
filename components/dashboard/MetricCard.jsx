import Card from "../ui/Card";

export default function MetricCard({ label, value, hint, active, onClick }) {
  return (
    <Card
      as="button"
      type="button"
      className={`metric-card${active ? " active" : ""}`}
      onClick={onClick}
    >
      <label>{label}</label>
      <strong>{value}</strong>
      <small>{hint}</small>
    </Card>
  );
}
