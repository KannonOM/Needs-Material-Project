import Card from "../ui/Card";

export default function ActiveOrdersBar({ count }) {
  return (
    <Card className="active-orders-bar">
      <div>
        <strong>{count} Active Work Orders</strong>
        <span>Showing work orders with Status = Need Material</span>
      </div>
    </Card>
  );
}
