import Input from "../ui/Input";

const QUICK_FILTERS = [
  { id: "overdue_ship", label: "Overdue" },
  { id: "due_this_week", label: "Due This Week" },
  { id: "late_suppliers", label: "Late Supplier" },
  { id: "waiting_quote", label: "Waiting on Quote" },
  { id: "unassigned", label: "Unassigned Owner" },
];

export default function SearchFilters({
  search,
  setSearch,
  kpiFilter,
  setKpiFilter,
}) {
  const hasActiveFilter = kpiFilter !== "all";

  return (
    <div className="search-filters table-filters">
      <div className="table-filters-row">
        <Input
          className="search-input"
          placeholder="Search WO, customer PO, customer, part, description, material, owner, or notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search work orders"
        />
        {hasActiveFilter && (
          <button
            type="button"
            className="clear-filters-link"
            onClick={() => setKpiFilter("all")}
          >
            Clear Filters
          </button>
        )}
      </div>
      <div className="quick-filters" role="group" aria-label="Quick filters">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`quick-filter${kpiFilter === filter.id ? " active" : ""}`}
            onClick={() =>
              setKpiFilter((prev) =>
                prev === filter.id ? "all" : filter.id
              )
            }
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
