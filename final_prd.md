# CareerOS — Product Requirements Document (PRD)

**Version:** 1.0 (As-Built Documentation)
**Date:** August 10, 2026
**Status:** ✅ Shipped / Living Document
**Owner:** Product & Engineering
**Classification:** Internal

## Document Control
| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-08-10 | Product Team | Initial as-built PRD covering v1 scope, architecture, and design system |

## Table of Contents
1. Executive Summary
2. Problem Statement
3. Goals, Non-Goals & Success Metrics
4. Target Users & Personas
5. User Stories
6. Functional Requirements
7. Non-Functional Requirements
8. System Architecture
9. Data Model
10. API Specification
11. AI Email Parsing Pipeline
12. Design System ("Neon Glassmorphic SaaS")
13. Page-by-Page UI Specification
14. Security & Privacy
15. Error Handling & Edge Cases
16. Roadmap
17. Acceptance Criteria & QA Checklist

---

## 1. Executive Summary
CareerOS is a premium SaaS web application that functions as a specialized CRM for job seekers. It automatically tracks a user's job application pipeline by connecting to their Gmail, scanning for job-related emails, and using the Google Gemini LLM to extract structured data (Company, Role, Status, Dates) — eliminating manual data entry entirely.

The product wraps this automation in a Kanban-based pipeline dashboard, a spreadsheet-style Applications table, a Calendar view, and a Settings command center — all rendered in a distinctive Neon Glassmorphic design language built with pure vanilla CSS.

**One-line value proposition:**
"Your job hunt, autopiloted. CareerOS reads your inbox and keeps your application pipeline updated — so you focus on interviews, not spreadsheets."

### Tech Stack Summary
| Layer | Technology | Rationale |
|---|---|---|
| Backend | Python / Flask + modular Blueprints | Lightweight, explicit routing, zero framework bloat |
| Database | PostgreSQL via raw psycopg2 | No ORM — parameterized SQL for max performance + injection safety |
| Email | Google Gmail API (OAuth2) | Read-only access to incoming job emails |
| AI | Google Gemini (google-genai) | NLP extraction from unstructured email bodies |
| Frontend | HTML5 + Vanilla JS (ES6+) | No React/Vue — microscopic bundle size |
| Styling | Vanilla CSS | No Tailwind — full control over glassmorphic design tokens |

---

## 2. Problem Statement
Job seekers applying to 30–150+ roles face a chaotic tracking problem:
* Data is scattered — confirmations, assessments, and interview invites arrive as emails across LinkedIn, Naukri, Indeed, and direct company portals.
* Manual tracking fails — spreadsheets go stale within days; candidates miss interview dates and forget follow-ups.
* Status changes are invisible — a candidate often doesn't realize they've moved from "Applied" to "Interview" until they re-read old emails.
* No pipeline visibility — seekers can't see their stage-wise conversion rates, making it impossible to diagnose where their funnel leaks.

CareerOS solves this by turning the inbox itself into the source of truth, using AI to keep a live pipeline updated with zero manual effort.

---

## 3. Goals, Non-Goals & Success Metrics

### 3.1 Product Goals
| # | Goal |
|---|---|
| G1 | Zero manual data entry for 80%+ of tracked applications (Gmail autoparse) |
| G2 | Pipeline status always reflects latest email evidence |
| G3 | Sub-300ms API responses for all non-LLM operations |
| G4 | A UI that feels premium, fast, and "alive" (micro-interactions, glow, glass) |
| G5 | Extensible architecture so future AI agents drop in without refactors |

### 3.2 Non-Goals (v1)
* ❌ Applying to jobs on the user's behalf
* ❌ Resume building / tailoring (roadmap v2)
* ❌ Mobile native apps
* ❌ Team/multi-user collaboration features
* ❌ Writing/sending emails

### 3.3 Success Metrics (KPIs)
| Metric | Definition | Target |
|---|---|---|
| Sync Activation Rate | Users who connect Gmail within 24h of signup | ≥ 60% |
| Parse Success Rate | Emails yielding valid structured JSON from Gemini | ≥ 85% |
| Autoparse Share | Applications created via Gmail vs Manual | ≥ 70 / 30 |
| Weekly Active Syncs | Avg. sync runs per active user per week | ≥ 3 |
| Dashboard Load (p95) | Time to interactive on dashboard | < 1.5s |
| API Latency (p95) | Non-LLM endpoints | < 300ms |

---

## 4. Target Users & Personas

**Persona 1 — "Active Applicant Ava" (Primary)**
Final-year student / early-career professional, applying to 10–20 jobs/week via LinkedIn, Naukri, Indeed.
* **Pain:** Loses track of which companies responded; misses assessment deadlines.
* **Need:** Automatic pipeline updates + upcoming-interview alerts.

**Persona 2 — "Power User Priyanshu" (Secondary)**
Mid-career professional doing a focused job switch; 40–80 applications.
* **Pain:** Wants conversion analytics and a clean calendar of all events.
* **Need:** Stats panel, calendar view, manual override of AI-parsed data.

---

## 5. User Stories
| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-01 | Job seeker | Connect my Gmail securely | CareerOS can read my job emails | P0 |
| US-02 | Job seeker | Click "Sync Gmail" | New applications are auto-created and statuses auto-updated | P0 |
| US-03 | Job seeker | See a Kanban board grouped by status | I understand my pipeline at a glance | P0 |
| US-04 | Job seeker | Change a card's status | The database updates instantly | P0 |
| US-05 | Job seeker | See upcoming interviews filtered by future date | I never miss one | P0 |
| US-06 | Job seeker | Add/edit/delete applications manually | I can track offline referrals | P0 |
| US-07 | Job seeker | View all applications in a table with search & filters | I can do granular lookups | P1 |
| US-08 | Job seeker | See a monthly calendar plotting applied/assessment/interview dates | I can plan my week | P1 |
| US-09 | Job seeker | See conversion rates per stage | I know where my funnel leaks | P1 |
| US-10 | Job seeker | See the exact timestamp of my last successful scan | I trust the data is fresh | P2 |

---

## 6. Functional Requirements
*Priority legend: P0 = must ship · P1 = should ship · P2 = nice to have*

### F1 — Authentication & Sessions
| ID | Requirement | Priority |
|---|---|---|
| F1.1 | Users register with name, email, password. Passwords hashed with a salted hash (werkzeug/bcrypt) — never stored in plaintext | P0 |
| F1.2 | Users log in/out via session-based auth; protected routes reject unauthenticated requests via middleware decorator | P0 |
| F1.3 | Unauthenticated users hitting any /api/*, /dashboard, /applications, /calendar, /settings route are redirected to login | P0 |
| F1.4 | Session cookies set with HttpOnly, SameSite=Lax, Secure (in production) | P0 |
| F1.5 | Duplicate email registration returns a clean validation error | P1 |

### F2 — Dashboard (Kanban + Analytics Panel)
| ID | Requirement | Priority |
|---|---|---|
| F2.1 | 70/30 split-grid layout: 70% Kanban board, 30% analytics/control panel | P0 |
| F2.2 | Kanban columns map exactly to pipeline statuses: Applied → Shortlisted → Assessment → Interview → Offer, plus Rejected | P0 |
| F2.3 | Each card shows company, role, location, applied date, and source badge (Manual / Gmail) | P0 |
| F2.4 | Changing a card's status (drag or status selector) fires an immediate PATCH to the DB and optimistically updates the UI | P0 |
| F2.5 | Right panel computes: total applications, per-stage counts, stage-to-stage conversion rates, overall funnel | P0 |
| F2.6 | Right panel lists Upcoming Interviews: applications where interview_date >= TODAY, sorted ascending | P0 |
| F2.7 | Empty states for each column and for zero-data users (with CTA to connect Gmail) | P1 |
| F2.8 | Column counts displayed as live badges | P1 |

### F3 — Applications (Table View + CRUD)
| ID | Requirement | Priority |
|---|---|---|
| F3.1 | Spreadsheet-style table: Company, Role, Location, Status, Applied Date, Assessment Date, Interview Date, Source, Actions | P0 |
| F3.2 | Manual Add Application via glassmorphic modal with validation (company + role required) | P0 |
| F3.3 | Edit via modal pre-populated with row data | P0 |
| F3.4 | Delete with confirmation modal | P0 |
| F3.5 | Client-side search across company/role/location | P1 |
| F3.6 | Filter dropdowns: Status, Source | P1 |
| F3.7 | All rendered user data passed through global escapeHtml() before DOM insertion | P0 |

### F4 — Calendar
| ID | Requirement | Priority |
|---|---|---|
| F4.1 | Monthly grid view with prev/next month navigation and "Today" highlight | P1 |
| F4.2 | Applications plot on applied_date, assessment_date, and interview_date as color-coded chips per date type | P1 |
| F4.3 | Clicking a day reveals that day's events (popover or side list) | P1 |
| F4.4 | Chip colors match the status/date-type neon palette from the design system | P2 |

### F5 — Gmail Integration
| ID | Requirement | Priority |
|---|---|---|
| F5.1 | OAuth2 connect flow initiated from Settings; consent scope limited to gmail.readonly | P0 |
| F5.2 | Access + refresh tokens stored server-side in gmail_tokens table — never exposed to frontend | P0 |
| F5.3 | Sync Gmail button triggers a scan of recent emails matching job-related keywords + known job-board domains | P0 |
| F5.4 | Already-processed email_message_ids are skipped (idempotent syncs) | P0 |
| F5.5 | Settings displays connection status + timestamp of last successful scan | P1 |
| F5.6 | Disconnect option revokes local token storage | P1 |
| F5.7 | Expired/revoked tokens degrade gracefully → UI prompts reconnection | P1 |
| F5.8 | Background scheduled sync (APScheduler/cron) | **P0 (Implemented)** |

### F6 — AI Parsing & Merge Engine
| ID | Requirement | Priority |
|---|---|---|
| F6.1 | Raw email HTML is stripped/cleaned before being sent to Gemini | P0 |
| F6.2 | Gemini returns strict JSON: company, role, status, applied_date, assessment_date, interview_date, location, confidence | P0 |
| F6.3 | Merge rule: if a matching application exists (same user + normalized company), status only ever progresses forward (see §11.5), and missing dates are back-filled | P0 |
| F6.4 | Create rule: if no match exists, a new application is inserted with source='gmail' and email_message_id | P0 |
| F6.5 | Low-confidence or malformed AI responses are logged and skipped — never crash the sync | P0 |
| F6.6 | Rejected is terminal; parsed updates to a rejected application are ignored except for notes | P1 |

### F7 — Settings
| ID | Requirement | Priority |
|---|---|---|
| F7.1 | Google OAuth connection card: status pill (Connected/Not Connected), Connect/Disconnect, Sync Now, last-scan timestamp | P0 |
| F7.2 | Account card: name, email | P1 |
| F7.3 | Sync history log (last N scans, counts of created/updated) | P2 |

---

## 7. Non-Functional Requirements
| Category | Requirement |
|---|---|
| Performance | Non-LLM API endpoints p95 < 300ms. Total JS+CSS payload < 100KB (no frameworks). Dashboard TTI < 1.5s on mid-range hardware |
| Scalability | Blueprint architecture: new AI agents (Resume Tailor, Cover Letter Generator) mount into ai/ without touching core routes. DB queries indexed on (user_id, status) and (user_id, applied_date) |
| Security | 100% parameterized SQL (%s) — no string-built queries. XSS sanitization via escapeHtml(). Server-side token vault. Auth middleware on all protected routes |
| Reliability | Sync is idempotent and resumable. LLM failures isolated per-email; one bad email never aborts a batch |
| Browser Support | Latest Chrome, Edge, Firefox, Safari. backdrop-filter required (graceful solid-dark fallback via @supports) |
| Accessibility | WCAG AA contrast on text over dark surfaces; keyboard navigable modals; focus-visible states; prefers-reduced-motion respected for animations |
| Maintainability | Vanilla architecture = zero dependency-churn risk. All SQL in repository-style functions, no inline query strings in route handlers |

---

## 8. System Architecture
### 8.1 High-Level Diagram
12345678910111213141516171819202122232425262728293031

### 8.2 Project Structure
12345678910111213141516

### 8.3 Gmail Sync Sequence
12345678910111213141516171819202122

---

## 9. Data Model
### 9.1 Entity Relationship
123

### 9.2 Schema DDL
sql
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354

---

## 10. API Specification
All protected routes return 401 when unauthenticated. All responses are JSON.

### 10.1 Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Create account {name, email, password} | ✗ |
| POST | /auth/login | Session login {email, password} | ✗ |
| POST | /auth/logout | Destroy session | ✓ |
| GET | /auth/me | Current user info | ✓ |

### 10.2 Jobs
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /api/jobs | List applications. Query params: status, source, q | ✓ |
| GET | /api/jobs/stats | Stage counts, conversion rates, upcoming interviews | ✓ |
| POST | /api/jobs | Create application (manual) | ✓ |
| PUT | /api/jobs/<id> | Update fields | ✓ |
| PATCH | /api/jobs/<id>/status | Kanban status change {status} | ✓ |
| DELETE | /api/jobs/<id> | Delete application | ✓ |

Example — GET /api/jobs/stats response:
json
12345678910

### 10.3 Gmail
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | /gmail/connect | Redirect to Google OAuth consent | ✓ |
| GET | /gmail/callback | Exchange code → store tokens | ✓ |
| POST | /gmail/disconnect | Delete stored tokens | ✓ |
| POST | /gmail/sync | Run full scan → parse → merge pipeline | ✓ |
| GET | /gmail/status | Connection state + last successful scan timestamp | ✓ |

### 10.4 Error Envelope
All errors return a consistent shape:
json
1
| HTTP | Code | Meaning |
|---|---|---|
| 400 | VALIDATION_FAILED | Bad input |
| 401 | UNAUTHORIZED | No/invalid session |
| 402 | GMAIL_NOT_CONNECTED | Sync attempted without OAuth |
| 404 | NOT_FOUND | Resource missing or not owned by user |
| 429 | RATE_LIMITED | Too many sync/LLM calls |
| 502 | UPSTREAM_FAILED | Gmail/Gemini API failure |

---

## 11. AI Email Parsing Pipeline (The Crown Jewel)
### 11.1 Gmail Query Strategy
123456

### 11.2 Email Cleaning
Decode MIME parts → prefer text/plain, fall back to stripped text/html.
Remove signatures, unsubscribe footers, tracking pixels, base64 images.
Truncate to first ~4,000 chars (job signals live at the top of emails).

### 11.3 Gemini Prompt (Contract)
12345678910111213141516171819202122

### 11.4 Validation Gate (Before Merge)
A parse result is accepted only if:
is_job_related == true
company is non-empty
status is in the allowed enum
All provided dates parse as valid YYYY-MM-DD
confidence >= 0.6
Otherwise → logged to sync_logs.errors, email skipped.

### 11.5 Merge Rules & Status Rank
12
| Scenario | Action |
|---|---|
| No existing app for normalized (user_id, company) | INSERT with source='gmail' |
| Existing app, parsed rank > current rank | UPDATE status forward |
| Existing app, parsed rank ≤ current rank | Keep current status (no downgrades) |
| Parsed date for a field that is NULL | Back-fill the date |
| App is Rejected | Ignore all updates |
| Parsed status is Rejected | Set to Rejected regardless of rank |

Company normalization: lowercase → strip punctuation → remove legal suffixes (inc, ltd, llc, pvt) → trim. "Stripe, Inc." ≡ "stripe".

---

## 12. Design System — "Neon Glassmorphic SaaS"

### 12.1 Design Principles
Dark-first, always. The canvas is near-black; light exists only as glow.
Glass over chrome. Content lives on translucent blurred layers, never opaque panels.
Neon is semantic. Glow color = pipeline status. Color is data, not decoration.
Motion is magnetic. Elements respond to proximity — subtle lifts, pulls, and glow blooms. Nothing snaps.
Data density with breathing room. Spreadsheet-grade information, gallery-grade presentation.

### 12.2 Color Tokens
**Base surfaces**
| Token | Value | Usage |
|---|---|---|
| --bg-base | #0F0F13 | App canvas |
| --bg-elevated | rgba(255,255,255,0.04) | Hover surfaces |
| --glass-bg | linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) | Card fill |
| --glass-border | rgba(255,255,255,0.08) | 1px card borders |
| --glass-blur | blur(12px) saturate(140%) | backdrop-filter |

**Text**
| Token | Value | Usage |
|---|---|---|
| --text-primary | #F5F5F7 | Headings, key data |
| --text-secondary | #9A9AA5 | Body copy |
| --text-muted | #5C5C66 | Timestamps, hints |

**Neon status accents (glow = accent @ 30% alpha)**
| Status | Token | Hex | Glow |
|---|---|---|---|
| Applied | --neon-applied | #4DA3FF | 0 0 24px rgba(77,163,255,.30) |
| Shortlisted | --neon-shortlisted | #A78BFA | 0 0 24px rgba(167,139,250,.30) |
| Assessment | --neon-assessment | #FFB454 | 0 0 24px rgba(255,180,84,.30) |
| Interview | --neon-interview | #FF6AC1 | 0 0 24px rgba(255,106,193,.30) |
| Offer | --neon-offer | #3DF2B6 | 0 0 24px rgba(61,242,182,.35) |
| Rejected | --neon-rejected | #FF5C7A | 0 0 24px rgba(255,92,122,.25) |

### 12.3 Typography
| Role | Family | Weights |
|---|---|---|
| Display / Headings | Space Grotesk | 600, 700 |
| UI / Body | Inter | 400, 500, 600 |
| Data / Dates / Numbers | JetBrains Mono | 400, 500 |

Scale: 28 / 22 / 18 / 16 / 14 / 13 / 12 px · line-height 1.2 (headings) / 1.5 (body) · letter-spacing +0.02em on uppercase labels.

### 12.4 Space, Radius, Elevation
| Token | Value | Token | Value |
|---|---|---|---|
| --space-1 | 4px | --radius-sm | 8px |
| --space-2 | 8px | --radius-md | 12px |
| --space-3 | 12px | --radius-lg | 16px (cards) |
| --space-4 | 16px | --radius-pill | 999px |
| --space-6 | 24px | --shadow-glass | 0 8px 32px rgba(0,0,0,.45) |
| --space-8 | 32px | --shadow-lift | 0 16px 48px rgba(0,0,0,.6) |

### 12.5 Glassmorphism Reference Recipe
css
123456789101112

### 12.6 Motion System
| Type | Duration | Easing | Trigger |
|---|---|---|---|
| Micro (hover, focus) | 150ms | cubic-bezier(0.22,1,0.36,1) | pointer enter/leave |
| Standard (modals, panels) | 250ms | same | open/close |
| Page/board transitions | 350ms | same | route change, drag drop |
| Magnetic button | continuous | — | element translates ≤ 4px toward cursor within hover radius; resets on leave |
| Card lift | 150ms | — | translateY(-2px) + glow bloom on hover |
| Kanban drop | 250ms | — | target column border glows in the dragged card's status color |
*prefers-reduced-motion: reduce → disable magnetic + lift effects, keep instant opacity fades.*

### 12.7 Component Library
| Component | Spec |
|---|---|
| GlassCard | Recipe above. Padding --space-4. |
| KanbanCard | GlassCard, --radius-md; left 3px accent bar in status neon; company (16/600), role (13/secondary), location + date row (12/mono/muted); source pill top-right. |
| KanbanColumn | Fixed 280px width; header = status pill + count badge; vertical scroll; horizontal board scroll. |
| StatusPill | Pill radius; text = accent color; bg = accent @ 12% alpha; border accent @ 30%. |
| StatCard | GlassCard with mono 28px value, 12px uppercase label, thin gradient progress bar in relevant neon. |
| Modal ("Floating Command Center") | Centered glass panel, blur(20px) scrim rgba(15,15,19,.7); scale-in .96→1 + fade 250ms; slide-in variant from right for edit forms. |
| DataTable | No outer borders; row hover = --bg-elevated; sticky header; 13px data cells, mono for dates. |
| Inputs | Dark inset field rgba(0,0,0,.3); 1px --glass-border; focus = 1px neon-blue border + soft glow ring. |
| Buttons | Primary: neon gradient (blue→violet) with glow shadow, magnetic. Ghost: transparent + glass border. Danger: --neon-rejected outline. All --radius-md, 40px height. |
| Toast | Bottom-right glass pill, auto-dismiss 4s, left accent bar by type (success green / error red / info blue). |
| EmptyState | Dashed glass container, 40px line icon, headline + one CTA. |

### 12.8 Layout System
| Zone | Spec |
|---|---|
| App shell | Fixed left sidebar (72px collapsed / 240px expanded) — logo, nav icons, user chip. Top content area scrolls independently. |
| Dashboard grid | display:grid; grid-template-columns: 7fr 3fr; gap: 24px; |
| Breakpoints | ≥1280px: full 70/30 · 1024–1279px: sidebar collapses to icons · <1024px: analytics panel stacks below board · <640px: single column, kanban becomes horizontal swipe |

---

## 13. Page-by-Page UI Specification

### 13.1 Dashboard
| Zone | Contents & Behavior |
|---|---|
| Header bar | Greeting ("Good morning, Ava"), last-sync chip, Sync Gmail (ghost), + Add Application (primary, magnetic) |
| Kanban board (70%) | 6 status columns. Cards draggable between columns → optimistic UI + PATCH /api/jobs/:id/status. On failure → rollback + error toast. Cards clickable → edit modal. |
| Analytics panel (30%) | ① Total applications StatCard ② Funnel bar (per-stage counts as neon gradient segments) ③ Conversion rates list ④ Upcoming Interviews — cards filtered by interview_date >= today, sorted ascending, pink accent, "in N days" label |
| Empty state | Zero-data users see an onboarding glass card: "Connect Gmail to auto-track your pipeline" + connect CTA |

### 13.2 Applications
| Zone | Contents & Behavior |
|---|---|
| Toolbar | Search input, Status filter, Source filter, + Add button |
| Table | All columns per F3.1. Status rendered as StatusPill; Source as small badge (⚡ Gmail / ✍️ Manual); row actions: Edit, Delete |
| Add/Edit modal | Slide-in glass panel from right. Fields: Company*, Role*, Location, Status (select), Applied/Assessment/Interview dates (date pickers), Notes. Inline validation. |
| Delete | Confirmation modal with danger button; row animates out on success |

### 13.3 Calendar
| Zone | Contents & Behavior |
|---|---|
| Header | Month/year title, ‹ › navigation, "Today" button |
| Grid | 7-column month grid; today's cell has a neon outline; event chips: blue = applied, amber = assessment, pink = interview; max 3 chips + "+N more" |
| Interaction | Click day → glass popover listing that day's events with links to edit |

### 13.4 Settings
| Card | Contents & Behavior |
|---|---|
| Gmail Connection | Status pill (● Connected / ○ Not connected), connected email, Connect / Disconnect, Sync Now, last successful scan timestamp (mono) |
| Account | Name, email (read-only), logout |
| Sync History (P2) | Table of last 10 syncs: timestamp, found/created/updated/errors |

### 13.5 Auth Pages
Login/register on centered glass card over #0F0F13 with a subtle ambient radial glow (blue/violet, 8% alpha) behind it. Brand wordmark in Space Grotesk with a neon gradient accent.

---

## 14. Security & Privacy
| Area | Implementation |
|---|---|
| Password storage | Salted hash (werkzeug/bcrypt). Never logged, never returned in APIs |
| Auth middleware | Decorator guards every protected route; session cookie HttpOnly; SameSite=Lax; Secure |
| SQL Injection | 100% parameterized queries via %s placeholders through psycopg2. Zero string interpolation into SQL |
| XSS | Global JS escapeHtml() applied to all user-controlled strings before innerHTML insertion; Jinja2 autoescape on for server-rendered templates |
| CSRF | Token required on all state-changing POST/PATCH/DELETE |
| OAuth tokens | Stored only in gmail_tokens (server-side). Never serialized to frontend. Refresh handled transparently |
| Least privilege | Gmail scope = gmail.readonly. CareerOS never sends email |
| Data isolation | Every query filters by user_id from session; ownership checked on update/delete (404 on foreign resources) |
| AI data handling | Email bodies sent to Gemini contain only the cleaned text (no attachments/credentials); no email content persisted beyond the parsed structured fields |

---

## 15. Error Handling & Edge Cases
| # | Scenario | Handling |
|---|---|---|
| E1 | Gemini returns malformed JSON | Retry once with stricter prompt → if still invalid, log + skip email |
| E2 | confidence < 0.6 | Skip; count in sync_logs.skipped |
| E3 | Duplicate company names w/ different casing ("Stripe" vs "stripe, inc.") | Normalized match (§11.5) |
| E4 | Gmail token expired mid-sync | Attempt refresh once → on failure abort gracefully, UI shows "Reconnect Gmail" |
| E5 | Two emails for same company in one batch (Applied then Interview) | Process oldest-first; second naturally progresses status |
| E6 | Parsed applied_date in the future | Discard date, keep record |
| E7 | User manually edits an AI-created record | Manual data always wins; future syncs won't overwrite user-edited fields except forward status progression |
| E8 | Gemini rate limit (429) | Exponential backoff (1s → 2s → 4s), then stop batch, save progress |
| E9 | backdrop-filter unsupported | @supports solid-dark fallback |
| E10 | Timezones | All dates stored/compared as DATE in user's local context; "upcoming" computed against server CURRENT_DATE |

---

## 16. Roadmap
**v1.1 — Next**
* ⏱ Background scheduler (APScheduler) for automatic periodic syncs
* 🔍 Review queue for low-confidence parses (approve/edit before merge)
* 🖱 Drag-and-drop polish (touch support, keyboard-accessible status moves)
* 📧 Sync history UI in Settings (expose sync_logs)

**v2.0 — AI Agents Platform**
* 📄 Resume Tailor agent in ai/ — generates tailored resume bullets per role
* ✍️ Cover Letter Generator agent — drops into ai/routes.py with zero core changes
* 💰 Salary/compensation field + negotiation tracker
* 🔗 LinkedIn profile import of past applications
* 📊 Weekly email digest ("3 interviews this week, 2 assessments due")

**v3.0 — Vision**
Multi-account tracking, referral graph, and mock-interview agent

---

## 17. Acceptance Criteria & QA Checklist
**Critical Path (must pass before any release)**
- [x] Register → Login → Dashboard reachable; unauthenticated access blocked on all routes
- [x] Gmail OAuth connect stores tokens; disconnect removes them
- [x] "Sync Gmail" creates new applications with source='gmail' and correct fields
- [x] Re-running sync is idempotent — no duplicates created
- [x] An "Interview invite" email for an existing company progresses Applied → Interview and back-fills interview_date
- [x] Status never regresses via sync
- [x] Kanban status change persists immediately (verify in DB)
- [x] Upcoming Interviews shows only future-dated entries, sorted correctly
- [x] Calendar plots all three date types on correct days
- [x] XSS test: application named `<img src=x onerror=alert(1)>` renders inert
- [x] SQL injection test: `'; DROP TABLE users;--` in any input returns validation error
- [x] Malformed Gemini response does not crash sync
- [x] All glass surfaces fall back correctly without backdrop-filter
- [x] Reduced-motion preference respected
- [x] Non-LLM endpoints p95 < 300ms under 50 concurrent users

---

## Appendix A — Glossary
| Term | Definition |
|---|---|
| Pipeline | The ordered lifecycle: Applied → Shortlisted → Assessment → Interview → Offer (+ Rejected) |
| Sync | One full run of Gmail scan → Gemini parse → merge |
| Merge | Matching a parsed email to an existing application and progressing it |
| Floating Command Center | The glassmorphic modal pattern used for all forms |
| Neon Glassmorphic | CareerOS design language: dark canvas + blurred glass + semantic neon glow |

End of document — CareerOS PRD v1.0
