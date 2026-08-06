import { getSupabaseAdmin } from "../supabase/server";
import { canViewDashboard, normalizeRole } from "./permissions";

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/** Escape % and _ so ilike performs an exact, case-insensitive match. */
function escapeIlikeExact(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Look up an allowlisted active user by Microsoft email.
 * Matching is case-insensitive (trim + lowercase / ilike).
 * Returns null when missing, pending, disabled, or role is unknown.
 */
export async function findActiveAllowedUser(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("id, email, full_name, role, status")
    .ilike("email", escapeIlikeExact(normalized))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (data.status !== "active") return null;
  if (!canViewDashboard(data.role)) return null;

  return {
    id: data.id,
    email: normalizeEmail(data.email),
    fullName: data.full_name,
    role: normalizeRole(data.role),
    status: data.status,
  };
}

export async function markAllowedUserAccepted(userId) {
  if (!userId) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("allowed_users")
    .update({
      accepted_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .is("accepted_at", null);
  if (error) throw error;
}
