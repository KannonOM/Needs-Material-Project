"use client";

import { useState } from "react";
import Button from "../ui/Button";

export default function UserFormModal({
  mode = "create",
  initial = null,
  saving = false,
  onClose,
  onSave,
}) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [role, setRole] = useState(() => {
    if (initial?.roleKey === "administrator") return "administrator";
    if (initial?.roleKey === "purchasing") return "buyer";
    return initial?.roleKey || "buyer";
  });
  const [status, setStatus] = useState(
    initial?.statusKey === "active"
      ? "active"
      : initial?.statusKey === "disabled"
        ? "inactive"
        : "invited"
  );
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!isEdit && (!email.trim() || !email.includes("@"))) {
      setError("A valid email is required.");
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        status,
      });
    } catch (err) {
      setError(err.message || "Could not save user");
    }
  }

  return (
    <div className="modal-back">
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <h2>{isEdit ? "Edit User" : "Add User"}</h2>
            <p className="modal-subtitle">
              {isEdit
                ? "Update access details for this dashboard user."
                : "Create an allowlist entry for Microsoft sign-in."}
            </p>
          </div>
          <button
            type="button"
            className="x"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              required
            />
          </div>
          <div className={`field${isEdit ? " readonly-field" : ""}`}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving || isEdit}
              readOnly={isEdit}
              required={!isEdit}
            />
          </div>
          <div className="edit-grid">
            <div className="field">
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={saving}
              >
                <option value="buyer">Buyer</option>
                <option value="administrator">Administrator</option>
                {isEdit &&
                  initial?.roleKey &&
                  !["administrator", "purchasing"].includes(initial.roleKey) && (
                    <option value={initial.roleKey}>
                      {initial.role} (existing)
                    </option>
                  )}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
              >
                <option value="invited">Invited</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-foot">
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add User"}
          </Button>
        </div>
      </form>
    </div>
  );
}
