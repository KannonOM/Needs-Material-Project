import Link from "next/link";

export const metadata = {
  title: "Access Denied — Needs Material Dashboard",
};

export default async function AccessDeniedPage({ searchParams }) {
  const params = await searchParams;
  const error = String(params?.error || "");
  const reason = String(params?.reason || "");
  const isConfiguration = error === "Configuration";

  let title = "Access denied";
  let message =
    "Your Microsoft account signed in successfully, but it is not authorized for the Needs Material Dashboard.";
  let help =
    "Ask an Administrator to invite your Kannon Microsoft email and grant access, then try again.";

  if (isConfiguration) {
    title = "Authentication configuration error";
    message =
      "Microsoft sign-in could not start because the server authentication settings are incomplete or invalid.";
    help =
      "An administrator needs to configure Auth.js / Microsoft Entra environment variables and restart the app, then try again.";
  } else if (reason === "inactive") {
    title = "Account inactive";
    message =
      "Your Kannon Microsoft account is on the allowlist, but access is currently inactive.";
    help =
      "Contact a Needs Material Dashboard administrator to reactivate your account.";
  } else if (reason === "not_allowed") {
    title = "Access denied";
    message =
      "Your Microsoft account is not on the Needs Material Dashboard allowlist.";
    help =
      "Ask an Administrator to invite your Kannon Microsoft email. After you are invited, sign in with that same account.";
  } else if (reason === "error") {
    title = "Sign-in unavailable";
    message =
      "We could not verify dashboard access right now. Please try again in a moment.";
    help =
      "If this continues, contact a Needs Material Dashboard administrator.";
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand">KANNON MFG</div>
        <div className="hero-copy">
          <h1>Needs Material Dashboard</h1>
          <p>Purchasing Work Queue</p>
        </div>
        <small>Access is limited to authorized Kannon Microsoft accounts.</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="brand login-brand">KANNON MFG</div>
          <h2>{title}</h2>
          <p>{message}</p>
          <p className="demo-note" style={{ marginTop: 16 }}>
            {help}
          </p>
          <Link className="ms-button" href="/" style={{ textDecoration: "none" }}>
            Return to sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
