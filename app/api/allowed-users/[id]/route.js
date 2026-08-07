import { requireAdministrator } from "../../../../lib/auth/api";
import { normalizeEmail } from "../../../../lib/auth/allowlist";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { ROLES } from "../../../../lib/auth/permissions";
import {
  STATUS,
  mapAllowedUser,
  normalizeStatus,
  parseAssignableRole,
} from "../../../../lib/auth/user-labels";
import { isUuid } from "../../../../lib/needs-material/map";

export const dynamic = "force-dynamic";

const PRIMARY_ADMIN_EMAIL = "cvieux@kannonmfg.com";
const SELECT_FIELDS =
  "id, email, full_name, role, status, invited_at, accepted_at, created_at, updated_at, disabled_at";

function isPrimaryAdmin(email) {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}

async function countActiveAdministrators(supabase, excludeId = null) {
  let query = supabase
    .from("allowed_users")
    .select("id", { count: "exact", head: true })
    .eq("role", ROLES.ADMINISTRATOR)
    .eq("status", STATUS.ACTIVE);
  if (excludeId) query = query.neq("id", excludeId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function auditActionForStatus(oldStatus, newStatus) {
  if (newStatus === STATUS.ACTIVE && oldStatus !== STATUS.ACTIVE) {
    return "activate_user";
  }
  if (newStatus === STATUS.INACTIVE && oldStatus !== STATUS.INACTIVE) {
    return "deactivate_user";
  }
  return "update_field";
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
    const now = new Date().toISOString();

    if (body.full_name !== undefined || body.name !== undefined) {
      const fullName = String(body.full_name || body.name || "").trim();
      if (!fullName) {
        return Response.json({ error: "Full name is required" }, { status: 400 });
      }
      if (existing.full_name !== fullName) {
        patch.full_name = fullName;
        audits.push({
          user_id: user.id,
          action: "update_field",
          record_type: "allowed_users",
          record_id: id,
          field_name: "full_name",
          old_value: existing.full_name,
          new_value: fullName,
        });
      }
    }

    if (body.status !== undefined) {
      const status = normalizeStatus(body.status);
      if (!status) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }

      if (existing.id === user.id && status === STATUS.INACTIVE) {
        return Response.json(
          { error: "You cannot deactivate your own account" },
          { status: 400 }
        );
      }

      if (isPrimaryAdmin(existing.email) && status !== STATUS.ACTIVE) {
        return Response.json(
          { error: "The primary administrator cannot be deactivated" },
          { status: 400 }
        );
      }

      if (
        existing.role === ROLES.ADMINISTRATOR &&
        existing.status === STATUS.ACTIVE &&
        status !== STATUS.ACTIVE
      ) {
        const others = await countActiveAdministrators(supabase, existing.id);
        if (others < 1) {
          return Response.json(
            { error: "Cannot deactivate the only active administrator" },
            { status: 400 }
          );
        }
      }

      if (existing.status !== status) {
        patch.status = status;
        patch.disabled_at = status === STATUS.INACTIVE ? now : null;
        audits.push({
          user_id: user.id,
          action: auditActionForStatus(existing.status, status),
          record_type: "allowed_users",
          record_id: id,
          field_name: "status",
          old_value: existing.status,
          new_value: status,
        });
      }
    }

    if (body.role !== undefined) {
      const role = parseAssignableRole(body.role);
      if (!role) {
        return Response.json({ error: "Invalid role" }, { status: 400 });
      }

      if (isPrimaryAdmin(existing.email) && role !== ROLES.ADMINISTRATOR) {
        return Response.json(
          { error: "The primary administrator role cannot be changed" },
          { status: 400 }
        );
      }

      if (
        existing.role === ROLES.ADMINISTRATOR &&
        existing.status === STATUS.ACTIVE &&
        role !== ROLES.ADMINISTRATOR
      ) {
        const others = await countActiveAdministrators(supabase, existing.id);
        if (others < 1) {
          return Response.json(
            {
              error:
                "Cannot remove administrator role from the only active administrator",
            },
            { status: 400 }
          );
        }
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
      return Response.json({ user: mapAllowedUser(existing) });
    }

    const { data, error } = await supabase
      .from("allowed_users")
      .update(patch)
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();
    if (error) throw error;

    if (audits.length) {
      const { error: auditError } = await supabase.from("audit_log").insert(audits);
      if (auditError) throw auditError;
    }

    return Response.json({ user: mapAllowedUser(data) });
  } catch (error) {
    console.error("PATCH /api/allowed-users/[id] failed", error);
    return Response.json(
      { error: "Failed to update user" },
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

    if (existing.id === user.id) {
      return Response.json(
        { error: "You cannot remove your own account" },
        { status: 400 }
      );
    }

    if (
      existing.role === ROLES.ADMINISTRATOR &&
      existing.status === STATUS.ACTIVE
    ) {
      const others = await countActiveAdministrators(supabase, existing.id);
      if (others < 1) {
        return Response.json(
          { error: "Cannot remove the only active administrator" },
          { status: 400 }
        );
      }
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
      { error: "Failed to remove user" },
      { status: 500 }
    );
  }
}
