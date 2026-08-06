import { requireAdministrator } from "../../../../lib/auth/api";
import { normalizeEmail } from "../../../../lib/auth/allowlist";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { displayRole, normalizeRole, ROLES } from "../../../../lib/auth/permissions";
import { isUuid } from "../../../../lib/needs-material/map";

export const dynamic = "force-dynamic";

const PRIMARY_ADMIN_EMAIL = "cvieux@kannonmfg.com";
const ROLE_SET = new Set(Object.values(ROLES));

function isPrimaryAdmin(email) {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.full_name,
    email: normalizeEmail(row.email),
    role: displayRole(row.role),
    roleKey: normalizeRole(row.role),
    status: String(row.status || "")
      .replace(/^\w/, (c) => c.toUpperCase()),
    statusKey: row.status,
    last: row.accepted_at
      ? new Date(row.accepted_at).toLocaleDateString("en-US")
      : row.invited_at
        ? "Invited"
        : "Never",
  };
}

export async function PATCH(request, context) {
  const { user, error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("allowed_users")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError) throw existingError;

    const patch = {};
    const audits = [];

    if (body.status !== undefined) {
      const status = String(body.status).trim().toLowerCase();
      if (!["active", "pending", "disabled"].includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      if (isPrimaryAdmin(existing.email) && status !== "active") {
        return Response.json(
          { error: "The primary administrator cannot be disabled" },
          { status: 400 }
        );
      }
      if (existing.status !== status) {
        patch.status = status;
        audits.push({
          user_id: user.id,
          action: status === "disabled" ? "disable_user" : "update_field",
          record_type: "allowed_users",
          record_id: id,
          field_name: "status",
          old_value: existing.status,
          new_value: status,
        });
      }
    }

    if (body.role !== undefined) {
      const role = normalizeRole(body.role);
      if (!ROLE_SET.has(role)) {
        return Response.json({ error: "Invalid role" }, { status: 400 });
      }
      if (isPrimaryAdmin(existing.email) && role !== ROLES.ADMINISTRATOR) {
        return Response.json(
          { error: "The primary administrator role cannot be changed" },
          { status: 400 }
        );
      }
      if (existing.role !== role) {
        patch.role = role;
        audits.push({
          user_id: user.id,
          action: "update_field",
          record_type: "allowed_users",
          record_id: id,
          field_name: "role",
          old_value: existing.role,
          new_value: role,
        });
      }
    }

    if (!Object.keys(patch).length) {
      return Response.json({ user: mapUser(existing) });
    }

    const { data, error } = await supabase
      .from("allowed_users")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    if (audits.length) {
      const { error: auditError } = await supabase.from("audit_log").insert(audits);
      if (auditError) throw auditError;
    }

    return Response.json({ user: mapUser(data) });
  } catch (error) {
    console.error("PATCH /api/allowed-users/[id] failed", error);
    return Response.json(
      { error: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, context) {
  const { user, error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("allowed_users")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError) throw existingError;

    if (isPrimaryAdmin(existing.email)) {
      return Response.json(
        { error: "The primary administrator cannot be removed" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("allowed_users").delete().eq("id", id);
    if (error) throw error;

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "remove_user",
      record_type: "allowed_users",
      record_id: id,
      field_name: "email",
      old_value: existing.email,
      new_value: null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/allowed-users/[id] failed", error);
    return Response.json(
      { error: error?.message || "Failed to remove user" },
      { status: 500 }
    );
  }
}
