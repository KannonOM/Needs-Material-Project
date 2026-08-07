export default function ActiveOrdersBar({ count }) {
  return (
    <div className="active-orders-bar" role="status">
      <strong>{count} Active Work Orders</strong>
      <span>Showing work orders with Status = Need Material</span>
    </div>
  );
}
