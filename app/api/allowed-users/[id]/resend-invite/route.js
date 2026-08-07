import { requireAdministrator } from "../../../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../../../lib/supabase/server";
import { STATUS, mapAllowedUser } from "../../../../../lib/auth/user-labels";
import { isUuid } from "../../../../../lib/needs-material/map";
import {
  getAppBaseUrl,
  isInviteEmailConfigured,
  sendInviteEmail,
} from "../../../../../lib/email/invite";

export const dynamic = "force-dynamic";

export async function POST(_request, context) {
  const { user, error: authError } = await requireAdministrator();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (!isInviteEmailConfigured()) {
      return Response.json(
        {
          error:
            "Invitation email is not configured. Set RESEND_API_KEY and INVITE_FROM_EMAIL, or use Copy Sign-In Link.",
          inviteEmailConfigured: false,
          signInUrl: getAppBaseUrl(),
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("allowed_users")
      .select(
        "id, email, full_name, role, status, invited_at, accepted_at, created_at, updated_at, disabled_at"
      )
      .eq("id", id)
      .single();

    if (existingError) throw existingError;

    if (existing.status !== STATUS.INVITED) {
      return Response.json(
        { error: "Resend Invite is only available for invited users" },
        { status: 400 }
      );
    }

    const emailResult = await sendInviteEmail({
      to: existing.email,
      fullName: existing.full_name,
      role: existing.role,
    });

    if (!emailResult.sent) {
      return Response.json(
        {
          error: emailResult.reason || "Invitation email could not be sent",
          inviteEmailConfigured: true,
          signInUrl: getAppBaseUrl(),
        },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("allowed_users")
      .update({ invited_at: now })
      .eq("id", id)
      .select(
        "id, email, full_name, role, status, invited_at, accepted_at, created_at, updated_at, disabled_at"
      )
      .single();
    if (updateError) throw updateError;

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "resend_invite",
      record_type: "allowed_users",
      record_id: id,
      field_name: "invited_at",
      old_value: existing.invited_at,
      new_value: now,
    });

    return Response.json({
      user: mapAllowedUser(updated),
      note: `Invitation resent to ${updated.email}`,
      email: emailResult,
      inviteEmailConfigured: true,
      signInUrl: getAppBaseUrl(),
    });
  } catch (error) {
    console.error("POST /api/allowed-users/[id]/resend-invite failed", error);
    return Response.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
