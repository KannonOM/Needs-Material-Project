# Microsoft Entra ID (Microsoft 365) setup

Needs Material Dashboard uses **Auth.js (NextAuth v5)** with the **Microsoft Entra ID** provider. There are no separate dashboard passwords. After Microsoft sign-in, the app checks `public.allowed_users` and grants access only when the email matches an **active** row.

## Redirect URI (required)

Register this **exact** redirect URI on the Entra app registration (Web platform):

| Environment | Redirect URI |
|---|---|
| Local | `http://localhost:3000/api/auth/callback/microsoft-entra-id` |
| Production | `https://<your-production-host>/api/auth/callback/microsoft-entra-id` |

Also set `NEXT_PUBLIC_APP_URL` to the same origin (for example `http://localhost:3000`).

## Exact IT setup requirements

1. **Azure portal** → Microsoft Entra ID → **App registrations** → **New registration**.
2. Name: e.g. `Needs Material Dashboard`.
3. Supported account types: **Accounts in this organizational directory only** (single tenant — Kannon).
4. Redirect URI:
   - Platform: **Web**
   - URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id` (add production URI when deploying)
5. After create → **Certificates & secrets** → **New client secret** → copy the **Value** once (this is `AUTH_MICROSOFT_ENTRA_ID_SECRET`).
6. **Overview** → copy:
   - **Application (client) ID** → `AUTH_MICROSOFT_ENTRA_ID_ID`
   - **Directory (tenant) ID** → used in the issuer URL below
7. **Authentication**:
   - Enable **ID tokens** (used by the OIDC sign-in flow)
   - Keep redirect URIs exact (no trailing slash)
8. **API permissions** (Delegated):
   - `openid`
   - `profile`
   - `email`
   - `User.Read` (Graph basic profile; often added by default)
   - Grant admin consent if your tenant requires it
9. Optional but recommended: restrict assignment to users/groups under **Enterprise applications** if IT wants Entra-side gating in addition to the dashboard allowlist.

## Environment variables (server-only)

Copy from `.env.example` into `.env.local` (never commit secrets):

```bash
AUTH_SECRET=                    # openssl rand -base64 32
AUTH_MICROSOFT_ENTRA_ID_ID=     # Application (client) ID
AUTH_MICROSOFT_ENTRA_ID_SECRET= # Client secret value
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<TENANT_ID>/v2.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `AUTH_SECRET` locally:

```bash
openssl rand -base64 32
```

## Allowlist rules (application)

After Microsoft authentication succeeds, the Microsoft email is trimmed and lowercased, then matched case-insensitively against `allowed_users.email` (emails are stored lowercase).

| `allowed_users` condition | Result |
|---|---|
| No matching email | Denied → `/access-denied` |
| `status = pending` | Denied |
| `status = disabled` | Denied |
| `status = active` + valid role | Allowed; role loaded into session |

Roles: `administrator`, `purchasing`, `scheduler`, `viewer`.

Primary administrator seed: **Chris Vieux** (`cvieux@kannonmfg.com` once seed email is replaced in Supabase).

## What this app does **not** use Entra for

- No separate dashboard password store
- SharePoint / Graph unattended import uses a **different** app registration / client credentials (`MICROSOFT_*` vars) — not implemented in this auth phase

## Verify

1. Ensure Chris (or your test user) is `active` in `allowed_users` with the same email as Microsoft 365.
2. `npm run dev` → open `http://localhost:3000`
3. **Sign in with Microsoft** → complete Entra login
4. Confirm dashboard loads with the correct role label in the top bar
5. Sign in with a non-allowlisted account → Access denied
