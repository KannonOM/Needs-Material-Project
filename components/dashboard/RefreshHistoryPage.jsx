import Button from "../ui/Button";
import Card from "../ui/Card";

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "success") return "Success";
  if (value === "failed") return "Failed";
  if (value === "running") return "Running";
  return status || "—";
}

export default function RefreshHistoryPage({
  rows,
  loading,
  error,
  onRetry,
  onBack,
}) {
  return (
    <section className="dashboard-stack">
      <div className="page-head history-head">
        <div>
          <h1>Refresh History</h1>
          <p>Recent SharePoint import runs for the Needs Material queue.</p>
        </div>
        <div className="actions">
          <Button onClick={onBack}>Back to Dashboard</Button>
          <Button variant="primary" onClick={onRetry} disabled={loading}>
            {loading ? "Loading…" : "Refresh list"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="state-card state-error">
          <h2>Could not load history</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </Card>
      )}

      {!error && (
        <Card className="table-panel history-panel">
          <div className="panel-head">
            <h2>Recent refreshes</h2>
            <span>{loading ? "Loading…" : `${rows.length} records`}</span>
          </div>
          <div className="tablewrap tablewrap-scroll history-tablewrap">
            <table className="table history-table">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Inserted</th>
                  <th>Updated</th>
                  <th>Archived</th>
                  <th>Duration</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      <div className="table-loading">
                        <div className="skeleton-line" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line short" />
                        <p>Loading refresh history…</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatWhen(row.completedAt || row.startedAt)}</td>
                      <td>
                        <span className={`status-pill ${row.status || "idle"}`}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td>{row.activeCount ?? "—"}</td>
                      <td>{row.inserted ?? "—"}</td>
                      <td>{row.updated ?? "—"}</td>
                      <td>{row.archived ?? "—"}</td>
                      <td>{formatDuration(row.durationMs)}</td>
                      <td className="history-error">
                        {row.status === "failed"
                          ? row.errorSummary || "Failed"
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty">
                      No refresh history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
