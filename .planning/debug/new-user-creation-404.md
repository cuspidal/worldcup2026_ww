---
status: resolved
trigger: "new user creation isnt working even with fallback password.. its still giving a 404"
created: "2026-06-06"
updated: "2026-06-06"
---

## Symptoms
- Expected behavior: Members screen should reflect logged in to corresponding user's account.
- Actual behavior: On `localhost:3000/member/signup`, after entering username, phone number, and password and clicking create account, it returns Error 404.
- Timeline: Never worked.

## Current Focus
- hypothesis: Frontend is calling a signup route that does not exist in the currently running server process or route mismatch between UI and API
- test: Reproduce via API and UI path checks; validate running server routes and fallback route compatibility
- expecting: Identify missing or mismatched route causing 404 and verify multi-user create/login fallback password flow
- next_action: gather initial evidence

## Evidence
- timestamp: 2026-06-06T00:00:00Z
	finding: Frontend submits member creation to /api/member/register, which exists, but direct SPA navigation to /member/signup was not handled server-side.
- timestamp: 2026-06-06T00:00:00Z
	finding: Server lacked non-API compatibility aliases for legacy signup post paths (/member/signup, /member/register).
- timestamp: 2026-06-06T00:00:00Z
	finding: Added regression test proving direct GET /member/signup works and 5 users can be created then logged in with fallback passwords.

## Eliminated
- Database insertion failure as primary cause (registration handler returns 201 in test scenarios).
- Credential rejection as primary cause (newly created users can login via /api/login with fallback password).

## Resolution
- root_cause: Missing server-side SPA route fallback and missing legacy non-API signup aliases caused 404 for member signup flows depending on URL/path variant.
- fix: Added POST aliases at /member/signup and /member/register to the existing registration handler, plus a non-API GET fallback to serve index.html for SPA routes like /member/signup.
- verification: npm test passes (40/40), including new scenario test that creates 5 users via /member/signup and logs in each with fallback password.
- files_changed: server.js, tests/api.test.js
