"use client";

import { useEffect, useState } from "react";
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

function formatElapsed(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function StageIcon({ state }) {
  if (state === "done") {
    return (
      <span className="stage-icon stage-done" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18">
          <circle cx="10" cy="10" r="9" fill="#067647" />
          <path
            d="M6 10.2l2.4 2.4L14 7.2"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="stage-icon stage-current" aria-hidden="true">
        <span className="stage-current-ring" />
      </span>
    );
  }
  return <span className="stage-icon stage-pending" aria-hidden="true" />;
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
  refreshStartedAt = null,
  onRefresh,
}) {
  const state = refreshing ? "running" : status || "idle";
  const workbook = sourceFilename || "Production Scheduler - 2026.xlsx";
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!refreshing || !refreshStartedAt) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - refreshStartedAt);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [refreshing, refreshStartedAt]);

  // Backend does not emit stage events. Keep first stage active for the whole run;
  // do not invent completed stages or percentages.
  const stageStates = RUNNING_STEPS.map((_, index) =>
    index === 0 ? "current" : "pending"
  );

  return (
    <Card className={`refresh-panel refresh-panel-${state}`} id="refresh-panel">
      <div className="refresh-panel-head">
        <div>
          <h2>SharePoint Refresh</h2>
          <p className="refresh-source">Source: {workbook}</p>
        </div>
        {canRefresh && (
          <Button variant="primary" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh Now"}
          </Button>
        )}
      </div>

      {state === "running" && (
        <div className="refresh-running-layout" aria-live="polite">
          <div className="refresh-running-left">
            <div className="refresh-spinner" aria-hidden="true" />
            <div className="refresh-running-copy">
              <h3>Refreshing...</h3>
              <p>
                Reading worksheet &quot;{workbook.replace(/\.xlsx$/i, "")}&quot; from
                SharePoint
              </p>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-indeterminate" />
            </div>
          </div>

          <ol className="refresh-stages-vertical">
            {RUNNING_STEPS.map((step, index) => (
              <li key={step} className={stageStates[index]}>
                <StageIcon state={stageStates[index]} />
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <aside className="refresh-running-aside">
            <div className="refresh-aside-block">
              <label>Last refresh</label>
              <strong>{lastRefresh || "Not loaded yet"}</strong>
            </div>
            <div className="refresh-aside-stats">
              <div>
                <label>Updated</label>
                <strong>{stats?.updated ?? "—"}</strong>
              </div>
              <div>
                <label>Archived</label>
                <strong>{stats?.archived ?? "—"}</strong>
              </div>
              <div>
                <label>Inserted</label>
                <strong>{stats?.inserted ?? "—"}</strong>
              </div>
            </div>
            <div className="refresh-aside-block">
              <label>Elapsed time</label>
              <strong>{formatElapsed(elapsedMs)}</strong>
            </div>
          </aside>
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
              <span className="refresh-meta-sep" aria-hidden="true">•</span>
              <span className="refresh-duration">
                <span className="refresh-duration-label">Duration:</span>{" "}
                {durationLabel || "—"}
              </span>
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
          </div>
        </div>
      )}
    </Card>
  );
}

export { RUNNING_STEPS };
