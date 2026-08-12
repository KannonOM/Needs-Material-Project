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
import {
  getAppBaseUrl,
  isInviteEmailConfigured,
  isLocalAppUrl,
  sendInviteEmail,
} from "../../../lib/email/invite";

export const dynamic = "force-dynamic";

const SELECT_FIELDS_BASE =
  "id, email, full_name, role, status, invited_at, accepted_at, created_at, updated_at, disabled_at";
const SELECT_FIELDS_WITH_SIGN_IN = `${SELECT_FIELDS_BASE}, last_sign_in_at`;

async function selectAllowedUsers(supabase) {
  const withSignIn = await supabase
    .from("allowed_users")
    .select(SELECT_FIELDS_WITH_SIGN_IN)
    .order("full_name", { ascending: true });

  if (!withSignIn.error) return withSignIn;

  if (/last_sign_in_at/i.test(withSignIn.error.message || "")) {
    return supabase
      .from("allowed_users")
      .select(SELECT_FIELDS_BASE)
      .order("full_name", { ascending: true });
  }
  return withSignIn;
}

async function selectAllowedUserById(supabase, id) {
  const withSignIn = await supabase
    .from("allowed_users")
    .select(SELECT_FIELDS_WITH_SIGN_IN)
    .eq("id", id)
    .single();

  if (!withSignIn.error) return withSignIn;

  if (/last_sign_in_at/i.test(withSignIn.error.message || "")) {
    return supabase
      .from("allowed_users")
      .select(SELECT_FIELDS_BASE)
      .eq("id", id)
      .single();
  }
  return withSignIn;
}

export async function GET() {
  const { error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await selectAllowedUsers(supabase);
    if (error) throw error;

    return Response.json({
      users: (data || []).map(mapAllowedUser),
      inviteEmailConfigured: isInviteEmailConfigured(),
      signInUrl: getAppBaseUrl(),
      isLocalSignInUrl: isLocalAppUrl(),
    });
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
    const { data: created, error } = await supabase
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
      .select(SELECT_FIELDS_BASE)
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
      record_id: created.id,
      field_name: "status",
      old_value: null,
      new_value: status,
    });

    const { data } = await selectAllowedUserById(supabase, created.id);
    const mapped = mapAllowedUser(data || created);

    let emailResult = { sent: false, reason: null };
    if (status === STATUS.INVITED) {
      emailResult = await sendInviteEmail({
        to: email,
        fullName,
        role,
      });
    }

    let note = `${mapped.name} added to the allowlist.`;
    if (status === STATUS.INVITED) {
      note = emailResult.sent
        ? `${mapped.name} added and invitation email sent.`
        : `${mapped.name} added. ${emailResult.reason || "Invitation email was not sent."}`;
    }

    return Response.json({
      user: mapped,
      note,
      email: emailResult,
      inviteEmailConfigured: isInviteEmailConfigured(),
      signInUrl: getAppBaseUrl(),
      isLocalSignInUrl: isLocalAppUrl(),
    });
  } catch (error) {
    console.error("POST /api/allowed-users failed", error);
    return Response.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
