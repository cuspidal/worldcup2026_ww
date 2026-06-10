const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schedulePath = path.join(__dirname, '..', 'world-cup-2026-schedule.json');

function readSchedule() {
  return JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));
}

test('schedule has expected top-level match count', () => {
  const schedule = readSchedule();
  assert.equal(schedule.match_count, schedule.matches.length);
  assert.equal(schedule.matches.length, 104);
});

test('group stage matches are available and valid', () => {
  const schedule = readSchedule();
  const groupStage = schedule.matches.filter((match) => match.stage === 'Group Stage');

  assert.ok(groupStage.length > 0);
  assert.equal(groupStage.length, 72);

  for (const match of groupStage) {
    assert.match(match.date, /^2026-\d{2}-\d{2}$/);
    assert.ok(match.team_a.length > 0);
    assert.ok(match.team_b.length > 0);
    assert.ok(match.group);
  }
});

test('score input range supports 0 to 50', () => {
  const inRangeScores = [0, 1, 25, 50];
  const outOfRangeScores = [-1, 51, 90];

  for (const score of inRangeScores) {
    assert.ok(Number.isInteger(score) && score >= 0 && score <= 50);
  }

  for (const score of outOfRangeScores) {
    assert.ok(!(Number.isInteger(score) && score >= 0 && score <= 50));
  }
});
