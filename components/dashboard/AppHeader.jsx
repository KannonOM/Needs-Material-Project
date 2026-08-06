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
        <div className="app-header-titles">
          <h1>Needs Material Dashboard</h1>
          <p>Purchasing Work Queue</p>
        </div>
      </div>
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
        <button type="button" className="nav-link" onClick={onRefreshHistory}>
          Refresh History
        </button>
      </nav>
      <div className="app-header-user">
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
