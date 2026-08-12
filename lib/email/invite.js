import { displayAdminRole } from "../auth/user-labels";

export function getAppBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return String(raw).trim().replace(/\/$/, "") || "http://localhost:3000";
}

/** True when the configured app URL is localhost / loopback (not shareable externally). */
export function isLocalAppUrl(url = getAppBaseUrl()) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return true;
  }
}

export function isInviteEmailConfigured() {
  return Boolean(
    String(process.env.RESEND_API_KEY || "").trim() &&
      String(process.env.INVITE_FROM_EMAIL || "").trim()
  );
}

function buildInviteContent({ fullName, role, signInUrl }) {
  const roleLabel = displayAdminRole(role);
  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  const text = [
    greeting,
    "",
    "You have been granted access to the Needs Material Dashboard at Kannon Manufacturing.",
    "",
    `Assigned role: ${roleLabel}`,
    "",
    "Sign in with your Kannon Microsoft account here:",
    signInUrl,
    "",
    "Use the same Microsoft 365 email that received this invitation. No dashboard password is required.",
    "",
    "If you were not expecting this message, contact a Needs Material Dashboard administrator.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1f2937">
      <p>${greeting}</p>
      <p>You have been granted access to the <strong>Needs Material Dashboard</strong> at Kannon Manufacturing.</p>
      <p><strong>Assigned role:</strong> ${roleLabel}</p>
      <p>Sign in with your Kannon Microsoft account:</p>
      <p><a href="${signInUrl}">${signInUrl}</a></p>
      <p>Use the same Microsoft 365 email that received this invitation. No dashboard password is required.</p>
      <p style="color:#6b7280;font-size:13px">If you were not expecting this message, contact a Needs Material Dashboard administrator.</p>
    </div>
  `.trim();

  return {
    subject: "Access granted — Needs Material Dashboard",
    text,
    html,
  };
}

/**
 * Send an invitation email via Resend when RESEND_API_KEY + INVITE_FROM_EMAIL are set.
 * Never throws for configuration gaps — returns { sent, reason }.
 */
export async function sendInviteEmail({ to, fullName, role }) {
  if (!isInviteEmailConfigured()) {
    return {
      sent: false,
      reason:
        "Invitation email is not configured. Set RESEND_API_KEY and INVITE_FROM_EMAIL.",
    };
  }

  const signInUrl = getAppBaseUrl();
  const { subject, text, html } = buildInviteContent({
    fullName,
    role,
    signInUrl,
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(process.env.RESEND_API_KEY).trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: String(process.env.INVITE_FROM_EMAIL).trim(),
        to: [String(to).trim().toLowerCase()],
        subject,
        text,
        html,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend invite failed", response.status, payload);
      return {
        sent: false,
        reason:
          payload?.message ||
          "Invitation email could not be sent. Check Resend configuration.",
      };
    }

    return { sent: true, id: payload?.id || null };
  } catch (error) {
    console.error("Resend invite request failed", error);
    return {
      sent: false,
      reason: "Invitation email could not be sent due to a network error.",
    };
  }
}
