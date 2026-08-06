import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

export default function SearchFilters({
  search,
  setSearch,
  kpiFilter,
  setKpiFilter,
}) {
  return (
    <Card className="search-filters">
      <Input
        className="search-input"
        placeholder="Search WO, customer PO, customer, part, material, owner, or notes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search work orders"
      />
      {kpiFilter !== "all" && (
        <Button type="button" onClick={() => setKpiFilter("all")}>
          Clear KPI filter
        </Button>
      )}
    </Card>
  );
}
