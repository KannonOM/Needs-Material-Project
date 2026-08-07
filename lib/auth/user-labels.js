import { ROLES, normalizeRole } from "./permissions";

/** UI/API aliases mapped onto existing DB check constraints. */
export const STATUS = {
  ACTIVE: "active",
  INVITED: "pending",
  INACTIVE: "disabled",
};

export const FORM_ROLES = {
  ADMINISTRATOR: ROLES.ADMINISTRATOR,
  BUYER: ROLES.PURCHASING,
};

export function normalizeStatus(input) {
  const value = String(input || "")
    .trim()
    .toLowerCase();
  if (value === "invited" || value === "pending") return STATUS.INVITED;
  if (value === "inactive" || value === "disabled") return STATUS.INACTIVE;
  if (value === "active") return STATUS.ACTIVE;
  return null;
}

export function parseAssignableRole(input) {
  const value = normalizeRole(input);
  if (value === "buyer" || value === ROLES.PURCHASING) return ROLES.PURCHASING;
  if (value === ROLES.ADMINISTRATOR) return ROLES.ADMINISTRATOR;
  if (value === ROLES.SCHEDULER || value === ROLES.VIEWER) return value;
  return null;
}

export function displayStatus(status) {
  const key = normalizeStatus(status) || String(status || "").toLowerCase();
  if (key === STATUS.ACTIVE) return "Active";
  if (key === STATUS.INVITED) return "Invited";
  if (key === STATUS.INACTIVE) return "Inactive";
  return status || "Unknown";
}

export function displayAdminRole(role) {
  const key = normalizeRole(role);
  if (key === ROLES.ADMINISTRATOR) return "Administrator";
  if (key === ROLES.PURCHASING) return "Buyer";
  if (key === ROLES.SCHEDULER) return "Scheduler";
  if (key === ROLES.VIEWER) return "Viewer";
  return role || "Unknown";
}

export function formatAdminDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function mapAllowedUser(row) {
  return {
    id: row.id,
    name: row.full_name,
    email: String(row.email || "").trim().toLowerCase(),
    role: displayAdminRole(row.role),
    roleKey: normalizeRole(row.role),
    status: displayStatus(row.status),
    statusKey: row.status,
    invited_at: row.invited_at || null,
    accepted_at: row.accepted_at || null,
    last_sign_in_at: row.last_sign_in_at || null,
    updated_at: row.updated_at || row.created_at || null,
    invitedLabel: formatAdminDate(row.invited_at),
    acceptedLabel: formatAdminDate(row.accepted_at),
    lastSignInLabel: formatAdminDate(row.last_sign_in_at),
    updatedLabel: formatAdminDate(row.updated_at || row.created_at),
  };
}
