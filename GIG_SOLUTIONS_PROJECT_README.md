# Gig Solutions — Full Project Reference

> **Staffing Resource Management System (SRMS)** connecting call centers with remote agents across the Caribbean.

---

## 1. SERVER & ACCESS

| Item | Value |
|------|-------|
| **VPS IP** | `167.86.124.101` |
| **SSH User** | `root` |
| **SSH Password** | `algebrain` |
| **App URL** | `http://167.86.124.101:4001` |
| **DB Path** | `/root/gig/db/custom.db` (SQLite via Prisma) |
| **Source Code** | `/root/gig-src/` |
| **Standalone Build** | `/root/gig/standalone/` |
| **Server Log** | `/root/gig/nohup.out` |

### SSH Access Method

```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.86.124.101', username='root', password='algebrain')
# Use short timeouts (5-10s) per command to avoid hangs
stdin, stdout, stderr = ssh.exec_command('command', timeout=10)
print(stdout.read().decode())
ssh.close()
```

**IMPORTANT**: `sshpass` is NOT installed. Always use Python `paramiko`. Use short `timeout` values on every `exec_command()` to prevent hangs. Run commands one at a time, not batched.

### Build & Deploy

```bash
# 1. Kill running server
pkill -f "next-server"; sleep 2

# 2. Build (from /root/gig-src/)
cd /root/gig-src && NODE_ENV=production npx next build 2>&1
# Wait for "Compiled successfully"

# 3. Copy build output
rm -rf /root/gig/standalone/.next
cp -r /root/gig-src/.next /root/gig/standalone/.next
cp -r /root/gig-src/public /root/gig/standalone/public 2>/dev/null

# 4. Start server (MUST use PORT env var, NOT -p flag)
cd /root/gig/standalone && PORT=4001 nohup node server.js > /root/gig/nohup.out 2>&1 &

# 5. Verify
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/
# Should return 200
```

**CRITICAL DEPLOY NOTES:**
- The standalone `server.js` reads `process.env.PORT`, NOT CLI `-p` flag
- Always `pkill -f "next-server"` before rebuilding — the old process holds port 4001
- After killing, verify with `ss -tlnp | grep 4001` that the port is free
- The `.next/standalone/` build output is NOT used — we copy `.next/` directly to `/root/gig/standalone/.next/`
- Always `cp -r public/` after copying `.next/` to preserve images

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (Turbopack) |
| Language | TypeScript (strict errors ignored in build) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand (persisted to localStorage as `gig-solutions-store`) |
| Database | SQLite via Prisma ORM |
| Auth | Custom header-based (X-User-Id, X-User-Role) — NO JWT/session |
| Fonts | Playfair Display (serif headings) + Inter (body) |

### Key Config Files

- **`next.config.ts`**: `output: "standalone"`, `ignoreBuildErrors: true`, `reactStrictMode: false`, `cssChunking: false`
- **`.env`**: `DATABASE_URL=file:/root/gig/db/custom.db`
- **`prisma/schema.prisma`**: SQLite provider, 14 models

---

## 3. ARCHITECTURE — SINGLE PAGE APP

This is **NOT** a standard Next.js app with file-based routing. It is a **single-page application** where ALL routing is client-side via Zustand state.

### How Routing Works

1. Only `src/app/page.tsx` exists as the sole Next.js page
2. The Zustand store has `currentPage: PageType` state
3. `page.tsx` reads `currentPage` and renders the matching component
4. Navigation is done via `useAppStore().navigateTo('page-name')` from any component
5. The URL hash changes (`#login`, `#agent-dashboard`) but no actual page navigation occurs
6. Components are split into `src/components/public/` (unauthenticated) and `src/components/portal/` (authenticated)

### page.tsx Router Logic

```
currentPage value     → Component rendered
─────────────────────────────────────────
home                  → HomePage
services              → ServicesPage
for-clients           → ForClientsPage
careers               → CareersPage
about                 → AboutPage
contact               → ContactPage
login                 → LoginPage
register-agent        → RegisterAgentPage
register-client       → RegisterClientPage
pending-payment       → PendingPaymentPage (outside PortalLayout)
agent-dashboard       → PortalLayout > AgentDashboard
agent-profile         → PortalLayout > AgentProfile
agent-documents       → PortalLayout > AgentDocuments
agent-availability    → PortalLayout > AgentAvailability
client-dashboard      → PortalLayout > ClientDashboard
client-agents         → PortalLayout > ClientAgents
client-needs          → PortalLayout > ClientNeeds
client-jobs           → PortalLayout > ClientJobs
admin-dashboard       → PortalLayout > AdminDashboard
admin-users           → PortalLayout > AdminUsers
admin-job-posts       → PortalLayout > AdminJobPosts
payment-taker-dashboard → PortalLayout > PaymentTakerDashboard
messages              → PortalLayout > MessagesPage
```

### Portal Layout (Sidebar)

The `PortalLayout.tsx` wraps all authenticated pages. Sidebar navigation is role-based:

| Role | Sidebar Items |
|------|--------------|
| **agent** | Dashboard, My Profile, Documents, Availability, Messages |
| **client** | Dashboard, Job Postings, My Needs, Agent Bank, Messages |
| **payment_taker** | Payment Requests, Messages |
| **admin** | Dashboard, Job Postings, Users, Messages |

---

## 4. USER ROLES & BUSINESS MODEL

| Role | Description |
|------|------------|
| `visitor` | Unauthenticated user (public pages) |
| `agent` | Individual freelancer seeking call center work |
| `client` | Call center company seeking agents |
| `payment_taker` | Internal staff who confirms payments |
| `admin` | Platform administrator |

### Fees
- **Agents**: 2000 HTG/year
- **Call Centers (Clients)**: 3000 HTG ($20 USD)/month

### Payment Flow
1. User registers (agent or client)
2. Auto-login after registration
3. Redirected to `pending-payment` page (chat-based payment flow)
4. Payment Taker finds them via message search
5. Payment Taker confirms payment in their dashboard
6. Admin approves user → `isActive = true` → full portal access

---

## 5. AUTHENTICATION

### How Auth Works (Header-Based, NOT JWT)

1. `POST /api/auth/login` validates email/password (supports both plain text and bcrypt hashes)
2. Returns `{ user: { id, email, name, role, ... } }` — NO token
3. Frontend stores user in Zustand (persisted to localStorage)
4. All subsequent API calls include headers: `X-User-Id` and `X-User-Role`
5. Server-side `getAuth(req)` extracts these headers to identify the user
6. There is NO session, NO cookie, NO JWT — entirely client-side trust

### Login API
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ email, password }`
- **Returns**: `{ user: { id, email, name, role, phone, avatar, isActive, accountStatus } }`
- **Password check**: If hash starts with `$2` → bcrypt compare; else plain text comparison
- **Allowed statuses**: `active`, `pending_approval` (for payment chat access). `rejected` and `suspended` return 403.

### Registration API
- **Endpoint**: `POST /api/auth/register`
- **Body** (agent): `{ name, email, password, role: "agent", phone, agentProfile: { country, languages, experience, skills, ... } }`
- **Body** (client): `{ name, email, password, role: "client", phone, clientProfile: { companyName, industry, companyLink } }`
- **Returns**: `{ message, userId }` — does NOT auto-login (frontend handles auto-login separately)

---

## 6. DATABASE SCHEMA (Prisma / SQLite)

14 models: `User`, `Agent`, `Client`, `JobPost`, `CallCenterNeed`, `PaymentRequest`, `Document`, `Notification`, `InternalNote`, `AuditLog`, `AvailabilitySlot`, `Conversation`, `Message`

### Key Relationships
- `User` 1:1 `Agent` (via userId)
- `User` 1:1 `Client` (via userId)
- `Client` 1:N `JobPost`, `CallCenterNeed`
- `Agent` 1:N `Document`, `AvailabilitySlot`
- `User` 1:N `PaymentRequest` (as payer)
- `User` 1:N `PaymentRequest` (as handler, via `handledBy`)
- `User` ↔ `User` M:N via `Conversation` + `Message`

### Data Storage Quirks
- `Agent.languages`, `Agent.skills`, `Agent.previousEmployers`, `Agent.education` → stored as JSON strings
- `Agent.computerSpecs` → stored as JSON string
- `CallCenterNeed.requirements` → stored as JSON string, BUT old records may have comma-separated strings. **Always use `JSON.parse` with fallback to `.split(',')`** when reading.
- `PaymentRequest.handledBy` → nullable, references `User.id`

---

## 7. TEST ACCOUNTS

All active users have password: **`Admin123!`**

| Email | Role | Name | Notes |
|-------|------|------|-------|
| `admin@gigsolutions.com` | admin | Marcus Johnson | Full admin access |
| `payments@gigsolutions.com` | payment_taker | Payment Taker | Confirms payments |
| `migueltelus67@gmail.com` | client | Miguel Telus | Call center owner |
| `techcall@test.com` | client | TechCall Inc | Has job posts & needs |
| `cvoice@test.com` | client | Caribbean Voice | Active client |
| `testcc@example.com` | client | Test CC | Active client |
| `migueltelus6@gmail.com` | agent | Miguel Telus | Active agent |
| `marie@test.com` | agent | Marie | Active agent |
| `james@test.com` | agent | James | Active agent |
| `sofia@test.com` | agent | Sofia | Active agent |
| `quick@test.com` | agent | Quick Test | **INACTIVE** (`isActive=0`) |

---

## 8. FILE STRUCTURE (Source Code)

```
/root/gig-src/
├── .env
├── next.config.ts
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
│   ├── images/
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # THE ONLY PAGE — SPA router
│   │   └── api/
│   │       ├── auth/{login,register}/route.ts
│   │       ├── agents/route.ts + [id]/route.ts
│   │       ├── assessments/route.ts + [id]/route.ts
│   │       ├── audit-logs/route.ts
│   │       ├── availability/route.ts + [id]/route.ts
│   │       ├── call-center-needs/route.ts
│   │       ├── clients/route.ts + [id]/route.ts
│   │       ├── contracts/route.ts + [id]/route.ts
│   │       ├── documents/route.ts + [id]/route.ts
│   │       ├── job-posts/route.ts
│   │       ├── messages/route.ts
│   │       ├── messages/search-users/route.ts
│   │       ├── notes/route.ts + [id]/route.ts
│   │       ├── notifications/route.ts + [id]/route.ts
│   │       ├── payment-requests/route.ts
│   │       ├── payments/route.ts + [id]/route.ts
│   │       ├── pipeline/route.ts + [id]/route.ts
│   │       ├── placements/route.ts + [id]/route.ts
│   │       ├── reports/route.ts
│   │       ├── staffing-requests/route.ts + [id]/route.ts
│   │       ├── users/route.ts + [id]/route.ts
│   │       └── users/approve/route.ts
│   ├── components/
│   │   ├── portal/
│   │   │   ├── PortalLayout.tsx
│   │   │   ├── AgentDashboard.tsx
│   │   │   ├── AgentProfile.tsx
│   │   │   ├── AgentDocuments.tsx
│   │   │   ├── AgentAvailability.tsx
│   │   │   ├── ClientDashboard.tsx
│   │   │   ├── ClientAgents.tsx
│   │   │   ├── ClientNeeds.tsx
│   │   │   ├── ClientJobs.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminUsers.tsx
│   │   │   ├── AdminJobPosts.tsx
│   │   │   ├── PaymentTakerDashboard.tsx
│   │   │   ├── PendingPaymentPage.tsx
│   │   │   └── MessagesPage.tsx
│   │   ├── public/
│   │   │   ├── PublicNavbar.tsx
│   │   │   ├── PublicFooter.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── ServicesPage.tsx
│   │   │   ├── ForClientsPage.tsx
│   │   │   ├── CareersPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── ContactPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterAgentPage.tsx
│   │   │   └── RegisterClientPage.tsx
│   │   └── ui/                         # shadcn/ui components (do not modify)
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── store.ts
│       ├── types.ts
│       ├── db.ts
│       ├── auth-middleware.ts
│       ├── utils.ts
│       ├── notifications.ts
│       └── assessment-questions.ts
```

---

## 9. KEY FILES TO KNOW

### `src/lib/store.ts` — The Brain
- **Zustand store** with 4 slices: Auth, Navigation, UI, Data
- `login(email, password)` → POSTs to `/api/auth/login`, sets `currentUser` + `isAuthenticated`
- `register(payload)` → POSTs to `/api/auth/register`, clears auth state
- `navigateTo(page)` → updates `currentPage`, pushes to `window.history`
- `logout()` → clears user, navigates to `home`
- Persisted to localStorage as `gig-solutions-store`

### `src/lib/types.ts` — All TypeScript Types
- `PageType`: union of all page names
- `UserRole`: `'visitor' | 'agent' | 'client' | 'payment_taker' | 'admin'`
- All model interfaces: User, Agent, Client, JobPost, CallCenterNeed, PaymentRequest, Document, etc.

### `src/lib/auth-middleware.ts` — API Auth
- `getAuth(req)` → returns `{ userId, role }` or `{ error, status }` from X-User-Id/X-User-Role headers

### `src/app/page.tsx` — The Router
- `'use client'` component
- Imports ALL page components
- Maps `currentPage` to the correct component
- Portal pages wrapped in `<PortalLayout>` with error boundary
- Public pages wrapped in `<PublicNavbar>` + `<PublicFooter>`

---

## 10. ALL FIXES APPLIED (Complete History)

### Sessions 1-3 (Previous)
1. ClientDashboard crash — Rewrote component
2. PendingPaymentPage syntax errors — Rewrote component
3. RegisterAgentPage wrong payload — Fixed
4. RegisterClientPage wrong payload — Fixed
5. search-users API — Removed isActive filter
6. clients/[id] API — Fixed parameter name
7. Navigation links — Fixed to register-agent/register-client
8. Images missing — 25+ images deployed
9. ClientNeeds page crash — Added parseRequirements() with fallback
10. Build not deploying — Fixed PORT env var usage
11. All user passwords reset to Admin123!

### Session 4 (Latest)
12. **Dead code cleanup** — Deleted 15 unused portal components:
    - OpsAudit.tsx, OpsCockpit.tsx, OpsContractRadar.tsx, OpsReports.tsx, OpsTalentBench.tsx, OpsWorkforceMap.tsx
    - RecruiterCandidates.tsx, RecruiterDashboard.tsx, RecruiterInterviews.tsx, RecruiterPipeline.tsx
    - AdminSystem.tsx, AgentAssessment.tsx, ClientContracts.tsx, ClientInvoices.tsx, ClientRequests.tsx
13. **Deleted old RegisterPage.tsx** — Replaced by RegisterAgentPage + RegisterClientPage
14. **Public pages audit** — Confirmed no stale recruiter/ops references in any public page, store, types, or API routes
15. **AgentDashboard** — Added loading spinner, error state with retry, empty profile hint
16. **AdminDashboard** — Added loading spinner, error state with retry
17. **PaymentTakerDashboard** — Added loading spinner, error state with retry
18. **AdminUsers** — Added loading spinner, error state with retry
19. **ClientAgents** — Added error handling for fetch failures, error state with retry
20. **ClientJobs** — Added error handling, error state with retry
21. **AdminJobPosts** — Added page loading, error handling for create/delete, error state with retry
22. **Browser audit** — Tested all 4 role dashboards (admin, agent, client, payment_taker) — zero console errors

---

## 11. REMAINING ITEMS

1. **Visual polish** — Responsive design review, image loading optimization, font rendering check
2. **Hash-based routing on page load** — App does not read URL hash on initial load (navigating to `#services` directly shows home)
3. **No server-side session validation** — Auth is purely header-based with no server-side verification
4. **Recruiter user in DB** — `recruiter@gigsolutions.com` still exists in the database (role no longer used)

---

## 12. USEFUL COMMANDS

### Quick Server Restart
```bash
pkill -f "next-server"; sleep 2; cd /root/gig/standalone && PORT=4001 nohup node server.js > /root/gig/nohup.out 2>&1 &
```

### Check Server Status
```bash
ss -tlnp | grep 4001
curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/
cat /root/gig/nohup.out | tail -20
```

### Database Queries
```bash
sqlite3 /root/gig/db/custom.db "SELECT email, role, isActive, accountStatus FROM User"
sqlite3 /root/gig/db/custom.db "SELECT * FROM CallCenterNeed WHERE isActive=1"
sqlite3 /root/gig/db/custom.db "SELECT * FROM PaymentRequest ORDER BY createdAt DESC"
```

### API Testing
```bash
# Login
curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gigsolutions.com","password":"Admin123!"}'

# Get call center needs (public, no auth)
curl -s http://localhost:4001/api/call-center-needs

# Get agents (requires auth headers)
curl -s http://localhost:4001/api/agents \
  -H "X-User-Id: cmqke0dvd0000kqku8e7uxo9k" \
  -H "X-User-Role: admin"
```