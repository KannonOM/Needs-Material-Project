"use client";

import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import UserTable from "./UserTable";
import UserFormModal from "./UserFormModal";

export default function AdminPage({
  users,
  loading,
  currentUserEmail,
  inviteEmailConfigured = false,
  isLocalSignInUrl = true,
  onCreate,
  onUpdate,
  onActivate,
  onDeactivate,
  onResendInvite,
  onCopySignInLink,
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter === "buyer" && user.roleKey !== "purchasing") return false;
      if (roleFilter === "administrator" && user.roleKey !== "administrator") {
        return false;
      }
      if (roleFilter === "other" && ["administrator", "purchasing"].includes(user.roleKey)) {
        return false;
      }
      if (statusFilter !== "all") {
        const map = {
          active: "active",
          invited: "pending",
          inactive: "disabled",
        };
        if (user.statusKey !== map[statusFilter]) return false;
      }
      if (!q) return true;
      return `${user.name} ${user.email}`.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await onUpdate(modal.user, payload);
      } else {
        await onCreate(payload);
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard-stack admin-page">
      <div className="page-head">
        <div>
          <h1>Administration</h1>
          <p>Manage dashboard access and purchasing users</p>
          {isLocalSignInUrl && (
            <p className="admin-email-note">
              Local development mode: copied sign-in links only work on this
              computer. External user sign-in should be tested after deployment.
            </p>
          )}
          {!inviteEmailConfigured && (
            <p className="admin-email-note admin-email-note-secondary">
              Email invitations are not configured.
            </p>
          )}
        </div>
        <div className="actions">
          <Button variant="primary" onClick={() => setModal({ mode: "create" })}>
            Add User
          </Button>
        </div>
      </div>

      <div className="search-filters table-filters admin-filters">
        <div className="table-filters-row admin-filters-row">
          <Input
            className="search-input"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
          <label className="filter-select-wrap">
            <span className="filter-select-label">Role</span>
            <select
              className="control filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              <option value="administrator">Administrator</option>
              <option value="buyer">Buyer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="filter-select-wrap">
            <span className="filter-select-label">Status</span>
            <select
              className="control filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>

      <UserTable
        users={visibleUsers}
        loading={loading}
        currentUserEmail={currentUserEmail}
        inviteEmailConfigured={inviteEmailConfigured}
        isLocalSignInUrl={isLocalSignInUrl}
        onEdit={(user) => setModal({ mode: "edit", user })}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        onResendInvite={onResendInvite}
        onCopySignInLink={onCopySignInLink}
      />

      {modal && (
        <UserFormModal
          mode={modal.mode}
          initial={modal.user || null}
          saving={saving}
          onClose={() => !saving && setModal(null)}
          onSave={handleSave}
        />
      )}
    </section>
  );
}
