import { auth } from "../../auth";
import { findActiveAllowedUser } from "./allowlist";
import {
  canEditPurchasingFields,
  canManageUsers,
  canManualRefresh,
  canViewDashboard,
} from "./permissions";

export async function getActiveSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const allowed = await findActiveAllowedUser(email);
  if (!allowed || !canViewDashboard(allowed.role)) return null;
  return allowed;
}

export async function requireViewer() {
  const user = await getActiveSessionUser();
  if (!user) {
    return {
      user: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireEditor() {
  const result = await requireViewer();
  if (result.error) return result;
  if (!canEditPurchasingFields(result.user.role)) {
    return {
      user: result.user,
      error: Response.json(
        { error: "Forbidden: read-only role cannot edit" },
        { status: 403 }
      ),
    };
  }
  return result;
}

export async function requireAdministrator() {
  const result = await requireViewer();
  if (result.error) return result;
  if (!canManageUsers(result.user.role)) {
    return {
      user: result.user,
      error: Response.json(
        { error: "Forbidden: administrator role required" },
        { status: 403 }
      ),
    };
  }
  return result;
}

export async function requireRefreshRole() {
  const result = await requireViewer();
  if (result.error) return result;
  if (!canManualRefresh(result.user.role)) {
    return {
      user: result.user,
      error: Response.json(
        { error: "Forbidden: refresh requires scheduler or administrator" },
        { status: 403 }
      ),
    };
  }
  return result;
}
