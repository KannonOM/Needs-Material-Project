# Needs Material Dashboard — Implementation Tasks

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
- [x] Configure Microsoft Entra sign-in
- [x] Add allowlist check
- [x] Add role lookup
- [x] Deny unauthorized users
- [x] Set Chris Vieux as initial Administrator

## Phase 5 — SharePoint Import
- [x] Connect through Microsoft Graph
- [x] Download the live workbook
- [x] Read `Scheduler 2026`
- [x] Validate required headers
- [x] Filter Status = `Need Material`
- [x] Match by Work Order
- [x] Preserve dashboard-controlled fields
- [x] Archive records no longer active
- [x] Record refresh history

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
- [x] Add manual Refresh Now
- [x] Restrict manual refresh to Administrator and Scheduler
- [ ] Add 10:00 AM America/Chicago scheduled refresh
- [x] Show last successful refresh
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
