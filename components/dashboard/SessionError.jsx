import Button from "../ui/Button";

export default function SessionError({ onRetry, onSignIn }) {
  return (
    <div className="login session-shell">
      <section className="login-panel">
        <div className="login-card session-card">
          <div className="brand login-brand">KANNON MFG</div>
          <h2>Session check timed out</h2>
          <p>
            Sign-in status could not be confirmed. Retry the check, or sign in
            again with Microsoft.
          </p>
          <div className="session-actions">
            <Button variant="primary" onClick={onRetry}>
              Retry session check
            </Button>
            <Button onClick={onSignIn}>Sign in with Microsoft</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
