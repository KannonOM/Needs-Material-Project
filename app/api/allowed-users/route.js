import { requireAdministrator } from "../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../lib/supabase/server";
import { normalizeEmail } from "../../../lib/auth/allowlist";
import { displayRole, normalizeRole, ROLES } from "../../../lib/auth/permissions";

export const dynamic = "force-dynamic";

const ROLE_SET = new Set(Object.values(ROLES));

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
    invited_at: row.invited_at,
    accepted_at: row.accepted_at,
  };
}

function parseRole(input) {
  const key = normalizeRole(input);
  if (ROLE_SET.has(key)) return key;
  return null;
}

export async function GET() {
  const { error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("allowed_users")
      .select(
        "id, email, full_name, role, status, invited_at, accepted_at, created_at"
      )
      .order("full_name", { ascending: true });

    if (error) throw error;
    return Response.json({ users: (data || []).map(mapUser) });
  } catch (error) {
    console.error("GET /api/allowed-users failed", error);
    return Response.json(
      { error: error?.message || "Failed to load users" },
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
    const role = parseRole(body.role);

    if (!fullName || !email.includes("@") || !role) {
      return Response.json(
        { error: "Name, valid email, and role are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("allowed_users")
      .insert({
        email,
        full_name: fullName,
        role,
        status: "pending",
        invited_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select(
        "id, email, full_name, role, status, invited_at, accepted_at, created_at"
      )
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
      new_value: "pending",
    });

    return Response.json({
      user: mapUser(data),
      note: "Allowlist entry created. Invitation email delivery is not wired yet.",
    });
  } catch (error) {
    console.error("POST /api/allowed-users failed", error);
    return Response.json(
      { error: error?.message || "Failed to invite user" },
      { status: 500 }
    );
  }
}
