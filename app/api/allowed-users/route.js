import { requireAdministrator } from "../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../lib/supabase/server";
import { normalizeEmail } from "../../../lib/auth/allowlist";
import { ROLES } from "../../../lib/auth/permissions";
import {
  FORM_ROLES,
  STATUS,
  mapAllowedUser,
  normalizeStatus,
  parseAssignableRole,
} from "../../../lib/auth/user-labels";

export const dynamic = "force-dynamic";

const SELECT_FIELDS =
  "id, email, full_name, role, status, invited_at, accepted_at, created_at, updated_at, disabled_at";

export async function GET() {
  const { error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("allowed_users")
      .select(SELECT_FIELDS)
      .order("full_name", { ascending: true });

    if (error) throw error;
    return Response.json({ users: (data || []).map(mapAllowedUser) });
  } catch (error) {
    console.error("GET /api/allowed-users failed", error);
    return Response.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { user, error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const fullName = String(body.name || body.full_name || "").trim();
    const role = parseAssignableRole(body.role || FORM_ROLES.BUYER);
    const status = normalizeStatus(body.status || STATUS.INVITED);

    if (!fullName) {
      return Response.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return Response.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!role || (role !== ROLES.ADMINISTRATOR && role !== ROLES.PURCHASING)) {
      return Response.json(
        { error: "Role must be administrator or buyer" },
        { status: 400 }
      );
    }
    if (!status) {
      return Response.json(
        { error: "Status must be active, invited, or inactive" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("allowed_users")
      .insert({
        email,
        full_name: fullName,
        role,
        status,
        invited_at: now,
        disabled_at: status === STATUS.INACTIVE ? now : null,
        created_by: user.id,
      })
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "That email is already on the allowlist" },
          { status: 409 }
        );
      }
      throw error;
    }

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "invite_user",
      record_type: "allowed_users",
      record_id: data.id,
      field_name: "status",
      old_value: null,
      new_value: status,
    });

    return Response.json({
      user: mapAllowedUser(data),
      note: "User created on the allowlist. Invitation email delivery is not wired yet.",
    });
  } catch (error) {
    console.error("POST /api/allowed-users failed", error);
    return Response.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
