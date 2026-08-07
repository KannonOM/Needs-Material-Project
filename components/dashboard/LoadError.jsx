import Button from "../ui/Button";
import Card from "../ui/Card";

export default function LoadError({ title, message, onRetry, retryLabel = "Try again" }) {
  return (
    <Card className="state-card state-error">
      <h2>{title || "Something went wrong"}</h2>
      <p>{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Card>
  );
}
