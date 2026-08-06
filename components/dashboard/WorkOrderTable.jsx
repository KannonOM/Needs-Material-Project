import Button from "../ui/Button";
import Card from "../ui/Card";

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
}) {
  return (
    <Card className="table-panel work-order-panel">
      <div className="panel-head">
        <h2>Active Needs Material</h2>
        <span>{visibleRows.length} records shown</span>
      </div>
      <div className="tablewrap tablewrap-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  <button
                    type="button"
                    className="th-sort"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    <span className="sort-indicator">
                      {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadingRows ? (
              <tr>
                <td colSpan="10" className="empty">
                  <div className="table-loading">
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <p>Loading work orders…</p>
                  </div>
                </td>
              </tr>
            ) : visibleRows.length ? (
              visibleRows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.work_order}</td>
                  <td className="mono">{r.customer_po || "—"}</td>
                  <td>{r.customer}</td>
                  <td>{r.due_date}</td>
                  <td className="mono">{r.part_number}</td>
                  <td>{r.quantity}</td>
                  <td>{categorySummary(r, "Flats")}</td>
                  <td>{categorySummary(r, "Shapes")}</td>
                  <td>{r.owner}</td>
                  <td>
                    <Button onClick={() => onEdit(r)}>
                      {canEdit ? "Edit" : "View"}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty">
                  No matching Need Material orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
