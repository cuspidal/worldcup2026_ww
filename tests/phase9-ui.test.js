const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(fileName) {
  return fs.readFileSync(path.join(root, fileName), 'utf8');
}

test('Phase 9 landing contains hero, countdown, host cities, and fixtures hooks', () => {
  const html = read('index.html');
  assert.match(html, /id="landing-hero"/);
  assert.match(html, /id="landing-countdown"/);
  assert.match(html, /id="host-cities-grid"/);
  assert.match(html, /id="public-fixtures-list"/);
  assert.match(html, />Login</);
  assert.match(html, />Register</);
  assert.doesNotMatch(html, /Member Entry/);
  assert.match(html, /id="signup-view"/);
  assert.match(html, /#\/member\/signup/);
  assert.match(html, /FIFA World Cup 2026 logo/);
});

test('Phase 9 login contains floating labels and back link', () => {
  const html = read('index.html');
  assert.match(html, /class="floating-field"/);
  assert.match(html, /for="username"/);
  assert.match(html, /for="password"/);
  assert.match(html, /Back to Tournament Home/);
});

test('Phase 9 admin contains sidebar, KPI cards, and admin datetime', () => {
  const html = read('index.html');
  assert.match(html, /class="admin-sidebar"/);
  assert.match(html, /id="admin-datetime"/);
  assert.match(html, /id="kpi-members"/);
  assert.match(html, /id="kpi-matches"/);
  assert.match(html, /id="kpi-status"/);
});

test('Phase 9 styles contain tokenized palette and constrained radii', () => {
  const css = read('styles.css');
  assert.match(css, /--color-surface-0: #ffffff;/);
  assert.match(css, /--color-surface-1: #f4f4f6;/);
  assert.match(css, /--color-navy: #0f172a;/);
  assert.match(css, /--radius-sm: 4px;/);
  assert.match(css, /--radius-md: 8px;/);
});

test('Phase 9 app routes and landing fixture markers are present', () => {
  const js = read('app.js');
  assert.match(js, /landing: '#\/'/);
  assert.match(js, /login: '#\/member\/login'/);
  assert.match(js, /signup: '#\/member\/signup'/);
  assert.match(js, /admin: '#\/admin\/dashboard'/);
  assert.match(js, /fixture-stage-badge/);
  assert.match(js, /fixture-football-icon/);
  assert.match(js, /function toIntOrNull\(/);
  assert.match(js, /function formatTeamsWithFlags\(/);
  assert.match(js, /formatTeamsWithFlags\(match\.team_a, match\.team_b\)/);
  assert.match(js, /api\('\/api\/member\/leaderboard'\)/);
});

test('Phase 18 signup flow is password-only with confirm password', () => {
  const html = read('index.html');
  const js = read('app.js');

  assert.doesNotMatch(html, /signup-phone/);
  assert.doesNotMatch(html, /Phone Number/);
  assert.match(js, /async function handleSignup\(event\)/);
  assert.match(js, /confirmPassword/);
  assert.match(js, /api\('\/api\/member\/register'/);
  assert.match(js, /navigate\(ROUTES\.login\)/);
  assert.match(js, /Account created\. You can now sign in with your password\./);
  assert.doesNotMatch(js, /signupPhoneInput/);
  assert.doesNotMatch(js, /phone, password, confirmPassword/);
  assert.doesNotMatch(js, /\/api\/auth\/otp\//);
});

test('admin route render unhides the admin dashboard view', () => {
  const js = read('app.js');
  const renderAdminStart = js.indexOf('async function renderAdmin()');
  const renderRouteStart = js.indexOf('async function renderRoute()');
  assert.notEqual(renderAdminStart, -1);
  assert.notEqual(renderRouteStart, -1);

  const renderAdminBody = js.slice(renderAdminStart, renderRouteStart);
  assert.match(renderAdminBody, /hideAllViews\(\)/);
  assert.match(renderAdminBody, /adminView\.classList\.remove\('hidden'\)/);
});

test('Phase 18 member and admin password management hooks are present', () => {
  const html = read('index.html');
  assert.match(html, /id="member-password-form"/);
  assert.match(html, /id="member-current-password"/);
  assert.match(html, /id="member-new-password"/);
  assert.match(html, /id="member-confirm-password"/);
  assert.match(html, /Password Reset/);

  const js = read('app.js');
  assert.match(js, /function handleMemberPasswordUpdate\(/);
  assert.match(js, /api\('\/api\/member\/password'/);
  assert.match(js, /function handleAdminPasswordReset\(/);
  assert.match(js, /\/api\/admin\/users\/\$\{user\.id\}\/password/);
});

test('Phase 9 member dashboard includes league summary hooks', () => {
  const html = read('index.html');
  assert.match(html, /id="member-leaderboard-title"/);
  assert.doesNotMatch(html, /Your League/);
});

test('Phase 15 member dashboard includes leaderboard and peer read APIs hooks', () => {
  const html = read('index.html');
  assert.match(html, /id="member-leaderboard-body"/);
  assert.match(html, /id="member-peer-select"/);
  assert.match(html, /id="member-peer-status"/);
  assert.match(html, /id="member-peer-predictions-body"/);
  assert.match(html, /id="member-peer-toggle"/);
  assert.match(html, /League Leaderboard/);
  assert.match(html, /Missed Predictions/);
  assert.match(html, /View Others' Predictions/);
});

test('Phase 15 app includes leaderboard and peer rendering functions', () => {
  const js = read('app.js');
  assert.match(js, /function renderMemberLeaderboardRows\(/);
  assert.match(js, /function renderPeerPredictionRows\(/);
  assert.match(js, /renderMemberLeaderboardAndPeers/);
  assert.match(js, /renderPeerPredictionsForSelectedMember/);
  assert.match(js, /api\('\/api\/member\/leaderboard'\)/);
  assert.match(js, /api\('\/api\/member\/peers'\)/);
  assert.match(js, /api.*\/api\/member\/peers.*predictions/);
});

test('Phase 15 styles contain mini-table CSS for leaderboard and peer views', () => {
  const css = read('styles.css');
  assert.match(css, /member-mini-table/);
  assert.match(css, /member-peer-card/);
});

test('Phase 15 server exports leaderboard and peer endpoint patterns', () => {
  const server = read('server.js');
  assert.match(server, /app\.get\('\/api\/member\/leaderboard'/);
  assert.match(server, /app\.get\('\/api\/member\/peers'/);
  assert.match(server, /app\.get\('\/api\/member\/peers.*predictions/);
  assert.match(server, /scoreStatsForMember\(/);
  assert.match(server, /getLeagueMembers\(/);
  assert.match(server, /ensureMemberLeagueContext\(/);
});

test('Phase 16 admin navigation has only matches and leagues/users options', () => {
  const html = read('index.html');
  assert.match(html, /id="admin-nav-matches"/);
  assert.match(html, /id="admin-nav-leagues-users"/);
  assert.match(html, />Manage Matches</);
  assert.match(html, />Manage Leagues and Users</);
  assert.doesNotMatch(html, />Dashboard</);
  assert.doesNotMatch(html, />User Directory</);
  assert.doesNotMatch(html, />Settings</);
});

test('Phase 16 admin screens include matches and combined leagues/users hooks', () => {
  const html = read('index.html');
  assert.match(html, /id="admin-matches-screen"/);
  assert.match(html, /id="admin-leagues-users-screen"/);
  assert.match(html, /id="admin-leagues-body"/);
  assert.match(html, /id="admin-users-body"/);
  assert.match(html, /Leagues Management/);
  assert.match(html, /Users Management/);
});

test('Phase 16 app wires admin screens and destructive actions', () => {
  const js = read('app.js');
  assert.match(js, /function setAdminScreen\(/);
  assert.match(js, /function handleAdminLeagueDelete\(/);
  assert.match(js, /function handleAdminUserDelete\(/);
  assert.match(js, /function handleAdminUserReassign\(/);
  assert.match(js, /api\('\/api\/admin\/users'\)/);
  assert.match(js, /api\(`\/api\/admin\/leagues\/\$\{league\.id\}/);
  assert.match(js, /api\(`\/api\/admin\/users\/\$\{user\.id\}/);
});

test('Phase 19 admin league and users management cards stack full width', () => {
  const css = read('styles.css');
  const adminPanelRule = css.match(/\.admin-league-panel\s*\{(?<body>[\s\S]*?)\}/);
  assert.ok(adminPanelRule, 'Expected .admin-league-panel CSS rule to exist');
  assert.match(adminPanelRule.groups.body, /display:\s*grid;/);
  assert.match(adminPanelRule.groups.body, /grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.doesNotMatch(adminPanelRule.groups.body, /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);

  const tabletRule = css.match(/@media\s*\(max-width:\s*1100px\)\s*\{(?<body>[\s\S]*?)@media\s*\(max-width:\s*780px\)/);
  assert.ok(tabletRule, 'Expected max-width: 1100px media block to exist');
  assert.doesNotMatch(tabletRule.groups.body, /\.admin-league-panel/);
});

test('Phase 20 Wave 3 member prediction UI exposes knockout and official scoring hooks', () => {
  const html = read('index.html');
  const js = read('app.js');
  const css = read('styles.css');

  assert.match(html, /id="member-boosts-remaining"/);
  assert.match(html, /id="member-official-status"/);
  assert.match(html, /class="penalty-winner-side"/);
  assert.match(html, /class="golden-boot-boost"/);
  assert.match(html, /data-knockout-controls/);

  assert.match(js, /api\('\/api\/matches'\)/);
  assert.match(js, /api\('\/api\/member\/scores'\)/);
  assert.match(js, /api\('\/api\/member\/scores\/cached'\)/);
  assert.match(js, /api\('\/api\/matches\/status'\)/);
  assert.match(js, /penaltyWinnerSide/);
  assert.match(js, /goldenBootBoost/);
  assert.match(js, /breakdown/);
  assert.match(js, /goldenBootBoostsRemaining/);
  assert.match(js, /select penalty winner/);

  assert.match(css, /knockout-prediction-controls/);
  assert.match(css, /boosts-remaining/);
  assert.match(css, /official-score-status/);
  assert.match(css, /stage-divider-row/);
});

test('Phase 20 Wave 4 admin result UI exposes penalty and underdog modifier hooks', () => {
  const html = read('index.html');
  const js = read('app.js');
  const css = read('styles.css');

  assert.match(html, /data-admin-modifiers/);
  assert.match(html, /class="admin-penalty-winner-side"/);
  assert.match(html, /class="admin-underdog-winner-side"/);
  assert.match(html, /Penalty winner/);
  assert.match(html, /Underdog bonus side/);

  assert.match(js, /api\('\/api\/matches'\)/);
  assert.match(js, /penaltyWinnerSide/);
  assert.match(js, /underdogWinnerSide/);
  assert.match(js, /Penalty winner required for tied knockout result/);
  assert.match(js, /underdog bonus applies only if flagged side advances/);
  assert.match(js, /data-admin-modifiers/);

  assert.match(css, /admin-result-modifiers/);
  assert.match(css, /admin-penalty-winner-side/);
  assert.match(css, /admin-underdog-winner-side/);
});

test('Phase 16 server exports admin delete and user list endpoints', () => {
  const server = read('server.js');
  assert.match(server, /app\.get\('\/api\/admin\/users'/);
  assert.match(server, /app\.delete\('\/api\/admin\/users\/:userId'/);
  assert.match(server, /app\.delete\('\/api\/admin\/leagues\/:leagueId'/);
  assert.match(server, /cannot_delete_self/);
  assert.match(server, /cannot_delete_last_league/);
  assert.match(server, /destination_league_required/);
});

test('Phase 17 member dashboard has My Predictions before My League', () => {
  const html = read('index.html');
  const predictionsIndex = html.indexOf('id="member-tab-predictions"');
  const leagueIndex = html.indexOf('id="member-tab-league"');
  const insightsIndex = html.indexOf('id="member-tab-insights"');
  assert.notEqual(predictionsIndex, -1);
  assert.notEqual(leagueIndex, -1);
  assert.notEqual(insightsIndex, -1);
  assert.equal(predictionsIndex < leagueIndex, true);
  assert.equal(leagueIndex < insightsIndex, true);
  assert.match(html, />My Predictions</);
  assert.match(html, />My League</);
  assert.match(html, />My Insights</);
});

test('Phase 17 member screens contain the expected hooks', () => {
  const html = read('index.html');
  assert.match(html, /id="member-predictions-screen"/);
  assert.match(html, /id="timezone-select"/);
  assert.match(html, /id="matches-body"/);
  assert.match(html, /id="member-league-screen"/);
  assert.match(html, /id="member-insights-screen"/);
  assert.match(html, /id="member-points-chart"/);
  assert.match(html, /Coming Soon/);
  const memberViewStart = html.indexOf('id="predictions-view"');
  const insightsScreenIndex = html.indexOf('id="member-insights-screen"');
  const adminViewStart = html.indexOf('id="admin-view"');
  assert.equal(memberViewStart < insightsScreenIndex, true);
  assert.equal(insightsScreenIndex < adminViewStart, true);
  assert.match(html, /id="member-leaderboard-title"/);
  assert.match(html, /id="member-leaderboard-body"/);
  assert.match(html, /id="member-peer-select"/);
  assert.match(html, /id="member-peer-toggle"/);
  assert.match(html, /id="member-peer-predictions-body"/);
  assert.doesNotMatch(html, /Peer Predictions \(Read-Only\)/);
});

test('Phase 17 app wires member screen switching and preserves render path', () => {
  const js = read('app.js');
  assert.match(js, /const memberTabPredictions = document\.getElementById\('member-tab-predictions'\)/);
  assert.match(js, /const memberTabLeague = document\.getElementById\('member-tab-league'\)/);
  assert.match(js, /const memberTabInsights = document\.getElementById\('member-tab-insights'\)/);
  assert.match(js, /function setMemberScreen\(/);
  assert.match(js, /setMemberScreen\('predictions'\)/);
  assert.match(js, /setMemberScreen\('insights'\)/);
  assert.match(js, /renderPredictionsTable\(\)/);
  assert.match(js, /renderMemberLeaderboardAndPeers\(\)/);
  assert.match(js, /renderMemberInsights\(\)/);
});

test('Phase 17 styles include member tabs and leaderboard polish', () => {
  const css = read('styles.css');
  assert.match(css, /member-screen-nav/);
  assert.match(css, /member-screen-tab/);
  assert.match(css, /member-screen\.hidden/);
  assert.match(css, /member-insights-panel/);
  assert.match(css, /member-points-chart/);
  assert.match(css, /rank-badge/);
  assert.match(css, /leaderboard-rank-1/);
  assert.match(css, /leaderboard-rank-2/);
  assert.match(css, /leaderboard-rank-3/);
  assert.match(css, /leaderboard-current-user/);
});
