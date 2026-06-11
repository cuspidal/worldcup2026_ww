const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('member expand panel uses compact stacked team form UI', () => {
  assert.match(appJs, /compact-form-stack/);
  assert.match(appJs, /compact-form-line/);
  assert.match(appJs, /compact-form-team">\$\{flagImg\(teamA\)\} \$\{teamA\}/);
  assert.match(appJs, /compact-form-team">\$\{flagImg\(teamB\)\} \$\{teamB\}/);
  assert.match(appJs, /<h4>Last 3 Results<\/h4>/);
});

test('member expand panel includes league predictions preview and view-more hooks', () => {
  assert.match(appJs, /data-match-peer-preview/);
  assert.match(appJs, /data-match-peer-list/);
  assert.match(appJs, /data-match-peer-more/);
  assert.match(appJs, /predictions\.slice\(0, 4\)/);
  assert.match(appJs, /openMatchPeersModal\(match, predictions\)/);
});

test('match-level member peers API and modal markup are wired', () => {
  assert.match(serverJs, /\/api\/member\/matches\/:matchNumber\/peer-predictions/);
  assert.match(html, /id="match-peers-modal"/);
  assert.match(html, /id="match-peers-modal-body"/);
  assert.match(html, /id="match-peers-modal-close"/);
});

test('match-level peer preview call is wired in app', () => {
  assert.match(appJs, /\/api\/member\/matches\/\$\{match\.match_number\}\/peer-predictions/);
});
