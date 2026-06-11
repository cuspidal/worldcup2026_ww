const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// ─── CSS: mobile scroll fixes ──────────────────────────────────────────────

test('.page uses overflow:clip so child scroll containers work on iOS', () => {
  // Must NOT use overflow:hidden (which blocks child touch scroll on iOS Safari)
  assert.doesNotMatch(css, /\.page\s*\{[^}]*overflow:\s*hidden/);
  // Must use overflow:clip
  assert.match(css, /\.page\s*\{[^}]*overflow:\s*clip/);
});

test('.member-league-card has min-width:0 to allow grid column shrinking', () => {
  assert.match(css, /\.member-league-card\s*\{[^}]*min-width:\s*0/);
});

test('.admin-main has min-width:0 so the match table can scroll horizontally', () => {
  assert.match(css, /\.admin-main\s*\{[^}]*min-width:\s*0/);
});

test('.kpi-card has min-width:0 to allow grid column shrinking', () => {
  assert.match(css, /\.kpi-card\s*\{[^}]*min-width:\s*0/);
});

test('.admin-league-card has min-width:0 to allow grid column shrinking', () => {
  assert.match(css, /\.admin-league-card\s*\{[^}]*min-width:\s*0/);
});

test('.member-mini-table-wrap has -webkit-overflow-scrolling:touch for iOS momentum scroll', () => {
  assert.match(css, /\.member-mini-table-wrap\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
});

test('.table-wrap has -webkit-overflow-scrolling:touch for iOS momentum scroll', () => {
  assert.match(css, /\.table-wrap\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
});

test('.admin-mini-table-wrap has -webkit-overflow-scrolling:touch for iOS momentum scroll', () => {
  assert.match(css, /\.admin-mini-table-wrap\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
});

test('mobile media query uses minmax(0,1fr) for admin-layout column (not plain 1fr)', () => {
  // Extract the <= 1100px media block
  const mediaBlock = css.match(/@media\s*\(max-width:\s*1100px\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(mediaBlock, /\.admin-layout\s*\{[^}]*minmax\(0[^)]*\)/);
});

test('mobile media query collapses all card grids to single minmax(0,1fr) column', () => {
  // Extract the <= 780px media block
  const mediaBlock = css.match(/@media\s*\(max-width:\s*780px\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(mediaBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test('admin sidebar gets horizontal nav layout on mobile (flex wrap)', () => {
  const mediaBlock = css.match(/@media\s*\(max-width:\s*1100px\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(mediaBlock, /\.admin-sidebar\s+nav\s*\{[^}]*display:\s*flex/);
});

// ─── JS: landing timezone dropdown ────────────────────────────────────────

test('landingTimezoneSelect has a change event listener wired up', () => {
  assert.match(appJs, /landingTimezoneSelect\.addEventListener\(\s*['"]change['"]/);
});

test('landing timezone change listener calls renderPublicFixtures', () => {
  // Find the listener block and confirm renderPublicFixtures is inside it
  const listenerBlock = appJs.match(
    /landingTimezoneSelect\.addEventListener\(\s*['"]change['"][^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
  )?.[1] ?? '';
  assert.match(listenerBlock, /renderPublicFixtures\(\)/);
});

test('landing timezone change listener calls renderHostCities', () => {
  const listenerBlock = appJs.match(
    /landingTimezoneSelect\.addEventListener\(\s*['"]change['"][^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
  )?.[1] ?? '';
  assert.match(listenerBlock, /renderHostCities\(\)/);
});

test('landing timezone change listener saves selection to cookie', () => {
  const listenerBlock = appJs.match(
    /landingTimezoneSelect\.addEventListener\(\s*['"]change['"][^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
  )?.[1] ?? '';
  assert.match(listenerBlock, /savePublicTimezone\(/);
});

test('landing timezone change listener syncs both timezone controls', () => {
  const listenerBlock = appJs.match(
    /landingTimezoneSelect\.addEventListener\(\s*['"]change['"][^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
  )?.[1] ?? '';
  assert.match(listenerBlock, /syncTimezoneControls\(\)/);
});

test('start() restores timezone from cookie via loadPublicTimezone before rendering', () => {
  // loadPublicTimezone() must be called inside the start() function body
  const startFn = appJs.match(/async function start\(\)\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
  assert.match(startFn, /loadPublicTimezone\(\)/);
});

test('start() syncs timezone controls early so landing dropdown shows saved value', () => {
  const startFn = appJs.match(/async function start\(\)\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
  assert.match(startFn, /syncTimezoneControls\(\)/);
});

test('loadPublicTimezone validates against ALLOWED_TIMEZONES allowlist', () => {
  const fnBody = appJs.match(/function loadPublicTimezone\(\)\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(fnBody, /ALLOWED_TIMEZONES\.includes/);
});

test('savePublicTimezone validates against ALLOWED_TIMEZONES allowlist', () => {
  const fnBody = appJs.match(/function savePublicTimezone\([^)]*\)\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(fnBody, /ALLOWED_TIMEZONES\.includes/);
});

test('landing timezone change listener validates timezone against allowlist before applying', () => {
  const listenerBlock = appJs.match(
    /landingTimezoneSelect\.addEventListener\(\s*['"]change['"][^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/
  )?.[1] ?? '';
  assert.match(listenerBlock, /ALLOWED_TIMEZONES\.includes/);
});
