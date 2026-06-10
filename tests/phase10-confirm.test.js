const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('Phase 10 confirm handlers share numeric parser helper', () => {
  assert.match(appJs, /function toIntOrNull\(value\)/);

  const occurrencesA = (appJs.match(/const teamAScore = toIntOrNull\(/g) || []).length;
  const occurrencesB = (appJs.match(/const teamBScore = toIntOrNull\(/g) || []).length;

  assert.equal(occurrencesA >= 2, true);
  assert.equal(occurrencesB >= 2, true);
});

test('Phase 10 team labels use flag-format helper', () => {
  assert.match(appJs, /function formatTeamsWithFlags\(teamA, teamB\)/);
  assert.match(appJs, /return `\$\{flagA\} \$\{teamA\} vs \$\{teamB\} \$\{flagB\}`;/);
});
