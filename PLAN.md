# PLAN.md - World Cup 2026 Prediction Challenge

## Phase Goal
Build and run a local app where users can do a dummy login and submit score predictions for all World Cup 2026 Group Stage matches from the provided JSON schedule.

## Research Summary
- Input data already exists in `world-cup-2026-schedule.json` with `matches` array and stage labels.
- Group Stage can be selected with `match.stage === "Group Stage"`.
- Local-first approach: static frontend + tiny Node static file server for easy local run/test.

## Execution Plan
1. Create local app shell:
- Add `index.html`, `styles.css`, `app.js`.
- Add `server.js` and npm scripts for local start.

2. Implement login flow:
- Dummy login form that stores username in localStorage.
- On login success, route to predictions view.

3. Implement predictions page:
- Load JSON schedule.
- Render only Group Stage rows.
- For each match provide two numeric inputs for team scores with range 0-50.
- Keep default empty values.
- Add row-level `Confirm` button and save per match prediction.

4. Persist locally:
- Save predictions in localStorage keyed by match number.
- Restore saved values when returning to page.

5. Add verification tests:
- Validate schedule integrity and Group Stage count.
- Validate score boundary assumptions (0-50).

## Verification Checklist
- App starts locally using `npm start`.
- Login view appears first.
- Entering a name opens predictions page.
- Group Stage matches are listed.
- Score inputs accept values from 0 to 50 and start empty.
- Confirm button stores prediction and shows saved status.
- Tests pass with `npm test`.

## Risks and Mitigations
- Risk: JSON fetch fails when not served over HTTP.
- Mitigation: use local Node static server (`npm start`) instead of opening HTML directly.

- Risk: Invalid score inputs or blanks.
- Mitigation: row-level validation before save and clear error message.

## Execution Status
- Status: Completed
- Completed on: 2026-06-03
- Delivered files: `index.html`, `styles.css`, `app.js`, `server.js`, `package.json`, `tests/schedule.test.js`
- Verification evidence:
	- `npm test` passed (3 tests, 0 failures)
	- `npm start` launched successfully at `http://localhost:3000`

## Phase 2 Goal (Database CRUD Upgrade)
Build a fully running local app with database connections where users log in using fixed credentials (`admin` / `password`) and can create, read, update, and delete predictions for World Cup 2026 Group Stage matches.

## Phase 2 Research Summary
- Existing app already renders all Group Stage fixtures from `world-cup-2026-schedule.json`.
- The missing capability was persistence across sessions and true CRUD operations.
- Best local fit: Express + SQLite + session-based auth for a single-node local setup.

## Phase 2 Execution Plan
1. Replace static file server with Express API server.
2. Add local SQLite database initialization and seed fixed user.
3. Implement authenticated endpoints for login/session/logout.
4. Implement full predictions CRUD endpoints (create/list/read-one/update/delete).
5. Switch frontend from localStorage to API calls.
6. Add integration tests for login and CRUD behavior.

## Phase 2 Verification Checklist
- App starts locally using `npm start`.
- Login accepts `admin` / `password` and rejects invalid credentials.
- After login, previously saved predictions are loaded from DB.
- Confirm creates a new prediction when none exists.
- Confirm updates an existing prediction.
- Clear deletes an existing prediction.
- All tests pass with `npm test`.

## Phase 2 Execution Status
- Status: Completed
- Completed on: 2026-06-03
- Verification evidence:
	- `npm test` passed (7 tests, 0 failures, including API CRUD integration test)
	- `npm start` launched successfully at `http://localhost:3000`

## Phase 3 Goal (True Admin Results Entry)
Create a true admin page where the admin enters actual game scores (not predictions) for Group Stage matches, persisted in the local database and editable over time.

## Phase 3 Research Summary
- Current system has one predictions table and no table for official match results.
- Current login has no role model; all authenticated users share the same capabilities.
- The existing match feed and prediction CRUD APIs can be extended cleanly for admin-only result management.

## Phase 3 Execution Plan
1. Add role-based users and a second test login:
- Extend `users` model with role support (`admin`, `member`).
- Keep admin credentials as `admin / password`.
- Seed an additional member account for testing: `member1 / password`.

2. Add actual results data model:
- Create `actual_results` table keyed by `match_number`.
- Columns: `match_number`, `team_a_score`, `team_b_score`, `entered_by_user_id`, `updated_at`.
- Enforce score bounds 0..50.

3. Add admin-only APIs:
- `GET /api/admin/results` to list current entered results.
- `GET /api/admin/results/:matchNumber` to read one result.
- `POST /api/admin/results` to create a result for a match.
- `PUT /api/admin/results/:matchNumber` to update existing result.
- `DELETE /api/admin/results/:matchNumber` to clear an entered result.
- Block member users with `403` on all admin routes.

4. Build admin UI page:
- Add a dedicated admin page/view for results entry.
- Show Group Stage fixture rows and current actual score values if present.
- Provide Confirm (create/update) and Clear (delete) actions per row.
- Add clear status feedback per row.

5. Add tests for Phase 3:
- Verify member cannot access admin routes.
- Verify admin can create/read/update/delete actual scores.
- Verify values persist and are returned on reload.

## Phase 3 Verification Checklist
- Admin login reaches the admin results page.
- Member login cannot access admin results APIs or page actions.
- Actual match scores can be created, edited, and deleted.
- Entered actual scores are visible after re-login and refresh.
- Tests pass for role enforcement and admin results CRUD.

## Phase 3 Execution Status
- Status: Completed
- Completed on: 2026-06-03
- Verification evidence:
	- `npm test` passed (9 tests, 0 failures, includes role guard and admin actual results CRUD tests)
	- `npm start` launched successfully at `http://localhost:3000`

## Phase 4 Goal (Member Scoring Engine and Display)
On member login, calculate and show points for each match based on submitted prediction and entered actual score.

## Phase 4 Research Summary
- Current app stores predictions but has no scoring computation layer.
- Scoring requires both prediction and actual result availability.
- Missing prediction must still be scored (`-2`) when actual result exists.

## Phase 4 Scoring Rules (Requested)
- Exact scoreline match: `+5`
- Correct winning team only: `+2`
- Incorrect winning team prediction: `-1`
- No prediction submitted for a match with an entered actual result: `-2`

## Phase 4 Rule Clarifications for Implementation
- Score a match only when actual result exists for that match.
- For drawn actual results:
	- exact draw scoreline gets `+5`
	- predicted draw but wrong draw numbers gets `+2`
	- predicted non-draw gets `-1`
- If actual result does not exist yet, mark as `pending` and assign `0` (not scored yet).

## Phase 4 Execution Plan
1. Add scoring service logic:
- Implement deterministic per-match scoring function.
- Inputs: prediction (optional), actual result (optional).
- Output: score value and reason code (`exact`, `winner_only`, `wrong_winner`, `missing_prediction`, `pending`).

2. Add scoring APIs for members:
- `GET /api/member/scores` returns all Group Stage matches with:
	- prediction
	- actual result (if entered)
	- per-match points
	- reason code
- Include summary totals:
	- `totalPoints`
	- `scoredMatches`
	- `pendingMatches`

3. Update member predictions page UX:
- Keep prediction CRUD actions.
- Add columns for Actual, Points, and Status.
- Show running total points at top.
- Recompute and refresh scoring after prediction save/delete.

4. Add second login journey (member test account):
- On login page, display test credentials:
	- Admin: `admin / password`
	- Member: `member1 / password`
- Ensure member sees scoring view and admin-only controls are hidden.

5. Add tests for Phase 4:
- Unit tests for scoring function across all rule branches.
- Integration tests for member scoring API with mixed scenarios:
	- exact match
	- winner-only
	- wrong winner
	- missing prediction
	- pending actual score

## Phase 4 Verification Checklist
- Member login works with `member1 / password`.
- Member sees predictions plus actual/result scoring columns.
- Points update correctly per requested rules.
- Missing prediction with available actual score yields `-2`.
- Pending matches (no actual entered) do not apply penalties yet.
- Total points equals sum of scored match points.
- Tests pass for scoring engine and scoring API.

## Phase 4 Execution Status
- Status: Completed
- Completed on: 2026-06-03
- Verification evidence:
	- `npm test` passed (includes scoring unit tests and mixed-scenario member scoring API integration test)
	- `npm start` launched successfully at `http://localhost:3000`

## Phase 3-4 Risks and Mitigations
- Risk: Role leakage exposes admin operations to member users.
- Mitigation: central role guard middleware and explicit API tests for `403`.

- Risk: ambiguous outcomes for draw handling.
- Mitigation: codify draw-specific logic in unit tests and document reason codes.

- Risk: recalculating scores on every request could become costly later.
- Mitigation: start with compute-on-read for simplicity; add cached aggregates only if needed.

## Phase 5 Goal (Manual Score Calculation and Member Score Caching)
Decouple score calculation from login: Admin manually invokes a score calculation endpoint. Member scores are persisted to database and fetched on member login, eliminating redundant per-request computation.

## Phase 5 Research Summary
- Current system recalculates member scores on every `/api/member/scores` request (expensive for large data later).
- No persistent member score cache exists; all state is computed on-the-fly.
- Admin has no explicit trigger to finalize score calculations—scores drift as actual results change.
- Schema needs a `member_scores` table to cache per-user, per-match results.

## Phase 5 Execution Plan
1. Update database schema:
- Add `member_scores` table: (id, user_id, match_number, points, reason, calculated_at).
- Add `score_calculation_state` table: (id, calculated_at, matched_actual_results_count, triggered_by_user_id).
- Index on (user_id, match_number) for fast member score lookup.

2. Add admin-only score calculation trigger:
- POST `/api/admin/calculate-scores` endpoint (admin-only).
- Computes scores for all members across all matches with actual results.
- Inserts/updates `member_scores` table.
- Records calculation timestamp in `score_calculation_state`.
- Returns summary: total members scored, total match-member pairs scored.

3. Add member score fetch on login:
- GET `/api/member/scores/cached` endpoint (member-only).
- Returns pre-calculated scores from `member_scores` table.
- If no cached scores exist for user, returns empty array (not yet calculated by admin).

4. Add tests for Phase 5:
- Member cannot access admin trigger endpoint.
- Admin can trigger calculation.
- Member scores appear in cache after admin trigger.
- Multiple members have independent cached scores.

## Phase 5 Schema Changes
```sql
CREATE TABLE member_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, match_number),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE score_calculation_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  matched_actual_results_count INTEGER NOT NULL,
  triggered_by_user_id INTEGER NOT NULL,
  FOREIGN KEY(triggered_by_user_id) REFERENCES users(id)
);
```

## Phase 5 Verification Checklist
- Admin can access POST /api/admin/calculate-scores.
- Member cannot access admin calculate-scores endpoint.
- After admin trigger, member scores appear in member_scores table.
- Multiple members have correctly cached scores.
- Member login fetches cached scores without recalculation delay.
- Tests pass for admin trigger and member cache fetch.

## Phase 5 Execution Status
- Status: Completed
- Completed on: 2026-06-03
- Verification evidence:
	- `npm test` passed (21/21 tests, including 4 Phase 5 specific tests)
	- `npm start` launched successfully at `http://localhost:3000`
	- Implemented POST /api/admin/calculate-scores (admin-only, triggers manual calculation)
	- Implemented GET /api/member/scores/cached (member-only, returns cached scores)
	- Added member_scores table with (user_id, match_number, points, reason, calculated_at)
	- Added score_calculation_state table for audit trail
	- All role guards enforced with 403 responses for unauthorized access

## Phase 6 Goal (Restrict Predictions by Match Time and Score Lock)
Prevent members from submitting predictions if: the match has already started, OR the admin has entered a final score for that match.

## Phase 6 Research Summary
- Current system allows predictions to be submitted anytime after login.
- No match time information is enforced in the app; schedule.json has times but they are not used.
- No "score lock" concept exists; members can still submit after actual scores are entered.
- Restrictions require: match time comparison and actual_result existence check.

## Phase 6 Execution Plan
1. Add match metadata to API:
- Expose match.date and match.time_et in `/api/matches/group-stage` (already available from schedule.json).

2. Extend member prediction submission guards:
- When member attempts POST or PUT prediction:
  - Check if match date+time has passed (compute_match_time: parse date/time_et and compare to server time).
  - Check if actual_result exists for this match.
  - If EITHER condition is true, return 409 Conflict with reason (`match_started` or `score_locked`).

3. Update member UI:
- Disable Confirm/Clear buttons for matches where time has passed OR actual score is entered.
- Show status label: "Match started" or "Score locked" instead of action buttons.
- Preserve read-only display of prediction if one exists.

4. Add tests for Phase 6:
- Member can submit prediction for future match with no actual score.
- Member cannot submit prediction for match past start time.
- Member cannot submit prediction for match with actual score entered.
- Existing prediction remains visible even if locked.

## Phase 6 Verification Checklist
- Member can submit predictions for future matches only.
- Submitting for past match returns 409 with `match_started` reason.
- Submitting for match with actual score returns 409 with `score_locked` reason.
- Member UI correctly disables prediction submission for locked matches.
- Member can view their existing prediction even if match is locked.
- Tests pass for all time/lock restriction scenarios.

## Phase 5-6 Risks and Mitigations
- Risk: Server time zone mismatch causes incorrect match time checks.
- Mitigation: Use UTC timestamps consistently; parse ET as UTC offset for now; document timezone clearly.

- Risk: Rapidly changing actual scores before admin calculation runs could leave members confused.
- Mitigation: Admin must explicitly trigger calculation; document that calculation is snapshot-in-time.

- Risk: Member UX becomes confusing if match locks but no actual score is visible to member yet.
- Mitigation: Show clear "locked" status and reason code to member; don't show admin actual scores to members until after calculation.

## Phase 7 Goal (UI Enhancements: Lock Polish, Steppers, Row Expansion, Timezone)
Four targeted UI improvements delivered in wave order: (1) visually grey-out locked rows; (2) stepper buttons alongside score inputs; (3) expandable match rows showing venue and team form; (4) per-user timezone preference for match time display.

## Phase 7 Wave 1: Lock State Visual Polish
**Goal:** When a row is locked (match started or actual score entered), remove Confirm/Clear buttons entirely and show a lock badge instead of just disabling them.

**Execution steps:**
1. In `app.js` locked branch: remove Confirm/Clear buttons from DOM; insert a `<span class="lock-badge">🔒 Locked</span>` in the action cell.
2. Add `.row-locked` class to the `<tr>` so the whole row is subtly dimmed.
3. In `styles.css`: `.row-locked td { opacity: 0.7; background: rgba(0,0,0,0.03); }` and `.lock-badge { font-size: 12px; color: #f77f00; font-weight: 600; }`.
4. Score inputs in locked rows remain visible and read-only (show existing prediction values).

## Phase 7 Wave 2: Score Entry Stepper Buttons
**Goal:** Add `−` / `+` mini buttons flanking each score input for click-based increment/decrement within the valid 0–50 range.

**Execution steps:**
1. Update `index.html` member row template: wrap each score input in `<div class="score-stepper"><button class="stepper-btn stepper-dec">−</button><input ...><button class="stepper-btn stepper-inc">+</button></div>`.
2. In `app.js` unlocked row wiring: attach `click` listeners on `.stepper-dec` and `.stepper-inc`; clamp value between 0 and 50.
3. Locked rows: stepper buttons not added (lock-badge branch takes over before steppers are wired).
4. In `styles.css`: `.score-stepper { display: flex; align-items: center; gap: 4px; }` and `.stepper-btn { width: 22px; height: 22px; font-size: 13px; font-weight: 700; border: none; border-radius: 4px; background: var(--accent-2); color: #fff; cursor: pointer; line-height: 1; padding: 0; }`.

## Phase 7 Wave 3: Expandable Match Rows
**Goal:** A chevron toggle on each row expands an inline detail panel showing venue, city, and last-3 form placeholders for each team.

**Execution steps:**
1. Update `index.html` member row template:
   - Add `<button class="expand-btn">▶</button>` as the first element in the first cell.
   - After each `<tr>`, add a `<tr class="match-detail-row hidden"><td colspan="9"><div class="match-detail-panel">...</div></td></tr>`.
   - Detail panel structure: three columns — Venue info | Team A form | Team B form.
2. In `app.js` row rendering:
   - Populate venue: `match.venue`, `match.city`, `match.country` (already in schedule JSON memory).
   - Form placeholders: render 3 `<span class="form-slot">–</span>` for each team; add a caption "Form data not yet available".
   - Wire expand button: toggle `.hidden` on detail row; toggle `.expanded` on button (CSS rotates `▶` → `▼`).
   - Lazy-render: populate detail panel HTML only on first expand, then toggle visibility thereafter.
3. In `styles.css`:
   - `.expand-btn { background: none; border: none; cursor: pointer; font-size: 11px; transition: transform 0.2s; }` and `.expand-btn.expanded { transform: rotate(90deg); }`.
   - `.match-detail-row td { background: rgba(0,0,0,0.02); padding: 12px 16px; font-size: 13px; }`.
   - `.match-detail-panel { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }`.
   - `.form-slot { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #e0e0e0; font-size: 12px; margin-right: 4px; }`.
4. No API changes needed; venue data comes from already-loaded schedule JSON.

## Phase 7 Wave 4: Per-User Timezone Preference
**Goal:** A dropdown above the predictions table lets members choose their local timezone. The preference is saved per user in the database and restored on next login. Match times render in the selected zone.

**Execution steps:**
1. Database schema:
   - In `db.js`: add `ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York'` with safe duplicate-column catch.
2. API changes:
   - GET `/api/session`: include `timezone` in response payload.
   - PUT `/api/member/timezone` (member-only): body `{ timezone: string }`, validate against allowed IANA list, save to DB, return `{ timezone }`.
3. Allowed timezone list (shared between client and server):
   - `America/New_York` — Eastern Time (default)
   - `America/Chicago` — Central Time
   - `America/Los_Angeles` — Pacific Time
   - `Europe/London` — London (GMT/BST)
   - `Europe/Berlin` — Germany (CET/CEST)
   - `Asia/Kolkata` — India (IST)
4. Frontend — timezone selector:
   - In `index.html`: add `<div class="tz-bar"><label>Display times in: <select id="timezone-select">…</select></label></div>` above `#matches-body`.
   - In `app.js` `showPredictions()`: set select value to `session.timezone`; add `change` listener that calls PUT then calls `renderPredictionsTable()`.
5. Time rendering — replace hardcoded ET display:
   - Add `formatMatchTime(match, timezone)` in `app.js`: parse `match.date` + `match.time_et` as Eastern (using IANA `America/New_York`), then format in `timezone` using `Intl.DateTimeFormat`.
   - Display format: `Jun 11, 3:00 PM EDT` or `Jun 12, 12:30 AM IST`.
   - Replace the existing `${formatDate(match.date)} ${match.time_et} ET` call with `formatMatchTime(match, currentTimezone)`.
6. Add API test: PUT /api/member/timezone saves preference; GET /api/session returns updated timezone.

## Phase 7 Schema Addition
```sql
ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York';
```

## Phase 7 Verification Checklist
- Wave 1: Locked rows have no Confirm/Clear buttons; lock badge visible; row dimmed with `.row-locked`.
- Wave 1: Non-locked rows still have full Confirm/Clear functionality.
- Wave 2: `+` button increments score input, clamped at 50; `−` decrements, clamped at 0.
- Wave 2: Stepper buttons absent on locked rows.
- Wave 3: Expand button toggles detail row visibility; chevron rotates; venue and city shown.
- Wave 3: Form slots show `–` placeholders with caption when no data is available.
- Wave 4: Dropdown shows 6 timezone options; Eastern pre-selected by default.
- Wave 4: Changing timezone updates all match time cells without page reload.
- Wave 4: Timezone preference persists after logout and re-login.
- All existing backend tests continue to pass (no regression).

## Phase 7 Risks and Mitigations
- Risk: `Intl.DateTimeFormat` DST offset for `America/New_York` in June: EDT (UTC-4). Must parse ET source correctly.
- Mitigation: Use `Intl.DateTimeFormat` with IANA `America/New_York` for input parsing (not hardcoded UTC-4).

- Risk: 72 rows × 2 hidden detail rows = 144 TR elements in DOM may slow initial render.
- Mitigation: Lazy-populate detail panel HTML on first expand only; keep hidden rows empty until toggled.

- Risk: Invalid timezone string sent to PUT /api/member/timezone endpoint.
- Mitigation: Server validates against a fixed allowlist before saving; returns 400 for unknown values.

## Phase 9 Goal (Major UI Redesign - FIFA 2026 Editorial)
Deliver a major UI redesign that keeps FIFA World Cup 2026 editorial identity front and center across three routes in the existing vanilla stack: public landing, member login, and admin dashboard. Preserve current backend API contracts and session behavior where possible so this phase remains a front-end architecture and presentation upgrade.

## Phase 9 Research Summary
- Keep stack stable: no framework migration in this phase; continue with `index.html` + `styles.css` + `app.js` single-shell rendering model.
- Use token-first CSS to make color, type, spacing, radius, and motion reusable and consistent across all pages.
- Introduce a tiny hash-route dispatcher (`#/`, `#/member/login`, `#/admin/dashboard`) with page-specific renderers in `app.js`.
- Use template-based UI composition so shared elements (hero shell, top bars, cards, table wrappers) are generated from small helper functions.
- Add explicit accessibility and responsive constraints: semantic landmarks, keyboard focus visibility, contrast-safe tokens, and mobile-first breakpoints.

## Phase 9 Design Direction (FIFA 2026 Editorial)
- Visual identity: energetic tournament editorial style with bold headline typography, match-card rhythm, national color accents, and layered stadium-inspired backgrounds.
- Public landing page: campaign-style hero, tournament value props, and strong navigation entry points for member and admin paths.
- Member login page: clean credential panel with competition-themed framing, trust copy, and clear error/validation states.
- Admin dashboard page: high-density operational layout with clear hierarchy for score-entry controls, lock status, and manual scoring actions.
- Motion and atmosphere: restrained reveal transitions and section-level animation only; avoid heavy effects that hurt readability or performance.
- Typography contract: bold all-caps sans-serif display headers (`Inter` / `Montserrat` / `Archivo Black`), clean high-legibility body text, and strict scale tokens for `h1`/`h2`/body/meta labels.
- Color contract: white and light-gray surfaces (`#FFFFFF`, `#F4F4F6`), deep navy structure (`#0F172A`), high-contrast action accents reserved for CTAs/tags, and AA contrast-safe text pairings.
- Component contract: sharp bordered cards, minimal rounding (4px-8px), explicit states for buttons/inputs/tags, and consistent table-row status styling (`Active`, `Pending Validation`, `Locked`).

## Phase 9 Execution Plan
1. Define token and layout foundation in `styles.css`.
   - Add a Phase 9 token block (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`) and scoped utility classes for page shells.
   - Add responsive breakpoints for mobile/tablet/desktop and document the class contract used by page renderers.
   - Keep existing class names functional during transition to avoid breaking current behavior mid-phase.

2. Add page-shell containers and templates in `index.html`.
   - Preserve existing root sections and templates required by current logic.
   - Add explicit containers for the three page compositions (landing, member login, admin dashboard) and route-level landmarks (`main`, `nav`, `section`, `footer`) with accessible labels.
   - Add non-breaking placeholders for route-specific content regions that `app.js` will hydrate.

3. Implement tiny route dispatcher and renderer split in `app.js`.
   - Add hash routing (`window.location.hash`) with a minimal dispatcher and a safe fallback route to public landing.
   - Implement `renderLandingPage()`, `renderMemberLoginPage()`, and `renderAdminDashboardPage()` functions that compose templates and preserve existing API calls/events.
   - Keep backend contracts unchanged: login/session endpoints, member prediction endpoints, admin endpoints, and existing guard/error flows remain compatible.

4. Build Tournament Landing (Page A) with explicit FIFA modules.
   - Hero banner: stadium/cityscape background, dark overlay, tournament title, countdown ticker, and `Register / Login` CTA.
   - Host city/venue cards: card grid or horizontal snap-track showing city, stadium, match count, and `View Schedule` action.
   - Fixtures list: dense rows/cards with timestamp banner, stage badge (`Group Stage - Group F` style), football icon (`⚽` or SVG), team labels, and kickoff time.
   - Add stable hooks for tests (`landing-hero`, `landing-countdown`, `host-city-card`, `fixture-stage-badge`, `fixture-football-icon`).

5. Re-style Member Login (Page B) and Admin Dashboard (Page C) flows using template components.
   - Member Login page: use split-screen as default desktop layout; collapse to centered-card on narrow/mobile viewports. Include floating labels, bordered inputs, primary accent submit button, and `Back to Tournament Home` link behavior.
   - Admin Dashboard page: sidebar navigation (`Dashboard`, `Manage Matches`, `User Directory`, `Settings`), localized date/time header, KPI cards, and management grid with status tags.
   - Refactor repeated markup generation into helper functions (header strip, card block, action group, table shell).
   - Maintain existing functional controls (login submit, logout, prediction actions, admin result actions) while applying the new editorial visual system.
   - Ensure keyboard navigation order and visible focus state on all interactive elements.

6. Add Phase 9 UI tests in `tests/phase9-ui.test.js` and wire in test run.
   - Add structural assertions for route render output (landing/member/admin shell markers and required ARIA landmarks).
   - Add guard assertions to ensure member/admin routes still honor auth/role gating in UI state.
   - Add responsive class behavior checks by asserting breakpoint utility class toggles and route container class application.
   - Add content assertions for countdown ticker, host city cards, floating labels, back-link routing, admin sidebar/KPI/status tags, and localized datetime text.

7. Execute in controlled sub-waves with hard gates inside Phase 9.
   - Wave 9A (foundation): tokens + shell containers + no behavior changes. Gate: existing tests pass and login/member/admin flows unchanged.
   - Wave 9B (public/member): Landing + Member Login redesign with route checks. Gate: page-A/page-B UI assertions pass and auth flow remains stable.
   - Wave 9C (admin): Admin Dashboard redesign and management grid polish. Gate: admin-specific UI assertions pass and role guards remain intact.
   - Wave 9D (hardening): accessibility/contrast/responsive sweep and cleanup. Gate: full `npm test` plus closure of this phase's defined checklist items (Landing modules, Login modules, Admin modules, accessibility checks, responsive checks, and visual identity checks) in the Phase 9 Verification Checklist section below.

## Phase 9 Verification Checklist
- `npm test` includes `tests/phase9-ui.test.js` and passes with existing suites.
- Hash routes render the correct shell:
  - `#/` shows public landing layout.
  - `#/member/login` shows member login layout.
  - `#/admin/dashboard` shows admin dashboard layout (guarded if not authorized).
- Landing page includes required modules:
   - Hero banner with dark overlay and primary CTA.
   - Live countdown ticker updates at least once per minute.
   - Host city/venue cards rendered with city, venue, and match-count metadata.
   - Fixtures rows render stage badge and football icon.
- Member login page includes required modules:
   - Split-screen or centered-card layout implemented consistently across breakpoints.
   - Floating labels are linked and readable in focus/error states.
   - `Back to Tournament Home` link returns to public landing route.
- Admin dashboard includes required modules:
   - Sidebar navigation sections are visible and keyboard reachable.
   - Header displays localized current date/time.
   - KPI row renders at least three summary widgets.
   - Content management grid shows status tags (`Active`, `Pending Validation`, etc.) with clear action controls.
- Existing login/session and member/admin actions still execute against unchanged backend endpoints.
- Accessibility checks pass for Phase 9 structure:
  - One main landmark per route view.
  - Visible focus styling on keyboard tab navigation.
  - Form labels and error regions remain announced.
- Responsive behavior is verifiable:
  - Mobile classes collapse multi-column regions.
  - Tablet/desktop classes restore editorial grid.
  - No horizontal overflow on key route shells at narrow widths.
- Visual identity checks are objective and testable:
   - Display headers use uppercase heavy type class; body text uses body type class.
   - CTA and status-tag elements consume action-color token classes (not hardcoded inline colors).
   - Card components use bordered-card class with radius constrained to 4px-8px.
   - Contrast target: primary text/surface and action text/background combinations meet WCAG AA.

## Phase 9 Risks and Mitigations
- Risk: Large CSS redesign could regress existing interaction states.
- Mitigation: Introduce token layer first, then route/page styles incrementally; keep legacy class compatibility until Phase 9 verification is complete.

- Risk: Hash-route introduction may break current view switching assumptions.
- Mitigation: Keep legacy show/hide functions as compatibility wrappers while route dispatcher is introduced; add route fallback and route-render tests.

- Risk: Editorial visuals could reduce contrast or mobile usability.
- Mitigation: Enforce tokenized contrast-safe palette, test focus and readability, and include responsive class checks in automated tests.

- Risk: Admin/member UX redesign may accidentally alter role guard experience.
- Mitigation: Add explicit UI guard tests for unauthorized route access and preserve existing role-based API flow.

## Phase 9 Deliverables (Delivered)
- Updated `index.html` with route-ready page shells and accessible landmarks for landing, member login, and admin dashboard.
- Updated `styles.css` with token-first design system and responsive editorial layout classes.
- Updated `app.js` with tiny hash route dispatcher and page-specific renderers while preserving backend contract usage.
- New `tests/phase9-ui.test.js` for route structure, guard behavior, and responsive class assertions.

## Phase 9 Execution Status
- Status: Completed
- Completed on: 2026-06-04
- Verification evidence:
   - `npm test` passed (33/33 tests, 0 failures)
   - Added Phase 9 UI structural checks in `tests/phase9-ui.test.js`
   - Preserved existing API and scoring regressions green while shipping the redesign

## Phase 10 Goal (Confirm Fix + Entry Flow + Flags + Branding)
Restore broken Confirm behavior for both member and admin flows, improve landing authentication entry, add team-country flag rendering in fixture labels, and apply shared branding with logo placement on landing and member login views while preserving all current backend API contracts.

## Phase 10 Research Summary
- Confirm failure is most likely caused by missing `toIntOrNull` helper usage/definition in `app.js` for both member prediction confirm and admin result confirm handlers.
- `match.country` in schedule data represents venue country, not team country; team flags must come from team-country mapping, not venue metadata.
- Landing should not include direct member entry; split auth entry into separate `Login` and `Register` actions.
- Add a register route and placeholder signup screen to avoid dead navigation until full signup implementation.
- Reuse existing image asset `colors-fifa-unveils-official-logo-for-2026-world-cup-custom-cities.png` for branding consistency.

## Phase 10 Execution Plan
1. Fix Confirm parsing path in `app.js` for both roles.
- Add/restore a shared numeric parser helper (`toIntOrNull`) near existing input utilities.
- Update member Confirm handler to parse both score inputs through `toIntOrNull`; block submit when either is null/out of range per existing validation contract.
- Update admin Confirm handler to use the same helper and validation path.
- Keep request payload shape and endpoints unchanged to preserve backend contracts.

2. Add team-country flag label formatting in `app.js`.
- Introduce a local team-to-country map keyed by schedule team names.
- Add a flag resolver helper that converts country code/name to emoji/source flag symbol.
- Replace match title rendering with: `<flag teamA> <name teamA> vs <name teamB> <flag teamB>`.
- Do not use `match.country` for team flags; keep `match.country` only for venue display in expanded metadata.

3. Update landing and route structure in `index.html` and `app.js`.
- Landing page:
   - Replace combined member entry with two distinct buttons: `Login` and `Register`.
   - Route `Login` to member login page route.
   - Route `Register` to new signup placeholder route.
- Add register/signup route handler in `app.js` and render a placeholder signup page with clear "Coming soon" text.
- Ensure route exists so navigation never lands on missing/blank content.

4. Add logo placement on landing and member login in `index.html`, `app.js`, and `styles.css`.
- Add logo image element(s) in landing hero and member login header blocks using the existing PNG asset.
- Add alt text and fixed responsive container styles.
- Add CSS tokens/classes for logo sizing, spacing, and mobile scaling without breaking current layout.

5. Add/extend UI tests in `tests/phase9-ui.test.js` and add new targeted test file if needed.
- In `tests/phase9-ui.test.js`, add assertions for:
   - Landing shows separate `Login` and `Register` controls.
   - Register navigation resolves to signup placeholder route/view.
   - Landing and member login render logo element with expected selector and asset path.
   - Match labels include flag-first/flag-last format around `vs`.
- Add new test file `tests/phase10-confirm.test.js` (or equivalent) for confirm regression:
   - Member confirm uses numeric parsing and proceeds with valid ints.
   - Admin confirm uses numeric parsing and proceeds with valid ints.
   - Invalid/non-numeric input is rejected before submit.

## Phase 10 Verification Checklist
- Run `npm test` and ensure all existing suites remain green.
- Confirm regression checks pass for both member and admin confirm handlers.
- In UI tests, landing route shows `Login` and `Register` as separate actions.
- Clicking `Login` navigates to member login route; clicking `Register` navigates to signup placeholder route.
- Landing and member login pages both display the official logo image with non-empty alt text.
- Fixture label rendering matches `<flag teamA> <name teamA> vs <name teamB> <flag teamB>`.
- Venue country remains available only in venue/detail UI and is not reused as team-country flag source.

## Phase 10 Risks and Mitigations
- Risk: Incomplete team-country mapping causes missing/incorrect flags.
- Mitigation: add deterministic fallback (neutral flag or no-flag token) and test expected formatting with fallback.

- Risk: Route addition for signup placeholder could break existing hash-route fallback.
- Mitigation: add explicit route case and preserve current default/fallback behavior.

- Risk: Shared helper changes could alter current validation behavior.
- Mitigation: keep existing score bounds/error messages, only centralize integer parsing logic.

- Risk: Logo insertion may shift responsive layout.
- Mitigation: constrain logo with dedicated CSS class, max-width, and breakpoint-specific rules verified by UI tests.

## Phase 10 Deliverables (Planned)
- Updated `app.js`:
   - shared `toIntOrNull` helper wiring for member/admin confirm handlers
   - team flag formatting helpers and match label updates
   - register/signup route and placeholder page renderer
- Updated `index.html`:
   - split landing auth actions (`Login`, `Register`)
   - logo containers/hooks for landing and member login
- Updated `styles.css`:
   - logo presentation styles for both views
   - any minimal spacing updates required by new auth button split
- Updated `tests/phase9-ui.test.js` with Phase 10 UI assertions
- New confirm-regression test file in `tests/` (if needed for parser-focused coverage)

## Phase 10 Execution Status
- Status: Completed
- Completed on: 2026-06-05
- Verification evidence:
   - `npm test` passed (35/35 tests, 0 failures)
   - Manual member flow check: submitted a pending row via `Confirm` and observed `saved` state in dashboard table
   - Manual admin flow check: submitted a pending row via `Confirm` and observed `saved` state in operations table
   - Landing flow check: separate `Login` and `Register` actions present, member entry shortcut removed
   - Branding check: logo rendered on landing and member login views
   - Fixture formatting check: rows rendered as `<flag teamA> <name teamA> vs <name teamB> <flag teamB>`

## Phase 12 Goal (Member Registration + OTP Login via Twilio)
Build member registration and OTP login enrollment using alias + phone authentication, while preserving current admin password flow and controlled member password fallback behavior.

## Phase 12 Research Summary
- Extend current SQLite auth model without breaking existing `/api/login` behavior.
- Add member identity/auth fields to `users`: `alias`, `phone_e164`, `phone_verified_at`, `otp_enabled`, `password_login_enabled`, `auth_version`.
- Add `otp_challenges`, `auth_rate_limits`, and `auth_events` tables for OTP lifecycle, throttling, and audit trail.
- Introduce provider abstraction for OTP with `mock` and `twilio_verify` modes.
- Keep password login endpoint unchanged for backward compatibility and outages.
- Enforce member-only OTP APIs; admin remains password-only.

## Phase 12 Execution Plan
1. Database and migration updates in `db.js`:
- Add duplicate-safe `ALTER TABLE` logic for new `users` auth columns.
- Create `otp_challenges`, `auth_rate_limits`, and `auth_events` with `IF NOT EXISTS`.
- Preserve existing seeds and role behavior: admin unchanged, members start with `otp_enabled=0`.
- Add helper functions for challenge create/update, auth event logging, and rate-limit counters.

2. OTP provider abstraction and dependencies:
- Add new module `src/auth/otp-provider.js` with:
   - `sendOtp(toPhone, context)`
   - `verifyOtp(providerRefOrChallengeId, code)`
- Implement `mock` provider for deterministic automated tests.
- Implement `twilio_verify` provider using env vars:
   - `OTP_PROVIDER`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`
   - `OTP_CODE_TTL_SEC`
   - `OTP_MAX_ATTEMPTS`
- Update `package.json` to include required Twilio dependency and scripts/env notes if needed.

3. Auth API implementation in `server.js`:
- Keep `POST /api/login` request/response contract unchanged, but enforce member auth mode server-side:
   - Admin path remains username/password.
   - Member with `otp_enabled=0`: password login allowed.
   - Member with `otp_enabled=1`: password login denied by default unless `fallback_activation=true`.
- Add `POST /api/member/register`:
   - Accept `alias`, `phone`, `username`, `password`.
   - Normalize phone to E.164 and enforce uniqueness.
   - Create member account with `otp_enabled=0`, `phone_verified_at=NULL`.
- Add `POST /api/auth/otp/request` (member-only semantics):
   - Accept `usernameOrAliasOrPhone`, `purpose=login`.
   - Apply per-IP and per-phone throttles.
   - Keep uniform response behavior to reduce enumeration risk.
   - Cancel prior pending challenge for same user/purpose and create a new one.
- Add `POST /api/auth/otp/verify`:
   - Validate active challenge, expiry, and max attempts.
   - On success: regenerate session, set member session role, set `phone_verified_at`, set `otp_enabled=1`, and audit event.
- Optional endpoint `GET /api/member/auth-methods`:
   - Return `canUsePassword`, `canUseOtp`, `otpEnabled`, `phoneMasked`.
- Define fallback activation contract (single source of truth in backend):
   - `fallback_activation=true` only when one of these is true:
     - `otp_throttled` (request/verify limit exceeded)
     - `otp_cooldown_active` (temporary lock window in effect)
     - `otp_provider_unavailable` (Twilio/provider failure)
   - In all other cases for `otp_enabled=1`, password login must return 403 with a clear machine-readable reason (for example `otp_required`).
- Explicit member password behavior rule:
   - Before OTP verification: member password login allowed.
   - After OTP verification: member password login is blocked unless `fallback_activation=true`; OTP/no-password is required.
   - During OTP throttle/cooldown or provider outage: member password bypass remains available.

4. Frontend flow updates in `index.html` and `app.js`:
- Replace signup placeholder with a real registration form (username, alias, phone, password).
- Add OTP login UI for member path:
   - Request code form.
   - Verify code form.
   - Clear status messaging for sent, throttled, expired, invalid code.
- Keep admin login UX on password path only.
- Implement post-verification behavior:
   - Member UI marks OTP enabled and uses OTP flow as primary path.
   - Password fields hidden/disabled for OTP-verified members in normal conditions.
   - Password fallback message appears only when OTP throttled/cooldown/unavailable.

5. Automated test updates in `tests/api.test.js`:
- Add registration tests for alias + phone creation and uniqueness constraints.
- Add OTP request/verify tests using mock provider and `request.agent` session assertions.
- Add wrong-code, expired-code, attempts-exhausted, and request-throttle cases.
- Add tests proving fallback logic:
   - Member password works before OTP enrollment/verification.
   - After OTP verification and normal OTP availability, member password login is rejected (403 + `otp_required`).
   - Member password bypass still works when `otp_throttled`, `otp_cooldown_active`, or `otp_provider_unavailable` is active.
- Add tests verifying admin cannot use member OTP endpoints.
- Keep existing `/api/login` regression coverage green.

## Phase 12 Twilio Test Matrix
- CI / automated (mock provider):
   - `OTP_PROVIDER=mock`.
   - Register member, request OTP, verify deterministic code, assert session creation.
   - Assert wrong code, expired challenge, attempts cap, and throttle behavior.
   - Assert debug OTP exposure is test-only and never returned in non-test mode.
- Manual / local live Twilio smoke:
   - `OTP_PROVIDER=twilio_verify` with real `TWILIO_*` env vars.
   - Register member with a real test phone.
   - Request OTP and complete verify on device.
   - Confirm session established and `otp_enabled=1` persisted.
   - Confirm member can still use password bypass only when OTP cooldown/throttle is active.
- Twilio test-credential path note:
   - Twilio Messages test credentials can validate SMS dispatch paths.
   - Full Verify approval workflow is not relied on in CI; CI remains mock-driven.

## Phase 12 Verification Checklist
- `npm test` passes with new registration + OTP scenarios and no regressions.
- `POST /api/member/register` creates member with unique alias and normalized phone.
- `POST /api/auth/otp/request` enforces member-only use, challenge lifecycle, and throttling.
- `POST /api/auth/otp/verify` approves valid code, sets session, and updates `phone_verified_at` + `otp_enabled`.
- Invalid/expired OTP attempts fail with uniform error and increment attempt counters.
- Password behavior is correct and explicit:
   - Before OTP verification: member password login works.
   - After OTP verification with normal OTP availability: password login is blocked and OTP/no-password is required.
   - During `otp_throttled`, `otp_cooldown_active`, or `otp_provider_unavailable`: member password bypass remains available.
- Admin password login path remains unchanged and OTP member endpoints are not available to admin.
- Auth audit events and rate-limit entries are persisted for OTP request/verify actions.

## Phase 12 Risks and Mitigations
- Risk: account enumeration via OTP request.
- Mitigation: use uniform accepted/error responses and internal audit logging only.

- Risk: OTP brute force or SMS pumping.
- Mitigation: layered rate limits (IP, phone, challenge), attempt cap, cooldown windows, and challenge expiry.

- Risk: Twilio outage or provider quota issues causing member lockout.
- Mitigation: preserve member password bypass during throttle/cooldown/outage and keep admin on password flow.

- Risk: migration instability on repeated SQLite alters.
- Mitigation: continue duplicate-column-safe migration pattern and add migration coverage in API tests.

- Risk: secrets or OTP leakage in logs/responses.
- Mitigation: never log plaintext OTP; expose debug code only in mock/test mode.

## Phase 12 Execution Status
- Status: Completed
- Completed on: 2026-06-04
- Verification evidence:
   - `npm test` passed (39/39 tests, 0 failures), including new Phase 12 auth tests
   - Member registration endpoint implemented: `POST /api/member/register` (username + alias + phone + fallback password)
   - OTP flow implemented: `POST /api/auth/otp/request` and `POST /api/auth/otp/verify`
   - Passwordless enforcement active for OTP-verified members (`403 otp_required` unless fallback is active)
   - Frontend login/registration UX updated for OTP request+verify and controlled password fallback
- Scope lock:
   - Member registration requires alias + phone.
   - OTP verification enables passwordless-first member login.
   - Password bypass is retained before OTP verification and during OTP throttle/cooldown/outage.

## Phase 13 Goal (League Isolation Foundation)
Implement league-based access control so each member belongs to exactly one league assigned by admin, and can only access data within that league. Keep admin score-entry flow global/common across all leagues.

## Phase 13 Research Summary
- Current app has role-based auth but no league domain model.
- Member data is currently user-scoped, not league-scoped.
- Leaderboard and peer-comparison features require strict league isolation first.
- Admin result entry should remain one global source of truth for all leagues.
- OTP via Twilio is already implemented and should remain unchanged in this phase.

## Phase 13 Execution Plan
1. Add league schema and membership constraint.
- Add leagues table and member-to-league assignment model.
- Enforce exactly one league per member.
- Add uniqueness and integrity constraints for league names and assignments.

2. Add migration and backfill behavior.
- Define handling for existing members without league assignment.
- Option A: auto-assign to a default league.
- Option B: block member features until admin assigns league.
- Add safe migration logic for repeat local startup.

3. Add league context to auth/session responses.
- Extend session/member context payload to include league id and league name.
- Ensure member session resolves to exactly one league.

4. Add league scope guard middleware.
- Apply to member-facing endpoints so members cannot access other leagues' data.
- Return forbidden/validation errors on cross-league access attempts.

5. Keep admin score entry global/common.
- Preserve current admin actual-results behavior with no league filter.
- Document this invariant in API behavior and UI copy.

6. Add admin league-management APIs and UI.
- Admin can create/list/update leagues.
- Admin can assign and reassign members to leagues.
- Add UI controls with clear success/failure feedback.

7. Add test coverage and regression hardening.
- Add API tests for league isolation and assignment behavior.
- Add negative tests for cross-league access denial.
- Run full regression to ensure no breakage in login, OTP, scoring, and confirm flows.

## Phase 13 Verification Checklist
- Member in League A cannot access prediction/score/leaderboard data from League B.
- Member session always returns exactly one league assignment.
- Admin can assign/reassign members to leagues.
- Admin actual-score entry remains global and unchanged.
- Existing OTP request/verify/login behavior remains green.
- Full test suite passes with new league tests included.

## Phase 13 Risks and Mitigations
- Risk: Existing users without league assignment cause access issues.
- Mitigation: explicit backfill policy and startup-safe migration checks.

- Risk: League checks added inconsistently across endpoints.
- Mitigation: centralized league guard middleware and negative test coverage.

- Risk: Reassignment edge cases create stale member session context.
- Mitigation: refresh league context on session reload and verify via tests.

## Phase 13 Decisions
- One user can join only one league.
- Admin score-entry page is shared globally across all leagues.
- Phase 14 depends on Phase 13 completion for leaderboard and peer read-only prediction visibility.
- Phase 16 depends on Phase 13 and Phase 14 for league-local insights analytics.
- Twilio OTP remains in-place; only hardening is considered later if needed.

## Phase 13 Execution Status
- Status: Planned
- Planned on: 2026-06-06
- Phase dependencies:
   - Upstream: Phase 12 (OTP login via Twilio)
   - Downstream: Phase 14 and Phase 16 rely on league isolation contracts from this phase

## Phase 15 Goal (League Leaderboard + Read-Only Peer Predictions)
Deliver league leaderboard and read-only peer prediction visibility for members, scoped strictly to the member's own league, while keeping admin score-entry behavior global/common.

## Phase 15 Research Summary
- League isolation foundation from Phase 13 is active and must be reused for all reads.
- Members need a league-local leaderboard and peer drilldown without edit privileges.
- Existing scoring data can support deterministic ranking with explicit tie-break rules.
- Existing admin result entry must remain global/common and unchanged.
- Cross-league privacy is the primary risk and requires explicit negative tests.

## Phase 15 Execution Plan
1. Add concrete leaderboard and peer read APIs in [server.js](server.js).
- Add `GET /api/member/leaderboard` (member-only, same-league only).
- Add `GET /api/member/peers` (member-only list of same-league members).
- Add `GET /api/member/peers/:userId/predictions?limit=5` (member-only, read-only, same-league only).
- Apply centralized league authorization checks on all three endpoints.

2. Define ranking and tie-break contract in [server.js](server.js).
- Primary sort: total points descending.
- Tie-break 1: more exact scorelines correct.
- Tie-break 2: more correct results (winner_only + exact).
- Tie-break 3: shared rank when still tied.
- Return fields: `rank`, `userId`, `username`, `totalPoints`, `exactCorrect`, `resultsCorrect`.

3. Define peer prediction ordering and shape in [server.js](server.js).
- `GET /api/member/peers/:userId/predictions?limit=5` returns last 5 predictions by most recent match date (kickoff datetime descending), not by update timestamp.
- Response includes read-only match summary + prediction values only.
- Reject cross-league reads with `403` and machine-readable reason.

4. Add member leaderboard + drilldown UI in [app.js](app.js).
- Add member leaderboard panel showing rank, member, points, and tie-break stats.
- Add peer selector that includes all same-league members (including self).
- Add read-only drilldown panel for selected member's last 5 predictions using match-date ordering.

5. Preserve admin score entry global/common in [server.js](server.js).
- Keep existing admin actual-results CRUD endpoints and behavior unchanged.
- Do not league-filter admin score-entry APIs.

6. Migration and hardening in [db.js](db.js) and [server.js](server.js).
- Keep startup-safe backfill policy for members with no league assignment.
- Ensure registration/session paths always resolve member league context.
- Add explicit `league_assignment_required` error handling for member reads when context is missing.

7. Add privacy and authorization tests in [tests/api.test.js](tests/api.test.js).
- Positive tests: same-league leaderboard and peer reads work.
- Negative tests: cross-league peer prediction read is denied.
- Verify no unauthorized role access to member leaderboard/peer endpoints.

8. Run full regression.
- Run `npm test` for full-suite validation.
- Confirm no regression in OTP, scoring, confirm flows, and admin global score entry.

## Phase 15 Verification Checklist
- `GET /api/member/leaderboard` returns same-league members only with expected rank ordering and tie-break behavior.
- Tie resolution follows: total points > exactCorrect > resultsCorrect > shared rank.
- `GET /api/member/peers` returns all same-league members including self.
- `GET /api/member/peers/:userId/predictions?limit=5` returns read-only results ordered by most recent match date.
- Cross-league peer prediction access returns `403` with explicit reason.
- Member UI renders leaderboard and peer drilldown as read-only components.
- Admin result-entry APIs remain global/common and unchanged.
- Full regression suite passes.

## Phase 15 Risks and Mitigations
- Risk: Tie-break implementation diverges between API and UI display.
- Mitigation: compute authoritative ranks in API and render API-provided rank in UI.

- Risk: Cross-league privacy leakage through peer endpoints.
- Mitigation: centralized league guard + explicit negative tests for cross-league reads.

- Risk: Missing league assignment for legacy users breaks member views.
- Mitigation: startup-safe backfill + defensive `league_assignment_required` handling.

- Risk: Admin workflows regress from incidental league filtering.
- Mitigation: keep admin score endpoints unchanged and validate in regression suite.

## Phase 15 Decisions
- Leaderboard and peer drilldown are member-only and league-scoped.
- Peer selector includes all same-league members, including self.
- Peer drilldown returns last 5 predictions by most recent match date.
- Tie-break order: total points, exact scorelines correct, correct results, then shared rank.
- Admin score entry remains global/common.

## Phase 15 Execution Status
- Status: Completed
- Completed on: 2026-06-06
- Delivered files: server.js (APIs + helpers), app.js (rendering + wiring), index.html (UI containers), styles.css (mini-table styling), tests/api.test.js (privacy test), tests/phase9-ui.test.js (5 new UI tests)
- Verification evidence:
	- `npm test` passed (48 tests, 0 failures)
	- Leaderboard API working with deterministic tie-break: member1 rank 1 (3 pts), others rank 2 (-12 pts each, shared rank)
	- Peer selector dropdown rendering all 5 league members
	- Peer predictions showing last 5 sorted by kickoff date descending
	- Cross-league privacy enforced (403 responses)
	- League context backfill integrated into login/OTP flows
	- Live browser validation: all UI elements render and APIs respond correctly
- Phase dependencies:
   - Upstream: Phase 13 league isolation foundation
   - Downstream: Phase 16 league-local insights analytics

## Phase 16 Goal (Admin User and League Management with Simplified Admin UI)
Deliver admin user and league management capabilities with cascade delete safety, reorganize admin interface into exactly 2 navigation screens ("Manage Matches" and "Manage Leagues and Users"), and simplify left navigation to remove user directory and settings.

## Phase 16 Research Summary
- Current admin UI has three navigation options: dashboard, user directory, settings (Plus Manage Matches as default content).
- Delete patterns in Node/SQLite: cascade delete can orphan records or violate foreign key constraints if not planned carefully.
- League deletion must enforce a "cannot delete last league" rule to prevent data loss.
- Move-users workflow requires admin to select destination league before deletion, with validation that destination exists and differs from source.
- Admin match entry (global score entry) should remain unchanged and be accessible from Screen 1 ("Manage Matches").
- Screen 2 requires unified league and user management in a single view for admin efficiency.
- Session-based auth means user deletion also invalidates any active sessions; cleanup is required.
- Predictions and member_scores tied to user_id must be cascade-deleted; member_leagues tie users to leagues and must be handled carefully.

## Phase 16 Execution Plan

### 1. Database Schema and Migration (db.js)
- Add safe cascade delete constraints to foreign keys for maximum safety:
  - `member_leagues(user_id)` → `users(id)` ON DELETE CASCADE
  - `predictions(user_id)` → `users(id)` ON DELETE CASCADE
  - `member_scores(user_id)` → `users(id)` ON DELETE CASCADE
  - `otp_challenges(user_id)` → `users(id)` ON DELETE CASCADE
  - `auth_events(user_id)` → `users(id)` ON DELETE CASCADE
  - `auth_rate_limits(user_id)` → `users(id)` ON DELETE CASCADE
- Add optional ON DELETE SET NULL for audit tables where feasible:
  - `score_calculation_state(triggered_by_user_id)` → `users(id)` ON DELETE SET NULL
  - `actual_results(entered_by_user_id)` → `users(id)` ON DELETE SET NULL
- For league deletion:
  - `member_leagues(league_id)` → `leagues(id)` ON DELETE CASCADE is NOT suitable for move-users scenario.
  - Instead, keep `ON DELETE RESTRICT` and handle move-users in application logic.
  - Add migration: `PRAGMA foreign_keys = ON;` at startup for all connections.
- Migration strategy (db.js):
  - Check if foreign keys are already enforced; if not, apply initialization.
  - Use safe duplicate-column check pattern for all new constraints (check `PRAGMA foreign_key_list` before altering).
  - Log migration outcome (already enforced, newly enforced, or skipped if not supported).

### 2. User Delete API (server.js)

**Endpoint:** `DELETE /api/admin/users/:userId`
- Guard: admin-only (403 if not admin).
- Validation:
  - userId must be a valid integer > 0.
  - Cannot delete self (return 400 with reason `cannot_delete_self`).
  - Cannot delete the last admin (return 400 with reason `cannot_delete_last_admin`; enforce at least one admin remains).
- Behavior:
  - Check member_leagues for this user; if member is in a league and that league has other members, log intent but proceed (members of same league remain intact).
  - Execute DELETE FROM users WHERE id = ?; cascade constraints handle child records.
  - On success: return 200 { deleted: true, userId, deletedCount: <number of child records actually deleted> }.
  - On foreign key violation or constraint error: return 409 with reason `cascade_conflict` and detail about the constraint.
- Session invalidation:
  - After delete succeeds, invalidate any active sessions for this user (if session store tracks user_id; for in-memory stores, invalidate on next request check).
  - Log the deletion event to an audit trail if available.

**Implementation notes:**
- Build as DELETE handler after existing `admin/` route guards.
- Transaction boundaries: wrap in a transaction if SQLite3 supports it for atomicity.
- Test with a member user and an admin user to verify cascade behavior.

### 3. League Delete API (server.js)

**Endpoint:** `DELETE /api/admin/leagues/:leagueId?moveUsersTo=<destination_league_id>`
- Guard: admin-only (403 if not admin).
- Validation:
  - leagueId and moveUsersTo must be valid integers > 0.
  - Fetch league by leagueId; if not found, return 404.
  - Count total leagues: if leagueId is the only league, return 400 with reason `cannot_delete_last_league`.
  - Fetch destination league by moveUsersTo; if not found, return 400 with reason `destination_league_not_found`.
  - Ensure leagueId !== moveUsersTo (return 400 with reason `destination_must_differ_from_source`).
  - Verify destination league is active/valid (not soft-deleted if applicable; else just check it exists).
- Behavior:
  - Find all members in the source league: `SELECT user_id FROM member_leagues WHERE league_id = ?`.
  - For each member, update member_leagues: `UPDATE member_leagues SET league_id = ? WHERE user_id = ? AND league_id = ?` (update their league to destination).
  - Then delete the league: `DELETE FROM leagues WHERE id = ?`.
  - Recalculate any cached data if needed (e.g., if member_scores includes league_id, no action needed; they remain tied to user_id).
  - On success: return 200 { deleted: true, leagueId, movedUserCount: <number of members moved>, destinationLeagueId: moveUsersTo }.
  - On error: return 409 with reason and detail.
- Idempotency:
  - If league is already deleted, return 404.
  - If destination is deleted or no longer valid, return 400 before executing delete.

**Implementation notes:**
- Build as DELETE handler after existing `admin/` route guards.
- Use transaction for atomicity: begin, update member_leagues, delete league, commit.
- Test with 2+ leagues and members in both; verify members move correctly.

### 4. League List and Create APIs (server.js)

**Endpoints:**
- `GET /api/admin/leagues` (admin-only)
  - Return all leagues: `[{ id, name, createdAt, memberCount }]`.
  - Include memberCount computed from `SELECT COUNT(*) FROM member_leagues WHERE league_id = ?` per league.
  - Useful for destination selection UI (show available leagues with member counts).
  
- `POST /api/admin/leagues` (admin-only)
  - Accept `{ name: string }`.
  - Validate name is non-empty and unique.
  - Insert and return `{ id, name, createdAt, memberCount: 0 }`.

- `GET /api/admin/leagues/:leagueId/members` (admin-only)
  - Return all members in league: `[{ userId, username, alias, phone, joinedAt }]`.
  - Useful for verifying destination league state before move-users.

### 5. User List API Enhancement (server.js)

**Endpoint:** `GET /api/admin/users` (admin-only)
- Add or enhance to return all users with league context:
  - Response: `[{ id, username, alias, phone, role, leagueId, leagueName, createdAt, lastLoginAt }]`.
  - Include league assignment info so UI can display member→league mapping.
  - Sort by role (admin first) then username for readability.

### 6. Frontend Admin UI Refactor (index.html, app.js, styles.css)

#### Screen 1: "Manage Matches" (default on load)
- Left sidebar: navigation button "Manage Matches" (active/highlighted by default) and "Manage Leagues and Users".
- Main content: existing admin actual-results entry interface (unchanged from Phase 3).
  - Show Group Stage fixtures with score inputs and Confirm/Clear buttons.
  - Show scoring trigger button (`Calculate Member Scores`) if present.
  - Layout and behavior remain as-is.

#### Screen 2: "Manage Leagues and Users"
- Left sidebar: still shows "Manage Matches" and "Manage Leagues and Users" options; this screen's option is highlighted.
- Main content: two unified management panels (or tab-like divisions):
  
  **Panel A: Leagues Management**
  - Table: League Name | Member Count | Actions
  - Actions: Edit (name), Delete (with move-users workflow), Create New League.
  - Create New League: modal or inline form with text input, confirmation button.
  - Edit League: modal with name field, save/cancel.
  - Delete League:
    - Check member count in league; if > 0, show required step: "Select destination league for members".
    - Dropdown/select to pick destination from all OTHER leagues.
    - Show count of members to be moved.
    - Show warning if trying to delete last league ("Cannot delete; this is the last league").
    - Confirmation button to proceed; on click, call DELETE /api/admin/leagues/:leagueId?moveUsersTo=destinationId.
    - Show success: "League deleted and 3 members moved to League B".
  
  **Panel B: Users Management**
  - Table: Username | Alias | Phone | Role | League | Actions
  - Actions: Edit (optional, minimal), Delete, Reassign League.
  - Edit User (optional for Phase 16 scope; can skip if not in scope).
  - Delete User:
    - Confirmation modal: "Permanently delete user {username} and all their predictions? This cannot be undone."
    - If user is only admin: show warning "Cannot delete; this is the last admin user."
    - Checkbox to acknowledge cascading delete of all predictions.
    - Confirmation button; on click, call DELETE /api/admin/users/:userId.
    - Show success: "User {username} and 5 predictions deleted."
  - Reassign League:
    - Modal with league dropdown (show all leagues).
    - On save, call PUT /api/admin/users/:userId/league with { leagueId }.
    - Show success: "User {username} reassigned to League B."

#### Left Navigation Simplification
- Remove: "User Directory", "Settings" (if present in current admin nav).
- Keep only: "Manage Matches", "Manage Leagues and Users".
- Add visual active state (highlight/underline) for current screen.
- On logout or if session expires, clear selection and redirect to login.

#### Confirm Delete UX Best Practice
- Modal or alert component (not browser alert() for better UX).
- Clear title: "Delete [User/League]?"
- Explain consequence: "This action cannot be undone."
- For user delete: "All predictions and scores for this user will be permanently deleted."
- For league delete with members: "Members will be moved to [destination league]."
- Two buttons: "Cancel" (closes modal) and "Delete" (red/danger styling, triggers delete API).
- On delete success: modal closes, table re-fetches and member/league removed.
- On delete error: show error message in modal; do NOT close.

### 7. Frontend Routing and State Management (app.js)

**Hash Routes:**
- Existing: `#/`, `#/member/login`, `#/admin/dashboard`
- Enhance `#/admin/dashboard`:
  - Add sub-route or state: `#/admin/dashboard/manage-matches` (default if no sub-route) and `#/admin/dashboard/manage-leagues-users`.
  - Alternatively, use query param: `#/admin/dashboard?tab=matches` (default) or `#/admin/dashboard?tab=leagues`.
  - Render only the left sidebar + appropriate screen based on state.
- On hash change, update active nav button styling.

**UI Rendering:**
- Implement `renderAdminManageMatches()`: existing admin UI, no changes.
- Implement `renderAdminManageLeaguesUsers()`: two panels with tables and modals.
- Implement modal helper: `showDeleteUserModal(userId, username)`, `showDeleteLeagueModal(leagueId, leagueName, memberCount)`, `showMoveUsersForm(leagueId, leagueName)`.
- On modal confirm, trigger API call; on success, re-fetch lists and refresh tables.

**Session and State:**
- Fetch admin user list and league list on screen enter (via `GET /api/admin/users` and `GET /api/admin/leagues`).
- Store in local variables for quick access; refetch on any delete/create action.
- Preserve current tab/screen on page reload (read from hash).

### 8. Test Strategy (tests/api.test.js and tests/phase9-ui.test.js)

#### API Tests (tests/api.test.js)
- **User Delete Tests:**
  1. Admin can delete a non-admin member user; cascade deletes predictions and member_scores.
  2. Admin cannot delete self (403 `cannot_delete_self`).
  3. Admin cannot delete the last admin user (400 `cannot_delete_last_admin`).
  4. Deleting user with predictions removes all prediction records.
  5. Deleting user removes member_leagues and otp_challenges entries.
  6. Attempt to delete non-existent user returns 404.
  7. Non-admin member attempting delete returns 403.

- **League Delete Tests:**
  1. Admin cannot delete the only/last league (400 `cannot_delete_last_league`).
  2. Admin can delete a league with no members (no move-users needed).
  3. Admin can delete a league with members, specifying destination; members move correctly.
  4. Attempting to delete with invalid destination league returns 400 `destination_league_not_found`.
  5. Attempting to delete with destination same as source returns 400 `destination_must_differ_from_source`.
  6. Non-admin attempting delete returns 403.
  7. Deleting with members applies CASCADE correctly; verify member_leagues updated.
  8. Verify other leagues' members remain unaffected by league delete.

- **League List and Create Tests:**
  1. Admin can fetch all leagues with member counts.
  2. Admin can create a new league and it appears in list.
  3. New league has memberCount = 0 on creation.

- **User List Enhancement Tests:**
  1. Admin fetches user list; each member includes leagueId and leagueName.
  2. Admin fetches members of a specific league via GET /api/admin/leagues/:leagueId/members.

- **Regression Tests:**
  - Ensure all Phase 15 member leaderboard, peer, and scoring tests still pass.
  - Ensure all Phase 12 OTP and registration tests still pass.
  - Ensure all Phase 3 admin actual-results CRUD tests still pass.

#### UI Tests (tests/phase9-ui.test.js)
- **Navigation Tests:**
  1. Admin sidebar shows exactly two nav options: "Manage Matches" and "Manage Leagues and Users".
  2. "Manage Matches" is highlighted/active on default admin load.
  3. Clicking "Manage Leagues and Users" switches view and highlights that option.
  4. No "User Directory" or "Settings" options visible.

- **Manage Matches Screen Tests:**
  1. Screen 1 renders existing admin actual-results table.
  2. Score inputs and Confirm/Clear buttons functional.

- **Manage Leagues and Users Screen Tests:**
  1. Screen 2 renders Leagues Management panel with table (Name, Member Count, Actions).
  2. Screen 2 renders Users Management panel with table (Username, Alias, Role, League, Actions).
  3. Leagues panel includes "Create New League" button/action.
  4. League rows include Delete and optionally Edit actions.
  5. User rows include Delete and Reassign League actions.

- **Delete User Modal Tests:**
  1. Clicking Delete on a user row opens modal.
  2. Modal shows username and warning about cascade delete.
  3. If user is last admin, shows "Cannot delete" message (disable button).
  4. Cancel button closes modal without deleting.
  5. Confirm button triggers DELETE API and closes modal on success.
  6. User removed from table on success.

- **Delete League Modal Tests:**
  1. Clicking Delete on a league row opens modal.
  2. If league is last league, shows "Cannot delete" message (disable button).
  3. If league has members, modal shows destination league selector.
  4. Selector shows all OTHER leagues with member counts.
  5. Cancel button closes modal without deleting.
  6. Confirm button triggers DELETE API and closes modal on success.
  7. League removed from table on success; members' league assignment updated.

- **Create League Modal Tests:**
  1. Clicking "Create New League" opens modal.
  2. Text input for league name.
  3. Validation: reject empty name.
  4. Confirm button submits POST /api/admin/leagues.
  5. New league appears in table on success.

## Phase 16 Schema Summary

**Existing Tables (Unchanged):**
- `users` (id, username, alias, phone_e164, password, role, timezone, otp_enabled, phone_verified_at, ...)
- `leagues` (id, name, created_at)
- `member_leagues` (id, user_id, league_id, created_at)
- `predictions` (id, user_id, match_number, team_a_score, team_b_score, ...)
- `actual_results` (id, match_number, team_a_score, team_b_score, entered_by_user_id, ...)
- `member_scores` (id, user_id, match_number, points, reason, calculated_at)
- `otp_challenges`, `auth_events`, `auth_rate_limits` (unchanged)

**Constraint Additions (db.js Migration):**
```sql
PRAGMA foreign_keys = ON;

-- Ensure cascade delete for user-dependent records
ALTER TABLE member_leagues ADD CONSTRAINT fk_ml_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE; -- if not already present
ALTER TABLE predictions ADD CONSTRAINT fk_pred_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE member_scores ADD CONSTRAINT fk_ms_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE otp_challenges ADD CONSTRAINT fk_otp_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE auth_events ADD CONSTRAINT fk_ae_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE auth_rate_limits ADD CONSTRAINT fk_arl_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Optional SET NULL for audit trails
ALTER TABLE actual_results ADD CONSTRAINT fk_ar_user FOREIGN KEY(entered_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE score_calculation_state ADD CONSTRAINT fk_scs_user FOREIGN KEY(triggered_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- League constraints: keep RESTRICT to handle move-users in app logic
ALTER TABLE member_leagues ADD CONSTRAINT fk_ml_league FOREIGN KEY(league_id) REFERENCES leagues(id) ON DELETE RESTRICT; -- if not already present
```

**No new tables required for Phase 16.**

## Phase 16 API Endpoints Summary

| Method | Endpoint | Guard | Purpose |
|--------|----------|-------|---------|
| GET | /api/admin/users | admin | List all users with league info |
| DELETE | /api/admin/users/:userId | admin | Delete user and cascade child records |
| GET | /api/admin/leagues | admin | List all leagues with member counts |
| POST | /api/admin/leagues | admin | Create new league |
| DELETE | /api/admin/leagues/:leagueId | admin | Delete league with move-users validation |
| GET | /api/admin/leagues/:leagueId/members | admin | List members in a specific league |
| (Optional) PUT | /api/admin/users/:userId/league | admin | Reassign user to different league |

## Phase 16 Verification Checklist

- **API Functionality:**
  - ✓ Admin can delete a non-admin user; cascade delete removes predictions, member_scores, otp_challenges, auth_events, auth_rate_limits.
  - ✓ Admin cannot delete self (400 `cannot_delete_self`).
  - ✓ Admin cannot delete last admin (400 `cannot_delete_last_admin`).
  - ✓ Admin cannot delete only/last league (400 `cannot_delete_last_league`).
  - ✓ Admin can delete league with members, specifying destination; members move to destination league.
  - ✓ Admin cannot delete league with mismatched destination (400 or 404 with clear reason).
  - ✓ GET /api/admin/users returns all users with leagueId and leagueName.
  - ✓ GET /api/admin/leagues returns all leagues with memberCount.
  - ✓ GET /api/admin/leagues/:leagueId/members returns members in that league.
  - ✓ POST /api/admin/leagues creates new league.

- **UI Navigation and Layout:**
  - ✓ Admin sidebar shows exactly 2 options: "Manage Matches" and "Manage Leagues and Users".
  - ✓ "Manage Matches" is active/highlighted on default admin load.
  - ✓ No "User Directory" or "Settings" options visible.
  - ✓ Clicking sidebar options switches screens and updates active highlight.

- **Screen 1: Manage Matches:**
  - ✓ Renders existing admin score-entry table (Group Stage fixtures, score inputs, Confirm/Clear).
  - ✓ Existing admin functionality (score entry, calculate button) works unchanged.

- **Screen 2: Manage Leagues and Users:**
  - ✓ Leagues panel: table with Name, Member Count, Actions (Delete, optional Edit, Create).
  - ✓ Users panel: table with Username, Alias, Role, League, Actions (Delete, optional Reassign).
  - ✓ Create League modal: form to enter league name, confirm creates league and adds to table.
  - ✓ Delete User modal: shows username, warning about cascade delete, last-admin guard, confirm deletes and removes from table.
  - ✓ Delete League modal: shows league name, destination selector if members exist, member-move warning, last-league guard, confirm deletes and updates members.
  - ✓ Reassign League action (if in scope): modal to select new league, confirm updates user's league assignment.

- **Cascade Delete Behavior:**
  - ✓ Deleting user cascades to predictions, member_scores, otp_challenges, auth_events, auth_rate_limits.
  - ✓ Deleting league with members moves members (does not cascade delete; move-users explicit).
  - ✓ actual_results.entered_by_user_id set to NULL if user deleted (no cascade; audit trail preserved).

- **Session and Consistency:**
  - ✓ Deleted user's active session invalidated on next request or gracefully cleaned.
  - ✓ Member scores and leaderboard data recalculate correctly after user deletion.
  - ✓ League leaderboard (Phase 15) remains correct after league reassignment or deletion.

- **Error Handling:**
  - ✓ Attempting to delete non-existent user/league returns 404.
  - ✓ Non-admin attempting delete returns 403.
  - ✓ Constraint violations (e.g., deleting last admin) return 400 with machine-readable reason.
  - ✓ UI shows clear error messages on delete failure (API errors displayed in modal).

- **Regression Testing:**
  - ✓ All Phase 15 leaderboard and peer tests remain green.
  - ✓ All Phase 12 OTP and login tests remain green.
  - ✓ All Phase 3 admin actual-results CRUD tests remain green.
  - ✓ All Phase 7 UI and scoring tests remain green.
  - ✓ Full `npm test` suite passes.

## Phase 16 Risks and Mitigations

- **Risk:** Cascade delete removes too much data or violates business logic (e.g., audit trail loss).
  - **Mitigation:** Use SET NULL for audit columns (entered_by_user_id, triggered_by_user_id) and CASCADE only for transactional data (predictions, scores). Document constraint policy in db.js.

- **Risk:** Admin accidentally deletes last admin user, locking out future access.
  - **Mitigation:** Explicit check before delete; return 400 `cannot_delete_last_admin` and do not proceed. Add test to verify guard.

- **Risk:** Admin accidentally deletes only league, orphaning all members.
  - **Mitigation:** Explicit check before delete; return 400 `cannot_delete_last_league` and do not proceed. Add test to verify guard.

- **Risk:** Move-users destination selection is confusing or invalid.
  - **Mitigation:** UI dropdown shows all OTHER leagues with member counts. Validation checks destination exists and differs from source. API returns clear error if validation fails.

- **Risk:** Session remains active for deleted user, allowing unauthorized actions.
  - **Mitigation:** On user delete, log the deletion event. On next session check, validate user_id exists; if not, invalidate session and redirect to login. For in-memory session stores, add user_id to session and validate on each request.

- **Risk:** Concurrent deletes race and corrupt data.
  - **Mitigation:** Use SQLite transaction boundaries (BEGIN/COMMIT) for delete operations. SQLite handles serialization; tests verify no race conditions with concurrent deletes.

- **Risk:** Foreign key constraint enforcement is off by default in SQLite.
  - **Mitigation:** Explicitly enable `PRAGMA foreign_keys = ON;` in db.js at startup and in tests. Add migration check in db.js initialization.

- **Risk:** UI state out of sync after delete (modal remains open, table not updated).
  - **Mitigation:** After successful delete API call, re-fetch list data and refresh tables. Modal closes on success. Show error in modal if delete fails; do not auto-close.

- **Risk:** Partial delete leaves dangling foreign keys if transaction rolls back.
  - **Mitigation:** Use atomic transactions; wrap entire delete operation in BEGIN/COMMIT. On error, ROLLBACK and return error to client.

## Phase 16 Decisions

1. **Cascade Delete Strategy:** Use CASCADE for transactional data (predictions, member_scores) and SET NULL for audit data (entered_by_user_id, triggered_by_user_id).
   - Rationale: Maintains data consistency while preserving historical audit trail where meaningful.

2. **League Deletion UX:** Require explicit destination league selection before delete (not automatic auto-assign).
   - Rationale: Admin must consciously choose where members go; prevents accidental mis-assignment.

3. **Last Admin/League Validation:** Enforce at API level with 400 error; do not allow at UI level only.
   - Rationale: API-level guard ensures no edge-case bypass; UI guard is UX courtesy.

4. **Session Invalidation:** On delete, invalidate session on next request check (lazy invalidation).
   - Rationale: Simple and robust; avoids distributed session store complexity for local app.

5. **Left Navigation Simplification:** Remove "User Directory" and "Settings" entirely; keep only "Manage Matches" and "Manage Leagues and Users".
   - Rationale: Simplifies admin UX and aligns with Phase 16 goal of focused management interface.

6. **Two-Screen Admin Layout:** Use hash-route sub-navigation or query param to switch between screens.
   - Rationale: Preserves existing routing pattern and avoids new routing library.

7. **Unified Leagues + Users Panel:** Combine on same screen (Screen 2) for efficient admin workflow.
   - Rationale: Admins often need to reassign users and manage leagues in sequence; combined view reduces context switching.

8. **No User Edit in Phase 16 Scope:** Delete and Reassign are primary actions; Edit is optional and deferred if not critical.
   - Rationale: Scope focus on delete workflows; edit can be Phase 17 enhancement if needed.

## Phase 16 Dependencies
- **Upstream:** Phase 15 (league isolation, leaderboard, peer predictions).
- **Upstream:** Phase 12 (OTP, auth, session management).
- **Upstream:** Phase 3 (admin actual-results APIs).
- **Downstream:** Phase 17+ (additional admin features, advanced reporting, bulk operations).

## Phase 16 Execution Status
- Status: Completed
- Completed on: 2026-06-06
- Delivered files:
  - server.js: added `GET /api/admin/users`, `DELETE /api/admin/users/:userId`, and `DELETE /api/admin/leagues/:leagueId`; implemented transactional user-record deletion, league deletion with member moves, self-delete guard, last-admin guard, last-league guard, and deleted-user session invalidation.
  - app.js: added two-screen admin navigation, default Manage Matches view, Manage Leagues and Users rendering, league destination selectors, user reassign controls, user delete controls, and textContent-based table rendering for user/admin-entered values.
  - index.html: simplified admin sidebar to exactly `Manage Matches` and `Manage Leagues and Users`; split admin content into `admin-matches-screen` and `admin-leagues-users-screen`; added leagues/users management tables.
  - styles.css: added compact admin table, action row, row select, and danger button styles.
  - tests/api.test.js: added Phase 16 API coverage for admin user list, user cascade delete, member access denial, delete-self denial, league delete with move-users, destination-required validation, and last-league protection.
  - tests/phase9-ui.test.js: added Phase 16 UI contract coverage for simplified navigation, two-screen hooks, frontend action wiring, and server endpoint patterns.
- Verification evidence:
  - `npm test` passed (54 tests, 0 failures).
  - Live browser validation on `http://localhost:3001`: admin default view shows only two nav options and loads Manage Matches with 72 match rows.
  - Live browser validation on `http://localhost:3001`: Manage Leagues and Users renders league rows, member counts, destination league selectors for league deletion, users table, role/league columns, Reassign controls, and Delete controls.
  - Admin score-entry APIs remain global/common and unchanged by regression coverage.
  - User/league delete guardrails verified through API tests with machine-readable reasons.

## Phase 17 Goal (Member Dashboard Two-Screen Split + Leaderboard Polish)
Switch the member dashboard at `#/member` into exactly two member-facing screens: `My Predictions` first and default, and `My League` second. Preserve the existing predictions table behavior exactly in `My Predictions`, move all league summary, leaderboard, and peer prediction content into `My League`, and give the leaderboard a little more energy while staying consistent with the current app design.

## Phase 17 Research Summary
- This is a frontend-only phase. No backend or API changes are recommended for Phase 17.
- Keep the existing member route as `#/member`; screen switching should be local member-dashboard state, not a new backend route.
- Current `index.html` has `#predictions-view` containing the member header, `.tz-bar`, `.member-league-panel`, and match table `#matches-body` in one combined view.
- Current `app.js` has `renderMember()` calling `renderPredictionsTable()`, `renderMemberLeagueSummary()`, and `renderMemberLeaderboardAndPeers()` together.
- Existing DOM IDs used by the prediction table, league summary, leaderboard, peer selector, and peer prediction rendering should be preserved so current render functions can remain mostly intact.
- Add tab/nav controls with these hooks: `#member-tab-predictions`, `#member-tab-league`.
- Add screen containers with these hooks: `#member-predictions-screen`, `#member-league-screen`.
- Add helper `setMemberScreen(screenName)` in `app.js`; default to `predictions` inside `renderMember()`.
- Keep the timezone dropdown inside `My Predictions`, because it directly controls the match table date/time display.
- Move `.member-league-panel` into `My League`, and rename the peer section heading from `Peer Predictions (Read-Only)` to `View Others' Predictions`.
- Leaderboard hype should be restrained and app-consistent: top-three rank badges/classes, current-user highlight, and stronger leaderboard card styling without changing data contracts.

## Phase 17 Execution Plan
1. Restructure the member dashboard markup in `index.html`.
- In `#predictions-view`, keep the existing member header and header actions intact.
- Add a member screen nav immediately below the header with two controls in this exact order:
  - `button#member-tab-predictions` with visible label `My Predictions`
  - `button#member-tab-league` with visible label `My League`
- Add `section#member-predictions-screen` and move the existing `.tz-bar` plus existing predictions table `.table-wrap` into it.
- Add `section#member-league-screen` and move the existing `.member-league-panel` into it.
- Preserve these existing IDs exactly: `timezone-select`, `matches-body`, `member-league-name`, `member-league-members`, `member-league-status`, `member-leaderboard-body`, `member-peer-select`, `member-peer-status`, and `member-peer-predictions-body`.
- Rename only the peer heading text to `View Others' Predictions`; do not change the peer select/table IDs or API assumptions.
- Do not remove, rename, or rearrange the predictions table columns: match list, prediction inputs, actual score, points, status, and action buttons remain exactly as current tabular form.

2. Add member screen state and wiring in `app.js`.
- Add DOM references for `member-tab-predictions`, `member-tab-league`, `member-predictions-screen`, and `member-league-screen` near the existing member DOM constants.
- Add `let memberActiveScreen = 'predictions';` near other UI state.
- Implement `setMemberScreen(screenName)`:
  - Accept only `predictions` or `league`; fallback to `predictions`.
  - Toggle `.active` on the two tab controls.
  - Toggle `.hidden` on the two screen sections.
  - Set useful accessibility state such as `aria-selected` or `aria-current` on the active control.
- Wire tab click handlers in the existing startup/event-listener area so `My Predictions` and `My League` switch screens without changing `window.location.hash`.
- In `renderMember()`, set `memberActiveScreen = 'predictions'` and call `setMemberScreen('predictions')` before or after the existing `Promise.all` rendering work.
- Keep `renderPredictionsTable()`, `renderMemberLeagueSummary()`, `renderMemberLeaderboardAndPeers()`, and `renderPeerPredictionsForSelectedMember()` mostly intact; the goal is to relocate their DOM, not rewrite their behavior.
- Preserve prediction CRUD behavior as a hard requirement: `Confirm`, `Clear`, score steppers, lock behavior, actual score display, points display, status labels, total points, and timezone-driven date formatting must continue to work unchanged.

3. Add restrained leaderboard polish in `app.js` and `styles.css`.
- In `renderMemberLeaderboardRows(leaderboard)`, add row classes based on rank:
  - `leaderboard-rank-1`, `leaderboard-rank-2`, `leaderboard-rank-3` for top-three rows.
  - `leaderboard-current-user` when the row represents the logged-in member. Use available IDs if the leaderboard payload exposes user id; otherwise compare the row username to `sessionUser.username` as a local fallback.
- Render the rank cell with a small badge element, for example `<span class="rank-badge rank-badge-1">1</span>` for first place, while preserving the table's five-column shape.
- In `styles.css`, add classes for `.member-screen-nav`, `.member-screen-tab`, `.member-screen-tab.active`, `.member-screen`, `.member-leaderboard-card`, `.leaderboard-rank-1`, `.leaderboard-rank-2`, `.leaderboard-rank-3`, `.leaderboard-current-user`, and `.rank-badge` variants.
- Keep the design consistent with existing tokens (`--space-*`, `--radius-sm`, `--radius-md`, `--border`, surface colors). Do not introduce a loud one-hue palette, oversized hero styling, gradients, or decorative effects.
- Ensure mobile layout keeps both screens readable: tabs wrap cleanly if needed, `My Predictions` table remains horizontally scrollable as today, and `My League` cards remain responsive under the existing `.member-league-panel` breakpoints.

4. Add Phase 17 structural UI tests.
- Extend `tests/phase9-ui.test.js` or create `tests/phase17-ui.test.js`; prefer a new focused test file if the existing Phase 9 file is getting crowded.
- Test `index.html` contains the member tabs in the required order: `member-tab-predictions` before `member-tab-league`, with labels `My Predictions` and `My League`.
- Test `index.html` contains `#member-predictions-screen` with the timezone select and `#matches-body` table hook inside that screen.
- Test `index.html` contains `#member-league-screen` with the league name, league members, leaderboard body, peer selector, peer status, and peer predictions body hooks inside that screen.
- Test peer heading text is `View Others' Predictions` and the old heading text `Peer Predictions (Read-Only)` is absent.
- Test `app.js` includes `function setMemberScreen(`, initializes/defaults member view to predictions in `renderMember()`, and wires both tab controls.
- Test `app.js` still calls `renderPredictionsTable()`, `renderMemberLeagueSummary()`, and `renderMemberLeaderboardAndPeers()` from the member render path so existing data refresh behavior is preserved.
- Test `styles.css` includes the new member tab/screen classes and leaderboard hype classes (`rank-badge`, top-three row classes, current-user highlight).
- Do not add API tests or server tests for this phase unless a regression is discovered; no backend/API deliverable is in scope.

5. Run verification.
- Run `npm test` and keep the full suite green.
- Start the app with `npm start` for a manual browser smoke check.
- In the browser, log in as a member, visit `#/member`, and confirm `My Predictions` is visible by default.
- On `My Predictions`, verify the timezone dropdown and match table still work exactly as before, including Confirm/Clear actions, actual/points/status columns, lock state, and total points display.
- Switch to `My League` and verify league name, members, leaderboard, and `View Others' Predictions` render correctly.
- Confirm switching tabs does not reload the route, lose session, or break peer selector behavior.

## Phase 17 Verification Checklist
- `#/member` remains the member route; no new backend route or API endpoint is added.
- Member dashboard shows exactly two member screen controls in this order: `My Predictions`, then `My League`.
- `My Predictions` is selected by default every time `renderMember()` enters the member dashboard.
- `My Predictions` contains the existing timezone dropdown and the full predictions table with all current columns and row actions.
- Prediction behavior is preserved exactly: match rows render, saved predictions populate, Confirm saves, Clear deletes or empties, locked matches disable edits, actual scores show, points/status show, and total points updates.
- `My League` contains league name, league members, leaderboard, and peer prediction viewer.
- Peer viewer heading reads exactly `View Others' Predictions`.
- Existing DOM IDs used by current render functions remain available after the markup move.
- Leaderboard rows include visible rank badges, top-three visual treatment, and current-user highlight when the current member appears.
- New styling remains restrained and consistent with existing app tokens, spacing, radii, and responsive behavior.
- `tests/phase9-ui.test.js` or `tests/phase17-ui.test.js` covers screen hooks, nav order, JS wiring, and CSS classes.
- `npm test` passes.
- Manual browser smoke check passes for member tab switching and predictions preservation.

## Phase 17 Risks and Mitigations
- Risk: Moving DOM nodes breaks existing render functions that query by ID.
  - Mitigation: Preserve all existing IDs and only wrap/move the existing elements into new screen containers.

- Risk: Defaulting to the wrong screen hides the predictions workflow users rely on most.
  - Mitigation: Set `memberActiveScreen = 'predictions'` and call `setMemberScreen('predictions')` in `renderMember()`; add structural JS test coverage.

- Risk: Timezone dropdown stops updating the predictions table after being moved.
  - Mitigation: Keep `#timezone-select` unchanged inside `#member-predictions-screen` and preserve the existing change handler that calls `renderPredictionsTable()`.

- Risk: Leaderboard polish accidentally changes leaderboard API assumptions or row shape.
  - Mitigation: Keep the same five table columns and API fields; only add CSS classes and badge markup around existing values.

- Risk: Current-user highlighting is unavailable if leaderboard payload lacks user IDs.
  - Mitigation: Prefer `entry.userId` or equivalent if present; fallback to `entry.username === sessionUser.username` without changing backend payloads.

- Risk: Added tabs create keyboard/accessibility regressions.
  - Mitigation: Use real `button` elements, clear active state, and `aria-selected` or `aria-current`; keep focus styling consistent with existing button/nav styles.

- Risk: Manual smoke check reveals a backend dependency assumption.
  - Mitigation: Treat it as a regression only if existing frontend behavior breaks; do not add new backend deliverables for Phase 17 unless required to restore pre-existing behavior.

## Phase 17 Decisions
1. **Two member screens only:** Member dashboard will have exactly `My Predictions` and `My League`.
   - Rationale: Matches the requested member information architecture and avoids extra navigation complexity.

2. **`My Predictions` is first and default:** It appears first in the nav and is selected on every member dashboard render.
   - Rationale: Prediction entry remains the primary member workflow.

3. **Keep `#/member`:** Screen switching is local UI state, not a hash-route split.
   - Rationale: Preserves existing routing/session behavior and keeps the phase frontend-only.

4. **Preserve predictions behavior as a hard requirement:** The table's data, columns, controls, timezone dropdown, and render/update flow must remain functionally unchanged.
   - Rationale: Phase 17 is a layout split, not a predictions feature rewrite.

5. **Move league content, do not rebuild it:** Existing league summary, leaderboard, peer select, and peer prediction rendering functions should continue to drive the moved DOM hooks.
   - Rationale: Reduces regression risk and honors existing Phase 15 implementation.

6. **Leaderboard hype stays restrained:** Add rank badges, top-three row classes, current-user highlight, and stronger card styling using existing tokens.
   - Rationale: Improves energy on the league screen without turning it into a separate visual system.

7. **No backend/API scope:** Phase 17 should not modify `server.js`, `db.js`, API routes, schema, or auth behavior unless a frontend test exposes a pre-existing break that must be restored.
   - Rationale: Research says current APIs already provide the required league and predictions data.

## Phase 17 Execution Status
- Status: Completed
- Completed on: 2026-06-06
- Delivered files:
  - `index.html`: split the member dashboard into `My Predictions` and `My League` screens; kept `My Predictions` first/default; moved timezone + prediction table into `member-predictions-screen`; moved league summary, members, leaderboard, and peer reader into `member-league-screen`; renamed peer heading to `View Others' Predictions`.
  - `app.js`: added member tab DOM references, `memberActiveScreen`, `setMemberScreen(screenName)`, tab click wiring, default prediction-screen selection in `renderMember()`, and leaderboard rank/current-user row styling hooks.
  - `styles.css`: added member tab styling, member screen styling, rank badges, top-three leaderboard treatment, and current-user highlight.
  - `tests/phase9-ui.test.js`: added Phase 17 UI contract tests for tab order, screen hooks, JS wiring, and leaderboard polish classes.
- Verification evidence:
  - `npm test` passed (58 tests, 0 failures).
  - Browser smoke check completed for `My Predictions`: member login succeeded, `My Predictions` rendered first/default, timezone dropdown was visible, prediction rows loaded, existing actual/points/status/lock data rendered, and total points updated to `3`.
  - Remaining browser check for `My League` was intentionally skipped by user request to reduce token-per-minute usage.
- Backend/API scope:
  - `server.js`, `db.js`, and backend API behavior were left unchanged for Phase 17.
- Hard requirement met: existing predictions table behavior remains in `My Predictions` and regression tests stayed green.

## PLANNING COMPLETE

## Phase 18 Goal (Remove OTP, Standardize Password Auth, Add Password Management)
Remove all OTP-based authentication behavior and move the app to password-only authentication. New users must set their password at registration, existing users must be able to change password using current password plus new password entered twice, and admins must be able to reset any user's password to a provided string.

## Phase 18 Research Summary
- OTP logic is currently spread across backend routes (`/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/member/auth-methods`), frontend login/signup flows, DB tables (`otp_challenges`, `auth_rate_limits`, `auth_events`), and OTP provider module (`src/auth/otp-provider.js`).
- Current member registration requires `phone` primarily to support OTP. Removing OTP means registration should no longer depend on phone for authentication.
- Existing login is already password-capable for admin/member users, but member login has OTP gate behavior tied to `otp_enabled`/`otp_fallback_until` that must be removed.
- Existing tests strongly assert OTP behavior (especially Phase 12 API tests and OTP provider tests); these must be replaced with password lifecycle coverage.
- Existing schema contains OTP-specific columns in `users` (`phone_verified_at`, `otp_enabled`, `password_login_enabled`, `otp_fallback_until`) and OTP-specific tables. Runtime decoupling is required first; schema cleanup can be done in this phase with safe migration guards.

## Phase 18 Execution Plan
1. Remove OTP dependencies from backend auth flow (`server.js`).
- Remove OTP provider import and initialization (`createOtpProvider`, `otpProvider`).
- Remove OTP constants and helper usage (`OTP_*` settings, OTP fallback checks, OTP rate-limit/auth-event paths).
- Update `/api/login`:
  - Keep username/password validation and role/session behavior.
  - Remove all OTP-required gating for members.
  - Preserve member league context assignment behavior.
- Remove OTP endpoints entirely:
  - `POST /api/auth/otp/request`
  - `POST /api/auth/otp/verify`
  - `GET /api/member/auth-methods`
- Keep non-auth admin/member routes unchanged.

2. Convert registration to password-only (new users set password at create time).
- Update `registerMemberHandler` payload validation to require:
  - `username`
  - `password`
  - `confirmPassword`
- Make `phone` optional for Phase 18 (store normalized value only if provided and valid).
- Enforce `password === confirmPassword`; return `400` when mismatch.
- Continue returning `409` for username/phone uniqueness conflicts.
- Update route aliases behavior consistently (`/api/member/register`, `/api/register`, `/member/register`, `/member/signup`).

3. Add member self-service password change API.
- Add member-authenticated endpoint:
  - `PUT /api/member/password`
- Request payload:
  - `currentPassword`
  - `newPassword`
  - `confirmNewPassword`
- Validation rules:
  - all fields required
  - `newPassword === confirmNewPassword`
  - `currentPassword` must match stored password for session user
  - reject if new password equals current password
- Response behavior:
  - `400` invalid payload or mismatch
  - `401` current password incorrect
  - `200` password updated
- Optional hardening for this app level: increment `auth_version` and regenerate session after change.

4. Add admin password reset API (reset any user password to given string).
- Add admin-only endpoint:
  - `PUT /api/admin/users/:userId/password`
- Request payload:
  - `newPassword`
  - `confirmNewPassword`
- Validation rules:
  - valid `userId`
  - target user must exist
  - new password fields required and must match
- Response behavior:
  - `400` invalid payload
  - `404` user not found
  - `200` reset success with `{ userId, username, passwordReset: true }`
- Keep existing admin role guard and avoid exposing old password values.

5. Remove OTP UI and wire password management UI (`index.html`, `app.js`, `styles.css`).
- Login screen:
  - Remove OTP request and OTP verify forms.
  - Keep a single username/password login form.
  - Update credential hint text to password-only behavior.
- Signup screen:
  - Remove OTP-oriented copy and OTP auto-send behavior.
  - Use fields: username, optional phone, password, confirm password.
- Member dashboard:
  - Add password change form section (current, new, confirm new) with status messaging.
  - Wire submission to `PUT /api/member/password`.
- Admin users management:
  - Add reset-password controls per user row (or selected user form).
  - Wire submission to `PUT /api/admin/users/:userId/password`.
- Remove all OTP-related client state and handlers (`currentOtpChallengeId`, `handleOtpRequest`, `handleOtpVerify`, OTP event listeners).

6. Remove OTP provider module usage and retire OTP-specific tests.
- Remove runtime reliance on `src/auth/otp-provider.js`.
- Delete or repurpose `tests/otp-provider.test.js` to password-auth tests (preferred: replace with `tests/password-auth.test.js`).
- Update Phase 12 tests in `tests/api.test.js` from OTP behavior to password lifecycle behavior.

7. Database migration and cleanup strategy (`db.js`).
- Stop writing OTP flags/fields in registration and auth flows.
- Remove creation of OTP-specific tables from bootstrap:
  - `otp_challenges`
  - `auth_rate_limits`
  - `auth_events`
- For existing DB files, add idempotent cleanup migration:
  - `DROP TABLE IF EXISTS otp_challenges`
  - `DROP TABLE IF EXISTS auth_rate_limits`
  - `DROP TABLE IF EXISTS auth_events`
- Keep existing user columns for compatibility unless a table-rebuild migration is explicitly required; no runtime logic should depend on OTP columns after this phase.

8. Update test suite for password-only auth.
- API tests:
  - registration succeeds with `password` + `confirmPassword`
  - registration fails when passwords mismatch
  - login works with username/password for new users and existing users
  - member password change fails on wrong current password
  - member password change fails on confirm mismatch
  - member password change fails when new password equals current password
  - member password change succeeds and old password no longer logs in
  - admin password reset succeeds for member and target can log in with new password
  - admin password reset returns `404` for unknown target user id
  - non-admin cannot call admin reset endpoint (`403`)
  - removed OTP endpoints return not-found semantics (`404` or configured deprecation code) for:
    - `POST /api/auth/otp/request`
    - `POST /api/auth/otp/verify`
    - `GET /api/member/auth-methods`
- UI tests:
  - OTP form hooks are absent
  - signup/login forms contain password confirmation hooks
  - member/admin password management hooks are present
- Regression tests:
  - league, predictions, scoring, and admin delete operations remain green.

9. Verification run.
- Run focused auth tests first, then full suite:
  - `node --test tests/api.test.js`
  - `npm test`
- Manual smoke checks:
  - create new member with password + confirm password
  - login with password immediately (no OTP)
  - change password from member dashboard and verify re-login
  - reset member password from admin dashboard and verify member login with reset value

## Phase 18 Verification Checklist
- No OTP routes remain active (`/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/member/auth-methods` removed).
- Regression assertion: calls to removed OTP routes return not-found semantics (`404` or configured deprecation code) and are no longer used by the frontend.
- Login is password-only for both admin and member roles.
- New user registration requires password confirmation and no OTP enrollment step.
- Existing users can change password only by providing correct current password and matching new password confirmation.
- Existing users cannot reuse the current password as the new password.
- Admin can reset any user's password via admin-only endpoint.
- After admin reset, old password is rejected and reset password is accepted.
- OTP provider module is no longer part of runtime auth flow.
- OTP-specific UI forms and handlers are removed from login/signup flows.
- OTP-specific tests are replaced with password lifecycle tests.
- All auth, regression, and full test suites pass.

## Phase 18 Risks and Mitigations
- Risk: Removing OTP routes breaks older frontend assumptions.
  - Mitigation: update `index.html` + `app.js` in same phase so no client calls removed endpoints.

- Risk: Existing tests fail broadly due to OTP-phase assertions.
  - Mitigation: replace OTP assertions with password lifecycle assertions while preserving unrelated API coverage.

- Risk: Existing DBs retain OTP artifacts and cause drift/confusion.
  - Mitigation: add idempotent table cleanup migration and remove all OTP runtime reads/writes.

- Risk: Password change/reset flows accidentally bypass authorization.
  - Mitigation: require `requireAuth + requireMember` for self-service, `requireAuth + requireAdmin` for resets, and add negative tests for role abuse.

- Risk: Plaintext password handling remains weak security posture.
  - Mitigation: keep Phase 18 scope focused on OTP removal; capture bcrypt hashing as next hardening phase immediately after this migration.

## Phase 18 Decisions
1. Password-only auth replaces OTP fully in runtime behavior.
2. Registration keeps one-step account creation with required password confirmation.
3. Member self-service password change requires current password verification and double-entry of new password.
4. Admin reset is explicit, role-guarded, and does not require the old password.
5. OTP DB tables are dropped for cleanup; OTP user columns may remain temporarily for migration simplicity.
6. This phase does not change league/prediction/scoring business logic.

## PLANNING COMPLETE

## Phase 19 Goal (Stack Admin League and User Management Cards Full Width)
In the admin page, stack the Leagues Management and Users Management cards vertically and let each card use the full available admin content container width at every viewport size.

## Phase 19 Research Summary
- The admin leagues/users screen already renders both management cards in `index.html` inside `.admin-league-panel`, with Leagues Management before Users Management.
- The desktop side-by-side layout is controlled by `styles.css` through `.admin-league-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }`.
- The `@media (max-width: 1100px)` grouped rule also includes `.admin-league-panel` and can reintroduce a two-column layout at tablet widths.
- The `@media (max-width: 780px)` rule already collapses `.admin-league-panel` to one column on small screens.
- No backend, API, auth, database, `app.js`, or DOM-ID changes are expected. Existing card order, forms, tables, and horizontal table scrolling should be preserved.

## Phase 19 Execution Plan
1. Update the admin league panel layout in `styles.css`.
- Change `.admin-league-panel` so it always uses a single full-width column:
  ```css
  .admin-league-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  ```
- Keep existing padding, border, and gap behavior unless visual verification shows spacing needs a small adjustment.
- Preserve `.admin-league-card` styling so each card naturally spans the one-column grid.

2. Prevent responsive overrides from restoring the side-by-side layout.
- Remove `.admin-league-panel` from the `@media (max-width: 1100px)` grouped selector that sets `grid-template-columns: repeat(2, minmax(0, 1fr));`.
- Leave `.member-league-panel`, `.host-city-grid`, `.kpi-row`, and `.match-detail-panel` responsive behavior unchanged.
- It is acceptable to leave `.admin-league-panel` in the `@media (max-width: 780px)` one-column rule, but it should no longer be necessary for correctness.

3. Preserve existing admin page structure and behavior.
- Do not change `index.html` unless CSS-only implementation proves impossible.
- Preserve these hooks and IDs:
  - `admin-league-create-form`
  - `admin-leagues-body`
  - `admin-member-assign-form`
  - `admin-member-select`
  - `admin-league-select`
  - `admin-users-body`
- Keep Leagues Management above Users Management.
- Keep `.admin-mini-table-wrap` horizontal overflow behavior so the full-width user table remains usable on narrow screens.
- Do not modify backend routes, database schema, auth, league assignment, password reset, or admin delete behavior.

4. Add UI regression coverage in `tests/phase9-ui.test.js`.
- Add a Phase 19 static UI contract test that verifies `.admin-league-panel` uses a one-column/full-width layout.
- Add an assertion that the `@media (max-width: 1100px)` block does not include `.admin-league-panel` in the two-column grouped selector.
- Keep assertions resilient to whitespace/formatting changes.

5. Verify locally.
- Run:
  ```powershell
  node --check app.js; npm test
  ```
- Optional browser smoke check:
  1. Start the app with `npm start`.
  2. Log in as `admin / password`.
  3. Open `#/admin/dashboard` and click `Manage Leagues and Users`.
  4. Confirm Leagues Management appears above Users Management.
  5. Confirm both cards span the admin content width at desktop, tablet, and mobile widths.

## Phase 19 Verification Checklist
- `node --check app.js` passes.
- `npm test` passes.
- `tests/phase9-ui.test.js` includes Phase 19 coverage for one-column admin league/user layout.
- `.admin-league-panel` no longer uses `repeat(2, minmax(0, 1fr))` in its base rule.
- The `max-width: 1100px` media rule does not reintroduce `.admin-league-panel` as a two-column grid.
- Admin Leagues Management and Users Management cards render one below the other.
- Both cards use the full available admin content width.
- Existing admin Manage Matches, league create/delete, member assignment, user delete, and password reset behavior remains unchanged.

## Phase 19 Risks and Mitigations
- Risk: A media query overrides the base one-column layout.
  - Mitigation: remove `.admin-league-panel` from the `max-width: 1100px` two-column group and add regression coverage for that specific condition.

- Risk: The full-width Users Management table becomes visually wide.
  - Mitigation: preserve existing `.admin-mini-table-wrap { overflow-x: auto; }` and `admin-users-table` minimum width behavior.

- Risk: A CSS test becomes brittle because of exact formatting assumptions.
  - Mitigation: use regex or helper parsing that tolerates whitespace while still verifying the one-column rule and absence of the media-query override.

- Risk: A simple layout request accidentally changes admin behavior.
  - Mitigation: keep the phase CSS-only except for test updates and run the full suite.

## Phase 19 Decisions
1. Implement as a CSS-only layout change plus test coverage.
2. Keep existing `index.html` card order and DOM IDs.
3. Keep Leagues Management first and Users Management second.
4. Keep table overflow handling unchanged.
5. Do not change backend, database, auth, or admin data-rendering logic in this phase.

## Phase 19 Execution Status
- Status: Completed
- Completed on: 2026-06-09
- Delivered files:
  - `styles.css`: changed `.admin-league-panel` to a one-column grid so Leagues Management and Users Management stack vertically and span the admin content width; removed `.admin-league-panel` from the `max-width: 1100px` two-column override.
  - `tests/phase9-ui.test.js`: added Phase 19 regression coverage for the one-column admin league/user layout and for preventing the tablet media query from reintroducing the old two-column layout.
- Verification evidence:
  - `node --check app.js; npm test` passed with 62 tests and 0 failures.
  - Browser smoke check as admin confirmed `Manage Leagues and Users` renders Leagues Management above Users Management, `gridTemplateColumns` resolves to a single column, and both cards use full available panel width.
- Scope preserved:
  - No `index.html`, `app.js`, backend, database, auth, league assignment, delete, password reset, or admin data-rendering changes were required.

## PLANNING COMPLETE

## Phase 20 Goal (Knockout Predictions, Penalty Winners, Golden Boot Boosts, and Official Cached Scoring)
Extend predictions, admin results, scoring, member views, admin views, leaderboard, and peer reads from Group Stage-only scorelines to full tournament knockout support, including side-based penalty winners, knockout-only Golden Boot boosts, underdog bonuses, official cached totals, and complete read-path compatibility.

## Phase 20 Research Summary
- Current match filtering and validation in [server.js](server.js) is Group Stage-focused through `groupStageMatches`, `validMatchNumbers`, and `groupStageMatchMap`.
- Current prediction/result schema in [db.js](db.js) stores only `team_a_score` and `team_b_score`; knockout scoring needs side-based modifier fields while preserving old DB compatibility.
- Current scoring in [scoring.js](scoring.js) returns only `{ points, reason }`; Phase 20 needs richer score breakdowns for APIs, cached scores, leaderboard tie data, member UI, and peer prediction display.
- Current live member scores are returned by `GET /api/member/scores`; cached official scores are returned by `GET /api/member/scores/cached` after `POST /api/admin/calculate-scores`.
- Current leaderboard in [server.js](server.js) computes live totals from predictions/results. Phase 20 must make cached scores the official leaderboard source after admin calculation.
- Current UI in [app.js](app.js), [index.html](index.html), and [styles.css](styles.css) already has member prediction tables, member league/leaderboard panels, peer prediction panels, and admin result entry panels that can be extended without changing the app shell.

## Phase 20 Decisions
1. Store penalty winner values by fixture side only: `A`, `B`, or `NULL`. Do not store team names as penalty winner values.
2. Knockout correct winner means correct advancer, not merely scoreline winner.
3. A predicted knockout draw requires `penaltyWinnerSide`.
4. An actual tied knockout result requires `penaltyWinnerSide`.
5. A non-draw knockout prediction can receive correct-advancer credit when the actual knockout score is tied and the same side advances on penalties.
6. Golden Boot boost is knockout-only, with a maximum of 5 boosted knockout predictions per user across the tournament and a maximum of 1 boost per match.
7. Golden Boot remaining count is derived from the server, never trusted from client state.
8. Underdog bonus is `+2` only when the admin flagged side advances and the member predicted that same side to advance.
9. Perfect knockout case is `+9`: correct advancer `+2`, exact scoreline bonus `+2`, Golden Boot boost `+3`, and underdog bonus `+2`.
10. Keep `GET /api/member/scores` as live preview scoring and `GET /api/member/scores/cached` as official post-calculation scoring.
11. Leaderboard uses cached official totals after admin calculation; before calculation it returns an explicit pending/not-calculated status instead of silently presenting live preview as official.
12. Member UI may display live preview from `/api/member/scores`, but it must clearly label it as pending official admin calculation until cached scores exist.

## Phase 20 Planned Deliverables
- [x] Schema migration in [db.js](db.js) for knockout modifiers and score breakdown cache fields.
- [x] Prediction write/read API updates in [server.js](server.js).
- [x] Admin result write/read API updates in [server.js](server.js).
- [x] Knockout-aware scoring engine updates in [scoring.js](scoring.js).
- [x] Official cached scoring and leaderboard updates in [server.js](server.js).
- [x] Member prediction/scoring UI updates in [index.html](index.html), [app.js](app.js), and [styles.css](styles.css).
- [x] Admin result modifier UI updates in [index.html](index.html), [app.js](app.js), and [styles.css](styles.css).
- [ ] API, scoring, migration, UI, and regression tests in [tests/api.test.js](tests/api.test.js), [tests/scoring.test.js](tests/scoring.test.js), and [tests/phase9-ui.test.js](tests/phase9-ui.test.js).

## Phase 20 Execution Plan

### Wave 1: Schema and API Contracts

1. Add idempotent schema migration in [db.js](db.js).
- Extend `predictions` with:
  - `penalty_winner_side TEXT DEFAULT NULL`
  - `golden_boot_boost INTEGER NOT NULL DEFAULT 0`
- Extend `actual_results` with:
  - `penalty_winner_side TEXT DEFAULT NULL`
  - `underdog_winner_side TEXT DEFAULT NULL`
- Extend `member_scores` with score breakdown cache fields:
  - `base_points INTEGER NOT NULL DEFAULT 0`
  - `advancer_points INTEGER NOT NULL DEFAULT 0`
  - `underdog_bonus_points INTEGER NOT NULL DEFAULT 0`
  - `golden_boot_bonus_points INTEGER NOT NULL DEFAULT 0`
  - `breakdown_json TEXT`
- Add or preserve indexes needed for boost enforcement:
  - `idx_predictions_user_match`
  - `idx_predictions_user_boost`
- Preserve startup compatibility with DB files that only have the Phase 19 schema.

2. Expand match helpers in [server.js](server.js).
- Replace Group Stage-only validation for prediction/result APIs with all scheduled matches from [world-cup-2026-schedule.json](world-cup-2026-schedule.json).
- Keep Group Stage endpoints if existing UI still uses them, but add all-match lookup helpers:
  - `allMatches`
  - `validMatchNumbers`
  - `matchMap`
  - `isKnockoutMatch(match)`
- Define knockout as every non-Group Stage match.

3. Update prediction read/write API contract in [server.js](server.js).
- `POST /api/predictions` and `PUT /api/predictions/:matchNumber` accept:
  - `teamAScore`
  - `teamBScore`
  - `penaltyWinnerSide`
  - `goldenBootBoost`
- Enforce:
  - `penaltyWinnerSide` must be `A`, `B`, or `null`.
  - Group Stage predictions must not require or store `penaltyWinnerSide`.
  - Knockout predicted draw requires `penaltyWinnerSide`.
  - `goldenBootBoost` may be true only for knockout matches.
  - A user may have at most 5 boosted knockout predictions total.
  - A user may have at most 1 boost per match because predictions are unique per user/match.
  - Create and update both enforce the same max-5 rule, accounting for the existing row on update.
  - `matchNumber`
  - `teamAScore`
  - `teamBScore`
  - `penaltyWinnerSide`
  - `goldenBootBoost`
  - `goldenBootBoostsUsed`
  - `goldenBootBoostsRemaining`
  - `updatedAt`

4. Update admin result read/write API contract in [server.js](server.js).
- `POST /api/admin/results` and `PUT /api/admin/results/:matchNumber` accept:
  - `teamAScore`
  - `teamBScore`
  - `penaltyWinnerSide`
  - `underdogWinnerSide`
- Enforce:
  - `penaltyWinnerSide` must be `A`, `B`, or `null`.
  - `underdogWinnerSide` must be `A`, `B`, or `null`.
  - Group Stage actual results must not require `penaltyWinnerSide`.
  - Knockout tied actual results require `penaltyWinnerSide`.
  - Non-tied knockout actual results may leave `penaltyWinnerSide` null.
  - `matchNumber`
  - `teamAScore`
  - `teamBScore`
  - `penaltyWinnerSide`
  - `underdogWinnerSide`
  - `updatedAt`

5. Verification gate after Wave 1.
- Add focused API/migration tests in [tests/api.test.js](tests/api.test.js):
  - duplicate `buildApp({ dbFile })` startup succeeds after Phase 20 columns/tables already exist
  - old DB compatibility succeeds when the DB has only pre-Phase 20 tables/columns
  - migration columns exist for `predictions`, `actual_results`, and `member_scores`
  - admin modifier persistence survives create, update, read, app restart, and read again
- Run:
  ```powershell
  node --test tests/api.test.js
  ```

### Wave 2: Scoring Engine and Cached Official Source of Truth

1. Upgrade [scoring.js](scoring.js) to score knockout predictions with breakdowns.
- Keep existing Group Stage behavior compatible except for the required exact-scoreline change from the legacy value to `+4` total base points.
- Add side/advancer helpers:
  - predicted advancer for non-draw prediction is the side with higher predicted score
  - predicted advancer for draw prediction is `prediction.penaltyWinnerSide`
  - actual advancer for non-draw actual result is the side with higher actual score
  - actual advancer for tied knockout result is `actualResult.penaltyWinnerSide`
- Enforce score-calculation validation:
  - Golden Boot boost on Group Stage prediction is ignored as invalid and must not score as a boost
  - Golden Boot max-5 is primarily save-time enforcement, but calculation also validates and flags impossible over-limit data if found in old/manual DB rows
  - `points`
  - `reason`
  - `breakdown`
  - `validation`
- `breakdown` includes:
  - `exactScorePoints`
  - `advancerPoints`
  - `underdogBonusPoints`
  - `goldenBootBonusPoints`
  - `predictedAdvancerSide`
  - `actualAdvancerSide`
  - `penaltyWinnerSide`
  - `goldenBootBoost`
  - `underdogWinnerSide`
  - `isKnockout`
- Implement the locked scoring outcomes:
  - exact Group Stage scoreline totals `+4`: `+2` correct winner plus `+2` exact scoreline bonus
  - Group Stage winner-only remains `+2`
  - knockout exact scoreline totals `+4`: `+2` correct advancer plus `+2` exact scoreline bonus
  - knockout correct advancer contributes `+2`
  - wrong winner or wrong knockout advancer returns `-1`
  - no prediction returns `-2` when an actual result exists
  - underdog bonus contributes `+2` only if the admin flagged side advances and the member predicted that side to advance
  - Golden Boot boost awards `+3` only when the boost is valid and the predicted winner/advancer is correct; otherwise it awards `0`
  - perfect knockout case totals `+9` from correct advancer `+2`, exact scoreline bonus `+2`, Golden Boot boost `+3`, and underdog bonus `+2`
  - non-draw knockout prediction can be correct advancer if actual is tied and the same side advances on penalties

2. Update live scoring API in [server.js](server.js).
- `GET /api/member/scores` remains live preview.
  - `prediction.penaltyWinnerSide`
  - `prediction.goldenBootBoost`
  - `actual.penaltyWinnerSide`
  - `actual.underdogWinnerSide`
  - `points`
  - `reason`
  - `breakdown`
  - `officialStatus: "preview"`
  - `goldenBootBoostsUsed`
  - `goldenBootBoostsRemaining`
- It must not be used for official leaderboard ranking after cached calculation exists.

3. Update cached scoring in [server.js](server.js).
- `POST /api/admin/calculate-scores` writes official `member_scores` rows with:
  - total `points`
  - `reason`
  - breakdown columns
  - `breakdown_json`
  - cached official items when available
  - `points: null`, `reason: "not_calculated"`, `officialStatus: "not_calculated"` when absent
  - `breakdown` for cached rows
  - `summary`
  - `calculatedAt`
- Cached rows are the source of truth for official totals after calculation.

4. Update leaderboard and peer read APIs in [server.js](server.js).
- `GET /api/member/leaderboard` uses cached `member_scores` official totals after any calculation state exists.
  - same league/member shape
  - empty or zeroed leaderboard entries
  - `officialStatus: "not_calculated"`
  - a clear `message` or status field that rankings are pending admin calculation
- Leaderboard entries include official cached breakdown totals:
  - `totalPoints`
  - `exactCorrect`
  - `resultsCorrect`
  - `underdogBonuses`
  - `goldenBootBonuses`
  - `officialStatus`
  - `calculatedAt`
  - `penaltyWinnerSide`
  - `goldenBootBoost`
  - `breakdown` where official cached score data exists
  - `officialStatus`
- Continue strict same-league isolation.

5. Verification gate after Wave 2.
- Add scoring unit tests in [tests/scoring.test.js](tests/scoring.test.js):
  - predicted knockout draw without penalty winner is invalid
  - tied knockout actual without penalty winner is invalid
  - side A/B penalty winner decides actual advancer
  - non-draw prediction gets correct advancer when actual tied and same side wins penalties
  - wrong Group Stage winner returns `-1`
  - wrong knockout advancer returns `-1` including penalty-decided actual results
  - no prediction returns `-2` for any scored match with an actual result
  - underdog bonus applies only when flagged side advances and member predicted it
  - underdog bonus does not apply when flagged side advances but member predicted the other side
  - knockout exact scoreline totals `4`, never the legacy exact-score value
  - Golden Boot adds `+3` only when valid and correct
  - Golden Boot adds `0` when the boosted prediction has the wrong winner/advancer
  - underdog adds `+2` only when flagged side advances and member predicted it
  - no scoring path awards the legacy exact-score value for an exact scoreline
- Add API tests in [tests/api.test.js](tests/api.test.js):
  - Golden Boot boost rejected on Group Stage
  - sixth knockout Golden Boot boost rejected on create
  - sixth knockout Golden Boot boost rejected on update
  - update from boosted to unboosted frees one remaining boost
  - score calculation stores breakdown fields
  - leaderboard uses cached official totals after calculation
  - peer predictions include `penaltyWinnerSide`, `goldenBootBoost`, and cached breakdown when available
- Run:
  ```powershell
  node --test tests/scoring.test.js
  node --test tests/api.test.js
  ```

### Wave 3: Member UI

1. Extend member prediction UI in [index.html](index.html).
- Add knockout-only controls in the member predictions table or row detail:
  - penalty winner side selector with `A`/`B`
  - Golden Boot boost toggle
  - server-derived remaining boost count display
- Do not display penalty/boost controls as active Group Stage controls.
- Preserve existing member tab structure from Phase 17.

2. Wire member prediction behavior in [app.js](app.js).
- Load new fields from `GET /api/predictions` and `GET /api/predictions/:matchNumber`.
- Send `penaltyWinnerSide` and `goldenBootBoost` on create/update.
- Show server-derived `goldenBootBoostsRemaining`.
- When a knockout prediction score is tied, require a penalty winner before submit.
- Surface API errors for boost limit and invalid penalty winner.
- Render live preview score breakdowns from `GET /api/member/scores`.
- Render cached official score breakdowns from `GET /api/member/scores/cached` when available.
- Show a clear pending-calculation status when live preview exists but official cached scores do not.

3. Update member styling in [styles.css](styles.css).
- Add compact controls for side selector, boost toggle, remaining count, breakdown text, and pending/official status.
- Keep current dashboard density and avoid layout shifts in the prediction table.

4. Verification gate after Wave 3.
- Add static UI tests in [tests/phase9-ui.test.js](tests/phase9-ui.test.js):
  - member prediction UI contains penalty winner control hooks
  - member prediction UI contains Golden Boot boost control hooks
  - member UI contains remaining boost count hook
  - member UI contains pending official calculation status hook
  - app code calls both `/api/member/scores` and `/api/member/scores/cached`
  - app code renders `breakdown`, `penaltyWinnerSide`, and `goldenBootBoost`
- Run:
  ```powershell
  node --check app.js
  node --test tests/phase9-ui.test.js
  ```

### Wave 4: Admin UI

1. Extend admin result UI in [index.html](index.html).
- Add knockout-only admin controls:
  - penalty winner side selector for tied knockout actual results
  - underdog winner side selector/flag
- Preserve existing admin matches screen and result entry structure.

2. Wire admin modifier persistence in [app.js](app.js).
- Load `penaltyWinnerSide` and `underdogWinnerSide` from `GET /api/admin/results`.
- Send `penaltyWinnerSide` and `underdogWinnerSide` on result create/update.
- Require penalty winner when admin enters a tied knockout actual result.
- Show clear row-level status when a modifier saves.
- Keep score calculation trigger behavior and refresh official cached statuses after calculation.

3. Update admin styling in [styles.css](styles.css).
- Add compact modifier controls that align with existing admin result rows.
- Keep full-width admin card layout from Phase 19 unchanged.

4. Verification gate after Wave 4.
- Add API/UI tests:
  - [tests/api.test.js](tests/api.test.js): admin result `penaltyWinnerSide` and `underdogWinnerSide` persist across create/update/read
  - [tests/phase9-ui.test.js](tests/phase9-ui.test.js): admin UI contains penalty winner and underdog modifier hooks
  - [tests/phase9-ui.test.js](tests/phase9-ui.test.js): app code sends/receives admin modifier fields
- Run:
  ```powershell
  node --check app.js
  node --test tests/api.test.js
  node --test tests/phase9-ui.test.js
  ```

### Wave 5: Regression, Full Suite, and Browser Smoke

1. Add final regression coverage.
- Ensure [tests/api.test.js](tests/api.test.js) covers:
  - duplicate startup with Phase 20 schema
  - old DB compatibility
  - admin modifier persistence
  - Golden Boot max-5 enforcement on create/update/calculation
  - cached official totals drive leaderboard after calculation
- Ensure [tests/scoring.test.js](tests/scoring.test.js) covers all locked scoring decisions.
- Ensure [tests/phase9-ui.test.js](tests/phase9-ui.test.js) covers member/admin UI hooks without brittle visual assumptions.

2. Run final verification.
```powershell
node --check server.js
node --check app.js
npm test
```

3. Browser smoke check.
- Start with `npm start`.
- Member path:
  1. Log in as `member1 / password`.
  2. Open `My Predictions`.
  3. Confirm knockout rows expose penalty winner and Golden Boot controls.
  4. Confirm Group Stage rows do not allow Golden Boot boost.
  5. Save knockout predictions until remaining boost count changes from the server.
  6. Confirm live preview score status is labeled pending official calculation before admin calculation.
- Admin path:
  1. Log in as `admin / password`.
  2. Open Manage Matches.
  3. Enter a tied knockout actual score and choose penalty winner side.
  4. Set underdog winner side where applicable.
  5. Run Calculate Scores.
- Member official path:
  2. Confirm cached official scores display after calculation.
  3. Confirm leaderboard uses official cached totals.
  4. Confirm peer predictions show penalty winner, Golden Boot boost, and official breakdown where available.

## Phase 20 Read-Path API Requirements
- `GET /api/predictions`
- `GET /api/predictions/:matchNumber`
- `GET /api/admin/results`
- `GET /api/admin/results/:matchNumber`
- `GET /api/member/scores`
- `GET /api/member/scores/cached`
- `GET /api/member/leaderboard`
  - Uses cached official `member_scores` after admin calculation and includes breakdown-derived totals/status.
- `GET /api/member/peers/:userId/predictions`
- All read endpoints keep existing auth and league isolation behavior.

## Phase 20 Verification Checklist
- `node --check server.js` passes.
- `node --check app.js` passes.
- `npm test` passes.
- Phase 20 migration is idempotent across duplicate startup.
- Phase 20 migration works against an old DB created before Phase 20 columns existed.
- Prediction create/update enforces knockout penalty winner requirements.
- Prediction create/update enforces Golden Boot knockout-only max 5 per user and max 1 per match.
- Score calculation validates impossible Golden Boot over-limit legacy data.
- Admin result create/update enforces tied knockout penalty winner requirements.
- Leaderboard uses cached official totals after admin calculation.
- Peer prediction reads include penalty winner, Golden Boot boost, and cached breakdown where available.
- Member UI derives remaining Golden Boot count from server responses.
- Member UI clearly distinguishes live preview from official cached scoring.
- Admin UI can save penalty winner and underdog modifier fields.
- Existing auth, league isolation, prediction locks, admin role guards, password flows, and Phase 19 layout remain green.

## Phase 20 Risks and Mitigations
- Risk: Group Stage-only helpers reject knockout match numbers.
  - Mitigation: introduce all-match lookup helpers and preserve Group Stage-specific endpoints only where the existing UI still needs them.

- Risk: Golden Boot count can drift if enforced only in the browser.
  - Mitigation: enforce max 5 and knockout-only rules on both create and update in [server.js](server.js), and derive remaining count from server reads.

- Risk: Live preview and official scoring confuse members.
  - Mitigation: keep `/api/member/scores` as preview, `/api/member/scores/cached` as official, and require UI status labels for pending calculation.

- Risk: Leaderboard rankings change depending on whether cached calculation has run.

- Risk: Old local DB files fail on startup.
  - Mitigation: use idempotent `ALTER TABLE` guards, duplicate startup tests, and old-DB compatibility tests.

- Risk: Penalty winner semantics accidentally store team names.
  - Mitigation: validate and persist only side values `A`, `B`, or `NULL`; add tests that reject any other value.

## Phase 20 Execution Status
- Status: Waves 1-4 completed; Phase 20 remains in progress
- Wave 1 completed on: 2026-06-09
- Wave 1 delivered files:
  - [db.js](db.js): added idempotent Phase 20 columns for prediction penalty winners, Golden Boot boosts, admin result penalty/underdog sides, score breakdown cache fields, and prediction boost indexes.
  - [server.js](server.js): added all-match helpers and `/api/matches`; expanded prediction read/write contracts with `penaltyWinnerSide`, `goldenBootBoost`, and server-derived boost counts; expanded admin result read/write contracts with `penaltyWinnerSide` and `underdogWinnerSide`.
  - [tests/api.test.js](tests/api.test.js): added Wave 1 migration, old-DB compatibility, all-match endpoint, prediction contract, Golden Boot limit, and admin result modifier persistence tests.
- Wave 1 verification evidence:
  - `node --check server.js; node --test tests/api.test.js` passed with 25 tests and 0 failures.
  - `node --check app.js; npm test` ran; backend/API/scoring/schedule tests passed, but the full suite currently has 2 static UI hook failures in [tests/phase9-ui.test.js](tests/phase9-ui.test.js) for member league summary hooks that are absent from the current [index.html](index.html). These failures are outside the Wave 1 backend/API scope and remain to be resolved before Phase 20 completion.
- Wave 2 completed on: 2026-06-09
- Wave 2 delivered files:
  - [scoring.js](scoring.js): replaced the legacy exact-score-only scorer with a structured scorer that supports Group Stage `+4` exact totals, knockout advancer scoring, penalty-winner validation, Golden Boot bonuses, underdog bonuses, wrong-advancer penalties, missing-prediction penalties, and structured breakdown/validation metadata.
  - [server.js](server.js): updated live member scoring preview, official cached score reads, admin score calculation, cached leaderboard totals, and peer prediction reads to use/return Phase 20 breakdown fields and official status metadata.
  - [tests/scoring.test.js](tests/scoring.test.js): added Wave 2 scoring contract coverage for penalty-winner validation, exact-score totals, Golden Boot behavior, underdog behavior, wrong advancers, and the `+9` perfect boosted underdog case.
  - [tests/api.test.js](tests/api.test.js): added Wave 2 API coverage for live preview breakdowns, cached official scores, official leaderboard totals, and peer prediction breakdown fields; updated legacy exact-score expectations from `+5` to `+4`.
- Wave 2 verification evidence:
  - `node --check scoring.js; node --check server.js; node --test tests/scoring.test.js; node --test tests/api.test.js` passed with 17 scoring tests and 26 API tests, 0 failures.
  - `node --check app.js; npm test` ran; Wave 2 scoring/API tests passed inside the full run, and the full suite still has the same 2 static member-league hook failures in [tests/phase9-ui.test.js](tests/phase9-ui.test.js) noted after Wave 1.
- Wave 3 completed on: 2026-06-09
- Wave 3 delivered files:
  - [index.html](index.html): added member Golden Boot remaining and official-score status hooks, restored member league summary hooks, and added knockout-only penalty winner and Golden Boot controls to member prediction rows.
  - [app.js](app.js): switched member prediction rendering to all 104 matches via `/api/matches`, added cached official score reads via `/api/member/scores/cached`, rendered live/official score breakdowns, enforced knockout draw penalty winner selection in the client, sent `penaltyWinnerSide` and `goldenBootBoost`, and displayed server-derived remaining boosts.
  - [styles.css](styles.css): added compact styles for boost count, official status, knockout controls, penalty side selector, and stage dividers.
  - [tests/phase9-ui.test.js](tests/phase9-ui.test.js): added Wave 3 static UI contract coverage for penalty winner hooks, Golden Boot hooks, remaining boost count, official/pending status, cached score API usage, and breakdown rendering.
- Wave 3 verification evidence:
  - `node --check app.js; node --test tests/phase9-ui.test.js` passed with 23 tests and 0 failures.
  - `npm test` passed with 77 tests and 0 failures.
- Wave 4 completed on: 2026-06-09
- Wave 4 delivered files:
  - [index.html](index.html): added admin match-row penalty winner and underdog bonus side selectors for knockout result modifiers.
  - [app.js](app.js): switched admin match rendering to all 104 matches via `/api/matches`, loaded `penaltyWinnerSide` and `underdogWinnerSide` from admin result reads, sent both fields on create/update, required penalty winner for tied knockout actual results, and surfaced row-level modifier status messaging.
  - [styles.css](styles.css): added compact admin result modifier styles aligned with existing admin result rows.
  - [tests/phase9-ui.test.js](tests/phase9-ui.test.js): added Wave 4 static UI contract coverage for admin penalty winner and underdog controls plus app wiring.
- Wave 4 verification evidence:
  - `node --check app.js; node --test tests/api.test.js; node --test tests/phase9-ui.test.js` passed with 26 API tests and 24 UI tests, 0 failures.
  - `npm test` passed with 78 tests and 0 failures.
- Planned verification gates:
  - Wave 1 gate: schema/API migration tests pass. **Completed 2026-06-09.**
  - Wave 2 gate: scoring/cached official tests pass. **Completed 2026-06-09.**
  - Wave 3 gate: member UI contract tests pass. **Completed 2026-06-09.**
  - Wave 4 gate: admin UI and modifier persistence tests pass. **Completed 2026-06-09.**
  - Wave 5 gate: full regression suite and browser smoke checks pass.

## PLANNING COMPLETE
