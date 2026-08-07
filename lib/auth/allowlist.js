import { getSupabaseAdmin } from "../supabase/server";
import { canViewDashboard, normalizeRole } from "./permissions";
import { STATUS } from "./user-labels";

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/** Escape % and _ so ilike performs an exact, case-insensitive match. */
function escapeIlikeExact(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function mapAllowed(data) {
  return {
    id: data.id,
    email: normalizeEmail(data.email),
    fullName: data.full_name,
    role: normalizeRole(data.role),
    status: data.status,
    acceptedAt: data.accepted_at || null,
  };
}

/**
 * Look up any allowlisted user by email (any status).
 * Used to distinguish inactive vs unknown on access denied.
 */
export async function findAllowedUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("allowed_users")
    .select("id, email, full_name, role, status, accepted_at")
    .ilike("email", escapeIlikeExact(normalized))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapAllowed(data);
}

/**
 * Users who may complete Microsoft sign-in: active or invited (pending).
 * Inactive / disabled users are blocked.
 */
export async function findSignInAllowedUser(email) {
  const allowed = await findAllowedUserByEmail(email);
  if (!allowed) return null;
  if (allowed.status !== STATUS.ACTIVE && allowed.status !== STATUS.INVITED) {
    return null;
  }
  if (!canViewDashboard(allowed.role)) return null;
  return allowed;
}

/**
 * Look up an allowlisted active user by Microsoft email.
 * Matching is case-insensitive (trim + lowercase / ilike).
 * Returns null when missing, pending, disabled, or role is unknown.
 */
export async function findActiveAllowedUser(email) {
  const allowed = await findAllowedUserByEmail(email);
  if (!allowed) return null;
  if (allowed.status !== STATUS.ACTIVE) return null;
  if (!canViewDashboard(allowed.role)) return null;
  return allowed;
}

async function writeAudit(supabase, entry) {
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) throw error;
}

/**
 * After successful Microsoft auth + allowlist match:
 * - invited (pending) → active, set accepted_at if empty, preserve invited_at/role
 * - active → set accepted_at if empty
 * - always refresh last_sign_in_at when the column exists
 */
export async function completeSuccessfulSignIn(allowed) {
  if (!allowed?.id) return;

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const wasInvited = allowed.status === STATUS.INVITED;
  const patch = {
    last_sign_in_at: now,
  };

  if (wasInvited) {
    patch.status = STATUS.ACTIVE;
    patch.disabled_at = null;
    if (!allowed.acceptedAt) patch.accepted_at = now;
  } else if (!allowed.acceptedAt) {
    patch.accepted_at = now;
  }

  let { error } = await supabase
    .from("allowed_users")
    .update(patch)
    .eq("id", allowed.id);

  // Migration 005 may not be applied yet — retry without last_sign_in_at.
  if (error && /last_sign_in_at/i.test(error.message || "")) {
    delete patch.last_sign_in_at;
    ({ error } = await supabase
      .from("allowed_users")
      .update(patch)
      .eq("id", allowed.id));
  }
  if (error) throw error;

  if (wasInvited) {
    await writeAudit(supabase, {
      user_id: allowed.id,
      action: "accept_invite",
      record_type: "allowed_users",
      record_id: allowed.id,
      field_name: "status",
      old_value: STATUS.INVITED,
      new_value: STATUS.ACTIVE,
    });
  }
}

/** @deprecated Prefer completeSuccessfulSignIn — kept for compatibility. */
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
