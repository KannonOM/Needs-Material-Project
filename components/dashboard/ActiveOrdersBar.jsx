export default function ActiveOrdersBar({ count }) {
  return (
    <div className="active-orders-bar" role="status">
      <span className="active-orders-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="20" height="20">
          <circle cx="10" cy="10" r="9" fill="#2463eb" />
          <rect x="9" y="8" width="2" height="7" rx="1" fill="#fff" />
          <circle cx="10" cy="5.5" r="1.2" fill="#fff" />
        </svg>
      </span>
      <div className="active-orders-copy">
        <strong>{count} Active Work Orders</strong>
        <span>Showing work orders with Status = &quot;Need Material&quot;</span>
      </div>
    </div>
  );
}
