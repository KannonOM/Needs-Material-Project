export default function SessionLoading() {
  return (
    <div className="login session-shell">
      <section className="login-panel">
        <div className="login-card session-card">
          <div className="brand login-brand">KANNON MFG</div>
          <h2>Checking session…</h2>
          <p className="muted">Confirming your Microsoft sign-in.</p>
          <div className="session-skeleton" aria-hidden="true">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      </section>
    </div>
  );
}
