export const ROLES = {
  ADMINISTRATOR: "administrator",
  PURCHASING: "purchasing",
  SCHEDULER: "scheduler",
  VIEWER: "viewer",
};

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export function canViewDashboard(role) {
  const r = normalizeRole(role);
  return (
    r === ROLES.ADMINISTRATOR ||
    r === ROLES.PURCHASING ||
    r === ROLES.SCHEDULER ||
    r === ROLES.VIEWER
  );
}

export function canEditPurchasingFields(role) {
  const r = normalizeRole(role);
  return (
    r === ROLES.ADMINISTRATOR ||
    r === ROLES.PURCHASING ||
    r === ROLES.SCHEDULER
  );
}

export function canManualRefresh(role) {
  const r = normalizeRole(role);
  return r === ROLES.ADMINISTRATOR || r === ROLES.SCHEDULER;
}

export function canManageUsers(role) {
  return normalizeRole(role) === ROLES.ADMINISTRATOR;
}

export function displayRole(role) {
  const r = normalizeRole(role);
  if (r === ROLES.ADMINISTRATOR) return "Administrator";
  if (r === ROLES.PURCHASING) return "Purchasing";
  if (r === ROLES.SCHEDULER) return "Scheduler";
  if (r === ROLES.VIEWER) return "Viewer";
  return role || "Unknown";
}

export function initialsFromName(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
