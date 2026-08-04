# Kannon Needs Material Dashboard — Implementation Tasks

## Phase 1 — Inspect and Preserve
- [ ] Read PROJECT.md
- [ ] Inspect the Sunday prototype
- [ ] Document every visible screen and interaction
- [ ] Confirm no visual changes are required
- [ ] Identify simulated components

## Phase 2 — Run Locally
- [ ] Install dependencies
- [ ] Create `.env.example`
- [ ] Run lint
- [ ] Run TypeScript checks
- [ ] Run production build
- [ ] Fix only blocking errors

## Phase 3 — Database
- [ ] Create `allowed_users`
- [ ] Create `needs_material`
- [ ] Create `audit_log`
- [ ] Create `refresh_history`
- [ ] Add indexes and constraints
- [ ] Configure Row Level Security

## Phase 4 — Microsoft Authentication
- [ ] Configure Microsoft Entra sign-in
- [ ] Add allowlist check
- [ ] Add role lookup
- [ ] Deny unauthorized users
- [ ] Set Chris Vieux as initial Administrator

## Phase 5 — SharePoint Import
- [ ] Connect through Microsoft Graph
- [ ] Download the live workbook
- [ ] Read `Scheduler 2026`
- [ ] Validate required headers
- [ ] Filter Status = `Need Material`
- [ ] Match by Work Order
- [ ] Preserve dashboard-controlled fields
- [ ] Archive records no longer active
- [ ] Record refresh history

## Phase 6 — Editable Fields
- [ ] Make existing editable fields save to database
- [ ] Enforce role permissions
- [ ] Record audit entries
- [ ] Preserve existing edit workflow

## Phase 7 — Administration
- [ ] Make Invite User functional
- [ ] Assign roles
- [ ] Disable and re-enable users
- [ ] Remove users
- [ ] Show invitation status
- [ ] Preserve existing Administration layout

## Phase 8 — Refresh Scheduling
- [ ] Add manual Refresh Now
- [ ] Restrict manual refresh to Administrator and Scheduler
- [ ] Add 10:00 AM America/Chicago scheduled refresh
- [ ] Show last successful refresh
- [ ] Show refresh errors to Administrators

## Phase 9 — Testing
- [ ] Logged-out access denied
- [ ] Unauthorized Microsoft user denied
- [ ] Viewer cannot edit
- [ ] Purchasing can edit dashboard fields
- [ ] Scheduler can refresh
- [ ] Administrator can manage users
- [ ] Refresh preserves purchasing edits
- [ ] Removed Need Material rows become inactive
- [ ] Audit log records changes

## Phase 10 — Deployment
- [ ] Create private GitHub repository
- [ ] Configure Vercel
- [ ] Add protected environment variables
- [ ] Add production redirect URI
- [ ] Perform production smoke test
- [ ] Invite pilot users
