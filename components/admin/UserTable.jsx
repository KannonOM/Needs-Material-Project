import Button from "../ui/Button";
import Card from "../ui/Card";

function statusClass(statusKey) {
  if (statusKey === "active") return "active";
  if (statusKey === "pending") return "invited";
  return "inactive";
}

export default function UserTable({
  users,
  loading,
  currentUserEmail,
  onEdit,
  onActivate,
  onDeactivate,
}) {
  return (
    <Card className="table-panel admin-users-panel">
      <div className="panel-head">
        <h2>Dashboard users</h2>
        <span>{loading ? "Loading…" : `${users.length} users`}</span>
      </div>
      <div className="tablewrap tablewrap-paged">
        <table className="table admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Invited</th>
              <th>Accepted</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="empty">
                  Loading users…
                </td>
              </tr>
            ) : users.length ? (
              users.map((user) => {
                const isSelf =
                  String(user.email || "").toLowerCase() ===
                  String(currentUserEmail || "").toLowerCase();
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      {isSelf && <span className="you-tag">You</span>}
                    </td>
                    <td className="mono">{user.email}</td>
                    <td>
                      <span className="role">{user.role}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(user.statusKey)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.invitedLabel}</td>
                    <td>{user.acceptedLabel}</td>
                    <td>{user.updatedLabel}</td>
                    <td className="admin-actions">
                      <Button className="edit-btn" onClick={() => onEdit(user)}>
                        Edit
                      </Button>
                      {user.statusKey === "active" ? (
                        <Button
                          className="edit-btn"
                          onClick={() => onDeactivate(user)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "You cannot deactivate your own account"
                              : "Deactivate user"
                          }
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          className="edit-btn"
                          variant="primary"
                          onClick={() => onActivate(user)}
                        >
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="empty">
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
