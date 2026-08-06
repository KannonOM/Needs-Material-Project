import Link from "next/link";

export const metadata = {
  title: "Access Denied — Needs Material Dashboard",
};

export default async function AccessDeniedPage({ searchParams }) {
  const params = await searchParams;
  const error = String(params?.error || "");
  const isConfiguration = error === "Configuration";

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand">KANNON MFG</div>
        <div className="hero-copy">
          <h1>Needs Material Dashboard</h1>
          <p>Purchasing Work Queue</p>
        </div>
        <small>Access is limited to invited Kannon Microsoft accounts.</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="brand login-brand">KANNON MFG</div>
          {isConfiguration ? (
            <>
              <h2>Authentication configuration error</h2>
              <p>
                Microsoft sign-in could not start because the server authentication
                settings are incomplete or invalid.
              </p>
              <p className="demo-note" style={{ marginTop: 16 }}>
                An administrator needs to configure Auth.js / Microsoft Entra
                environment variables and restart the app, then try again.
              </p>
            </>
          ) : (
            <>
              <h2>Access denied</h2>
              <p>
                Your Microsoft account signed in successfully, but it is not an
                active user on the Needs Material Dashboard allowlist.
              </p>
              <p className="demo-note" style={{ marginTop: 16 }}>
                Ask an Administrator to invite your Kannon email and set your status
                to Active before trying again.
              </p>
            </>
          )}
          <Link className="ms-button" href="/" style={{ textDecoration: "none" }}>
            Return to sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
