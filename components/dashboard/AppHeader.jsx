import Button from "../ui/Button";

export default function AppHeader({
  page,
  setPage,
  canAdmin,
  userName,
  userRoleLabel,
  initials,
  onSignOut,
  onRefreshHistory,
}) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <button
          type="button"
          className="app-header-titles"
          onClick={() => setPage("dashboard")}
        >
          <h1>Needs Material Dashboard</h1>
          <p>Purchasing Work Queue</p>
        </button>
        <nav className="app-header-nav" aria-label="Primary">
          <button
            type="button"
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>
          {canAdmin && (
            <button
              type="button"
              className={page === "admin" ? "active" : ""}
              onClick={() => setPage("admin")}
            >
              Administration
            </button>
          )}
        </nav>
      </div>

      <div className="app-header-user">
        <button
          type="button"
          className={`header-history-link${page === "history" ? " active" : ""}`}
          onClick={onRefreshHistory}
        >
          Refresh History
        </button>
        <div className="avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="user-menu">
          <b>{userName}</b>
          <span>{userRoleLabel}</span>
        </div>
        <Button className="header-signout" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
