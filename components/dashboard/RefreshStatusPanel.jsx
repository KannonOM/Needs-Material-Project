import Button from "../ui/Button";
import Card from "../ui/Card";

const RUNNING_STEPS = [
  "Connected to Microsoft Graph",
  "Opened SharePoint site",
  "Opened workbook",
  "Reading worksheet",
  "Processing rows",
];

function StatusLabel({ state }) {
  if (state === "running") return "Refreshing";
  if (state === "success") return "Success";
  if (state === "failed") return "Failed";
  return "Idle";
}

export default function RefreshStatusPanel({
  status = "idle",
  sourceFilename,
  lastRefresh,
  activeCount,
  stats,
  durationLabel,
  errorMessage,
  canRefresh,
  refreshing,
  runningStepIndex = 0,
  onRefresh,
}) {
  const state = refreshing ? "running" : status || "idle";

  return (
    <Card className={`refresh-panel refresh-panel-${state}`} id="refresh-panel">
      <div className="refresh-panel-head">
        <div>
          <h2>SharePoint Refresh</h2>
          <p className="refresh-source">
            Source: {sourceFilename || "Production Scheduler - 2026.xlsx"}
          </p>
        </div>
        {canRefresh && (
          <Button variant="primary" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh Now"}
          </Button>
        )}
      </div>

      {state === "running" && (
        <div className="refresh-running" aria-live="polite">
          <div className="refresh-running-title">Refreshing…</div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-indeterminate" />
          </div>
          <ol className="refresh-steps refresh-steps-horizontal">
            {RUNNING_STEPS.map((step, index) => (
              <li
                key={step}
                className={
                  index < runningStepIndex
                    ? "done"
                    : index === runningStepIndex
                      ? "current"
                      : ""
                }
              >
                <span className="step-marker" aria-hidden="true" />
                <span className="step-label">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state !== "running" && (
        <div className={`refresh-summary refresh-${state}`}>
          <div className="refresh-status-row">
            <span className={`status-pill ${state}`}>
              <StatusLabel state={state} />
            </span>
            <span className="refresh-time">
              Last refresh: {lastRefresh || "Not loaded yet"}
            </span>
          </div>
          {state === "failed" && errorMessage && (
            <p className="refresh-error">{errorMessage}</p>
          )}
          {state === "idle" && !stats && (
            <p className="refresh-idle-note">
              Use Refresh Now to import the latest Need Material work orders from
              SharePoint.
            </p>
          )}
          <div className="refresh-stats">
            <div>
              <label>Active WO</label>
              <strong>{activeCount ?? "—"}</strong>
            </div>
            <div>
              <label>Inserted</label>
              <strong>{stats?.inserted ?? "—"}</strong>
            </div>
            <div>
              <label>Updated</label>
              <strong>{stats?.updated ?? "—"}</strong>
            </div>
            <div>
              <label>Archived</label>
              <strong>{stats?.archived ?? "—"}</strong>
            </div>
            <div>
              <label>Duration</label>
              <strong>{durationLabel || "—"}</strong>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export { RUNNING_STEPS };
