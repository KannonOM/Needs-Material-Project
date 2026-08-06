import Button from "../ui/Button";
import Card from "../ui/Card";

const RUNNING_STEPS = [
  "Connected to Microsoft Graph",
  "Opened SharePoint Site",
  "Opened Workbook",
  "Reading Worksheet",
  "Processing Rows",
];

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
  const state = refreshing ? "running" : status;

  return (
    <Card className="refresh-panel" id="refresh-panel">
      <div className="refresh-panel-head">
        <div>
          <h2>SharePoint Refresh</h2>
          <p className="refresh-source">Source: {sourceFilename || "Production Scheduler - 2026.xlsx"}</p>
        </div>
        {canRefresh && (
          <Button
            variant="primary"
            onClick={onRefresh}
            disabled={refreshing}
          >
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
          <ol className="refresh-steps">
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
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {state !== "running" && (
        <div className={`refresh-summary refresh-${state}`}>
          <div className="refresh-status-row">
            <span className={`status-pill ${state}`}>
              {state === "success"
                ? "Success"
                : state === "failed"
                  ? "Failed"
                  : "Idle"}
            </span>
            <span className="refresh-time">Last refresh: {lastRefresh || "Not loaded yet"}</span>
          </div>
          {state === "failed" && errorMessage && (
            <p className="refresh-error">{errorMessage}</p>
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
