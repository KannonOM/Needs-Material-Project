"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";

function summaryBadgeClass(text) {
  if (text === "Complete") return "sum-badge complete";
  if (text === "None") return "sum-badge none";
  if (/Late/i.test(text)) return "sum-badge late";
  if (/Open/i.test(text)) return "sum-badge open";
  return "sum-badge none";
}

function DaysToShipCell({ info }) {
  if (info.days == null) {
    return <span className="days-ship neutral">—</span>;
  }
  return (
    <span className={`days-ship ${info.tone}`}>
      <strong>{info.days}</strong>
      <small>{info.label}</small>
    </span>
  );
}

function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => pages.add(n));
  return [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

export default function WorkOrderTable({
  columns,
  visibleRows,
  sortKey,
  sortDir,
  onSort,
  loadingRows,
  canEdit,
  onEdit,
  categorySummary,
  daysToShipInfo,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [visibleRows, pageSize]);

  const total = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageList(page, totalPages);
  const colSpan = columns.length + 1;

  return (
    <Card className="table-panel work-order-panel">
      <div className="panel-head">
        <h2>Active Needs Material</h2>
        <span>{total} records</span>
      </div>
      <div className="tablewrap tablewrap-paged">
        <table className="table work-order-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.key === "description" ? "col-description" : undefined}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className={`th-sort${sortKey === col.key ? " sorted" : ""}`}
                      onClick={() => onSort(col.key)}
                    >
                      {col.label}
                      <span className="sort-indicator" aria-hidden="true">
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span className="th-static">{col.label}</span>
                  )}
                </th>
              ))}
              <th className="col-edit">
                <span className="th-static">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingRows ? (
              <tr>
                <td colSpan={colSpan} className="empty">
                  <div className="table-loading">
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <p>Loading work orders…</p>
                  </div>
                </td>
              </tr>
            ) : pageRows.length ? (
              pageRows.map((r) => {
                const ship = daysToShipInfo(r.due_date);
                const flats = categorySummary(r, "Flats");
                const shapes = categorySummary(r, "Shapes");
                const purchasedParts = categorySummary(r, "Purchased Parts");
                return (
                  <tr key={r.id}>
                    <td className="mono">
                      <button
                        type="button"
                        className="wo-link"
                        onClick={() => onEdit(r)}
                      >
                        {r.work_order}
                      </button>
                    </td>
                    <td className="mono">{r.customer_po || "—"}</td>
                    <td>{r.customer || "—"}</td>
                    <td>{r.due_date || "—"}</td>
                    <td>
                      <DaysToShipCell info={ship} />
                    </td>
                    <td className="mono">{r.part_number || "—"}</td>
                    <td className="col-description" title={r.description || ""}>
                      {r.description || "—"}
                    </td>
                    <td>{r.quantity ?? "—"}</td>
                    <td>
                      <span className={summaryBadgeClass(flats)}>{flats}</span>
                    </td>
                    <td>
                      <span className={summaryBadgeClass(shapes)}>{shapes}</span>
                    </td>
                    <td>
                      <span className={summaryBadgeClass(purchasedParts)}>
                        {purchasedParts}
                      </span>
                    </td>
                    <td>{r.owner || "—"}</td>
                    <td className="col-edit">
                      <Button className="edit-btn" onClick={() => onEdit(r)}>
                        {canEdit ? "Edit" : "View"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="empty">
                  No matching Need Material orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-meta">
          Showing {from} to {to} of {total} entries
        </div>
        <label className="page-size">
          <span>Rows per page</span>
          <select
            className="control"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <div className="pagination-controls">
          <button
            type="button"
            className="page-btn"
            disabled={page <= 1 || loadingRows}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          {pages.map((n, index) => {
            const prev = pages[index - 1];
            const showGap = prev && n - prev > 1;
            return (
              <span key={n} className="page-number-wrap">
                {showGap && <span className="page-gap">…</span>}
                <button
                  type="button"
                  className={`page-btn page-num${page === n ? " active" : ""}`}
                  onClick={() => setPage(n)}
                  disabled={loadingRows}
                >
                  {n}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            className="page-btn"
            disabled={page >= totalPages || loadingRows || total === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}
