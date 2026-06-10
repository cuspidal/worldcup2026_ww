const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const request = require('supertest');
const { buildApp } = require('../server');

function sqliteRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function sqliteClose(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test('login and predictions CRUD works with SQLite', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  await t.test('rejects unauthenticated access', async () => {
    const response = await agent.get('/api/predictions');
    assert.equal(response.status, 401);
  });

  await t.test('logs in with fixed credentials', async () => {
    const bad = await agent.post('/api/login').send({ username: 'admin', password: 'wrong' });
    assert.equal(bad.status, 401);

    const good = await agent.post('/api/login').send({ username: 'admin', password: 'password' });
    assert.equal(good.status, 200);
    assert.equal(good.body.username, 'admin');
    assert.equal(good.body.role, 'admin');
  });

  await t.test('creates, reads, updates, and deletes a prediction', async () => {
    const matches = await agent.get('/api/matches/group-stage');
    assert.equal(matches.status, 200);
    assert.equal(matches.body.matches.length, 72);

    const matchNumber = matches.body.matches[0].match_number;

    const create = await agent.post('/api/predictions').send({
      matchNumber,
      teamAScore: 2,
      teamBScore: 1
    });
    assert.equal(create.status, 201);

    const readSingle = await agent.get(`/api/predictions/${matchNumber}`);
    assert.equal(readSingle.status, 200);
    assert.equal(readSingle.body.teamAScore, 2);
    assert.equal(readSingle.body.teamBScore, 1);

    const update = await agent.put(`/api/predictions/${matchNumber}`).send({
      teamAScore: 3,
      teamBScore: 0
    });
    assert.equal(update.status, 200);

    const list = await agent.get('/api/predictions');
    assert.equal(list.status, 200);
    assert.equal(list.body.predictions.length, 1);
    assert.equal(list.body.predictions[0].teamAScore, 3);
    assert.equal(list.body.predictions[0].teamBScore, 0);

    const remove = await agent.delete(`/api/predictions/${matchNumber}`);
    assert.equal(remove.status, 204);

    const readAfterDelete = await agent.get(`/api/predictions/${matchNumber}`);
    assert.equal(readAfterDelete.status, 404);
  });

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('cloud readiness endpoints and static allowlist work', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  const health = await agent.get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);

  const appJs = await agent.get('/app.js');
  assert.equal(appJs.status, 200);
  assert.match(appJs.text, /const landingView/);

  const serverJs = await agent.get('/server.js');
  assert.equal(serverJs.status, 404);

  const dbSource = await agent.get('/db.js');
  assert.equal(dbSource.status, 404);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('member role is seeded and blocked from admin result routes', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  const login = await agent.post('/api/login').send({ username: 'member1', password: 'password' });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, 'member');

  const deniedList = await agent.get('/api/admin/results');
  assert.equal(deniedList.status, 403);

  const deniedCreate = await agent.post('/api/admin/results').send({
    matchNumber: 1,
    teamAScore: 2,
    teamBScore: 0
  });
  assert.equal(deniedCreate.status, 403);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('seeded static credentials are restored on existing database', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const initial = await buildApp({ dbFile });
  await initial.db.run('UPDATE users SET password = ? WHERE username = ?', ['wrong-admin', 'admin']);
  await initial.db.run('UPDATE users SET password = ? WHERE username = ?', ['wrong-member', 'member1']);
  await initial.db.close();

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  const adminLogin = await agent.post('/api/login').send({ username: 'admin', password: 'password' });
  assert.equal(adminLogin.status, 200);

  await agent.post('/api/logout').send({});

  const memberLogin = await agent.post('/api/login').send({ username: 'member1', password: 'password' });
  assert.equal(memberLogin.status, 200);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ADMIN_PASSWORD overrides seeded admin password', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');
  const previousAdminPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = 'Kavanaveen';

  try {
    const { app, db } = await buildApp({ dbFile });
    const agent = request.agent(app);

    const oldPassword = await agent.post('/api/login').send({ username: 'admin', password: 'password' });
    assert.equal(oldPassword.status, 401);

    const newPassword = await agent.post('/api/login').send({ username: 'admin', password: 'Kavanaveen' });
    assert.equal(newPassword.status, 200);
    assert.equal(newPassword.body.role, 'admin');

    await db.close();
  } finally {
    if (previousAdminPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = previousAdminPassword;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 20 Wave 1 migrations are idempotent and upgrade old DB files', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const legacy = new sqlite3.Database(dbFile);
  await sqliteRun(legacy, `CREATE TABLE predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team_a_score INTEGER NOT NULL,
    team_b_score INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_number)
  )`);
  await sqliteRun(legacy, `CREATE TABLE actual_results (
    match_number INTEGER PRIMARY KEY,
    team_a_score INTEGER NOT NULL,
    team_b_score INTEGER NOT NULL,
    entered_by_user_id INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await sqliteRun(legacy, `CREATE TABLE member_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_number)
  )`);
  await sqliteClose(legacy);

  const first = await buildApp({ dbFile });
  await first.db.close();
  const second = await buildApp({ dbFile });

  const predictionColumns = await second.db.all('PRAGMA table_info(predictions)');
  const actualColumns = await second.db.all('PRAGMA table_info(actual_results)');
  const scoreColumns = await second.db.all('PRAGMA table_info(member_scores)');
  const predictionColumnNames = new Set(predictionColumns.map((column) => column.name));
  const actualColumnNames = new Set(actualColumns.map((column) => column.name));
  const scoreColumnNames = new Set(scoreColumns.map((column) => column.name));

  assert.equal(predictionColumnNames.has('penalty_winner_side'), true);
  assert.equal(predictionColumnNames.has('golden_boot_boost'), true);
  assert.equal(actualColumnNames.has('penalty_winner_side'), true);
  assert.equal(actualColumnNames.has('underdog_winner_side'), true);
  assert.equal(scoreColumnNames.has('base_points'), true);
  assert.equal(scoreColumnNames.has('advancer_points'), true);
  assert.equal(scoreColumnNames.has('underdog_bonus_points'), true);
  assert.equal(scoreColumnNames.has('golden_boot_bonus_points'), true);
  assert.equal(scoreColumnNames.has('breakdown_json'), true);

  await second.db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Phase 20 Wave 1 prediction and admin result contracts support knockout fields', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const memberAgent = request.agent(app);
  const adminAgent = request.agent(app);

  const memberLogin = await memberAgent.post('/api/login').send({ username: 'member1', password: 'password' });
  assert.equal(memberLogin.status, 200);
  const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
  assert.equal(adminLogin.status, 200);

  const allMatches = await memberAgent.get('/api/matches');
  assert.equal(allMatches.status, 200);
  assert.equal(allMatches.body.matches.length, 104);
  const groupMatches = await memberAgent.get('/api/matches/group-stage');
  assert.equal(groupMatches.status, 200);
  assert.equal(groupMatches.body.matches.length, 72);

  const knockoutMatches = allMatches.body.matches.filter((match) => match.stage !== 'Group Stage');
  assert.equal(knockoutMatches.length, 32);
  const firstKnockout = knockoutMatches[0].match_number;

  const missingPenalty = await memberAgent.post('/api/predictions').send({
    matchNumber: firstKnockout,
    teamAScore: 1,
    teamBScore: 1
  });
  assert.equal(missingPenalty.status, 400);
  assert.equal(missingPenalty.body.reason, 'penalty_winner_required');

  const groupBoost = await memberAgent.post('/api/predictions').send({
    matchNumber: 1,
    teamAScore: 2,
    teamBScore: 0,
    goldenBootBoost: true
  });
  assert.equal(groupBoost.status, 400);
  assert.equal(groupBoost.body.reason, 'golden_boot_group_stage_not_allowed');

  const boostedMatches = knockoutMatches.slice(0, 5).map((match) => match.match_number);
  for (const matchNumber of boostedMatches) {
    const create = await memberAgent.post('/api/predictions').send({
      matchNumber,
      teamAScore: 1,
      teamBScore: 1,
      penaltyWinnerSide: 'A',
      goldenBootBoost: true
    });
    assert.equal(create.status, 201);
    assert.equal(create.body.goldenBootBoost, true);
  }

  const sixthBoost = await memberAgent.post('/api/predictions').send({
    matchNumber: knockoutMatches[5].match_number,
    teamAScore: 2,
    teamBScore: 1,
    goldenBootBoost: true
  });
  assert.equal(sixthBoost.status, 400);
  assert.equal(sixthBoost.body.reason, 'golden_boot_limit_exceeded');

  const singlePrediction = await memberAgent.get(`/api/predictions/${firstKnockout}`);
  assert.equal(singlePrediction.status, 200);
  assert.equal(singlePrediction.body.penaltyWinnerSide, 'A');
  assert.equal(singlePrediction.body.goldenBootBoost, true);
  assert.equal(singlePrediction.body.goldenBootBoostsUsed, 5);
  assert.equal(singlePrediction.body.goldenBootBoostsRemaining, 0);

  const listPredictions = await memberAgent.get('/api/predictions');
  assert.equal(listPredictions.status, 200);
  assert.equal(listPredictions.body.goldenBootBoostsUsed, 5);
  assert.equal(listPredictions.body.goldenBootBoostsRemaining, 0);
  assert.equal(listPredictions.body.predictions[0].goldenBootBoostsUsed, 5);

  const freeBoost = await memberAgent.put(`/api/predictions/${firstKnockout}`).send({
    teamAScore: 2,
    teamBScore: 1,
    goldenBootBoost: false
  });
  assert.equal(freeBoost.status, 200);
  assert.equal(freeBoost.body.goldenBootBoost, false);
  assert.equal(freeBoost.body.goldenBootBoostsUsed, 4);
  assert.equal(freeBoost.body.goldenBootBoostsRemaining, 1);

  const tiedResultMissingPenalty = await adminAgent.post('/api/admin/results').send({
    matchNumber: firstKnockout,
    teamAScore: 1,
    teamBScore: 1
  });
  assert.equal(tiedResultMissingPenalty.status, 400);
  assert.equal(tiedResultMissingPenalty.body.reason, 'penalty_winner_required');

  const createResult = await adminAgent.post('/api/admin/results').send({
    matchNumber: firstKnockout,
    teamAScore: 1,
    teamBScore: 1,
    penaltyWinnerSide: 'B',
    underdogWinnerSide: 'B'
  });
  assert.equal(createResult.status, 201);
  assert.equal(createResult.body.penaltyWinnerSide, 'B');
  assert.equal(createResult.body.underdogWinnerSide, 'B');

  const readResult = await adminAgent.get(`/api/admin/results/${firstKnockout}`);
  assert.equal(readResult.status, 200);
  assert.equal(readResult.body.penaltyWinnerSide, 'B');
  assert.equal(readResult.body.underdogWinnerSide, 'B');

  const updateResult = await adminAgent.put(`/api/admin/results/${firstKnockout}`).send({
    teamAScore: 3,
    teamBScore: 2,
    underdogWinnerSide: 'A'
  });
  assert.equal(updateResult.status, 200);
  assert.equal(updateResult.body.penaltyWinnerSide, null);
  assert.equal(updateResult.body.underdogWinnerSide, 'A');

  await db.close();
  const restarted = await buildApp({ dbFile });
  const restartedAdmin = request.agent(restarted.app);
  await restartedAdmin.post('/api/login').send({ username: 'admin', password: 'password' });
  const persistedResult = await restartedAdmin.get(`/api/admin/results/${firstKnockout}`);
  assert.equal(persistedResult.status, 200);
  assert.equal(persistedResult.body.penaltyWinnerSide, null);
  assert.equal(persistedResult.body.underdogWinnerSide, 'A');

  await restarted.db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Phase 20 Wave 2 live preview, cached official scores, leaderboard, and peer reads use breakdowns', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);
  const peerAgent = request.agent(app);

  const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
  assert.equal(adminLogin.status, 200);
  const memberLogin = await memberAgent.post('/api/login').send({ username: 'member1', password: 'password' });
  assert.equal(memberLogin.status, 200);

  const peerCreate = await adminAgent.post('/api/member/register').send({
    username: 'phase20peer',
    password: 'password2',
    confirmPassword: 'password2'
  });
  assert.equal(peerCreate.status, 201);
  const peerLogin = await peerAgent.post('/api/login').send({ username: 'phase20peer', password: 'password2' });
  assert.equal(peerLogin.status, 200);

  const matches = await memberAgent.get('/api/matches');
  const knockoutMatch = matches.body.matches.find((match) => match.stage !== 'Group Stage').match_number;

  const memberPrediction = await memberAgent.post('/api/predictions').send({
    matchNumber: knockoutMatch,
    teamAScore: 2,
    teamBScore: 1,
    goldenBootBoost: true
  });
  assert.equal(memberPrediction.status, 201);

  const peerPrediction = await peerAgent.post('/api/predictions').send({
    matchNumber: knockoutMatch,
    teamAScore: 0,
    teamBScore: 1
  });
  assert.equal(peerPrediction.status, 201);

  const result = await adminAgent.post('/api/admin/results').send({
    matchNumber: knockoutMatch,
    teamAScore: 2,
    teamBScore: 1,
    underdogWinnerSide: 'A'
  });
  assert.equal(result.status, 201);

  const preview = await memberAgent.get('/api/member/scores');
  assert.equal(preview.status, 200);
  assert.equal(preview.body.officialStatus, 'preview');
  const previewItem = preview.body.items.find((item) => item.matchNumber === knockoutMatch);
  assert.equal(previewItem.points, 10);
  assert.equal(previewItem.breakdown.advancerPoints, 2);
  assert.equal(previewItem.breakdown.exactScorePoints, 3);
  assert.equal(previewItem.breakdown.goldenBootBonusPoints, 3);
  assert.equal(previewItem.breakdown.underdogBonusPoints, 2);
  assert.equal(previewItem.goldenBootBoostsUsed, 1);
  assert.equal(previewItem.goldenBootBoostsRemaining, 4);

  const pendingLeaderboard = await memberAgent.get('/api/member/leaderboard');
  assert.equal(pendingLeaderboard.status, 200);
  assert.equal(pendingLeaderboard.body.officialStatus, 'preview');

  const calculate = await adminAgent.post('/api/admin/calculate-scores').send({});
  assert.equal(calculate.status, 200);
  assert.equal(calculate.body.success, true);

  const cached = await memberAgent.get('/api/member/scores/cached');
  assert.equal(cached.status, 200);
  const cachedItem = cached.body.items.find((item) => item.matchNumber === knockoutMatch);
  assert.equal(cachedItem.points, 10);
  assert.equal(cachedItem.officialStatus, 'official');
  assert.equal(cachedItem.breakdown.goldenBootBonusPoints, 3);

  const leaderboard = await memberAgent.get('/api/member/leaderboard');
  assert.equal(leaderboard.status, 200);
  assert.equal(leaderboard.body.officialStatus, 'official');
  const memberEntry = leaderboard.body.leaderboard.find((entry) => entry.username === 'member1');
  assert.equal(memberEntry.totalPoints, 10);
  assert.equal(memberEntry.goldenBootBonuses, 1);
  assert.equal(memberEntry.underdogBonuses, 1);

  const peer = await memberAgent.get(`/api/member/peers/${peerCreate.body.userId}/predictions?limit=5`);
  assert.equal(peer.status, 200);
  const peerItem = peer.body.predictions.find((item) => item.matchNumber === knockoutMatch);
  assert.equal(peerItem.penaltyWinnerSide, null);
  assert.equal(peerItem.goldenBootBoost, false);
  assert.equal(peerItem.officialStatus, 'official');
  assert.equal(peerItem.breakdown.advancerPoints, -1);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('admin can create, update, read and delete actual results', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  const login = await agent.post('/api/login').send({ username: 'admin', password: 'password' });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, 'admin');

  const matchNumber = 1;

  const create = await agent.post('/api/admin/results').send({
    matchNumber,
    teamAScore: 3,
    teamBScore: 1
  });
  assert.equal(create.status, 201);

  const single = await agent.get(`/api/admin/results/${matchNumber}`);
  assert.equal(single.status, 200);
  assert.equal(single.body.teamAScore, 3);
  assert.equal(single.body.teamBScore, 1);

  const update = await agent.put(`/api/admin/results/${matchNumber}`).send({
    teamAScore: 2,
    teamBScore: 2
  });
  assert.equal(update.status, 200);

  const list = await agent.get('/api/admin/results');
  assert.equal(list.status, 200);
  assert.equal(list.body.results.length, 1);
  assert.equal(list.body.results[0].teamAScore, 2);
  assert.equal(list.body.results[0].teamBScore, 2);

  const remove = await agent.delete(`/api/admin/results/${matchNumber}`);
  assert.equal(remove.status, 204);

  const afterDelete = await agent.get(`/api/admin/results/${matchNumber}`);
  assert.equal(afterDelete.status, 404);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('member scoring API applies mixed scoring rules correctly', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
  assert.equal(adminLogin.status, 200);

  const memberLogin = await memberAgent.post('/api/login').send({ username: 'member1', password: 'password' });
  assert.equal(memberLogin.status, 200);

  await memberAgent.post('/api/predictions').send({ matchNumber: 1, teamAScore: 2, teamBScore: 1 });
  await memberAgent.post('/api/predictions').send({ matchNumber: 2, teamAScore: 1, teamBScore: 0 });
  await memberAgent.post('/api/predictions').send({ matchNumber: 3, teamAScore: 0, teamBScore: 1 });

  await adminAgent.post('/api/admin/results').send({ matchNumber: 1, teamAScore: 2, teamBScore: 1 });
  await adminAgent.post('/api/admin/results').send({ matchNumber: 2, teamAScore: 3, teamBScore: 2 });
  await adminAgent.post('/api/admin/results').send({ matchNumber: 3, teamAScore: 1, teamBScore: 0 });
  await adminAgent.post('/api/admin/results').send({ matchNumber: 4, teamAScore: 1, teamBScore: 1 });

  const scores = await memberAgent.get('/api/member/scores');
  assert.equal(scores.status, 200);

  const itemsByMatch = new Map(scores.body.items.map((item) => [item.matchNumber, item]));

  assert.equal(itemsByMatch.get(1).reason, 'exact');
  assert.equal(itemsByMatch.get(1).points, 5);
  assert.equal(itemsByMatch.get(1).breakdown.exactScorePoints, 3);
  assert.equal(itemsByMatch.get(1).breakdown.advancerPoints, 2);

  assert.equal(itemsByMatch.get(2).reason, 'winner_only');
  assert.equal(itemsByMatch.get(2).points, 2);

  assert.equal(itemsByMatch.get(3).reason, 'wrong_winner');
  assert.equal(itemsByMatch.get(3).points, -1);

  assert.equal(itemsByMatch.get(4).reason, 'missing_prediction');
  assert.equal(itemsByMatch.get(4).points, -2);

  assert.equal(itemsByMatch.get(5).reason, 'pending');
  assert.equal(itemsByMatch.get(5).points, 0);

  assert.equal(scores.body.summary.totalPoints, 4);
  assert.equal(scores.body.summary.scoredMatches, 4);
  assert.equal(scores.body.summary.pendingMatches, 100);

  const adminCannotUseMemberEndpoint = await adminAgent.get('/api/member/scores');
  assert.equal(adminCannotUseMemberEndpoint.status, 403);

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Phase 5: manual score calculation and member score caching works', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  // Admin login
  await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });

  // Member login
  await memberAgent.post('/api/login').send({ username: 'member1', password: 'password' });

  await t.test('member cannot access admin calculate-scores endpoint', async () => {
    const response = await memberAgent.post('/api/admin/calculate-scores').send({});
    assert.equal(response.status, 403);
  });

  await t.test('admin can trigger score calculation', async () => {
    // Set up some actual results first
    const matches = await adminAgent.get('/api/matches/group-stage');
    const match1 = matches.body.matches[0].match_number;
    const match2 = matches.body.matches[1].match_number;

    // Create member predictions BEFORE actual scores so Phase 6 lock doesn't block them
    await memberAgent.post('/api/predictions').send({
      matchNumber: match1,
      teamAScore: 2,
      teamBScore: 1
    });

    await memberAgent.post('/api/predictions').send({
      matchNumber: match2,
      teamAScore: 2,
      teamBScore: 0
    });

    // Now admin enters actual results
    await adminAgent.post('/api/admin/results').send({
      matchNumber: match1,
      teamAScore: 2,
      teamBScore: 1
    });

    await adminAgent.post('/api/admin/results').send({
      matchNumber: match2,
      teamAScore: 1,
      teamBScore: 1
    });

    // Trigger calculation
    const calcResponse = await adminAgent.post('/api/admin/calculate-scores').send({});
    assert.equal(calcResponse.status, 200);
    assert.equal(calcResponse.body.success, true);
    assert.equal(calcResponse.body.totalMembers, 1);
    assert.equal(calcResponse.body.totalMatchesWithScores, 2);
    assert.equal(calcResponse.body.totalScoredEntries, 2);
  });

  await t.test('member fetches cached scores after calculation', async () => {
    const cachedResponse = await memberAgent.get('/api/member/scores/cached');
    assert.equal(cachedResponse.status, 200);

    const itemsByMatch = new Map(
      cachedResponse.body.items.map((item) => [item.matchNumber, item])
    );

    const match1Item = itemsByMatch.get(1);
    assert.equal(match1Item.points, 5);
    assert.equal(match1Item.reason, 'exact');
    assert.equal(match1Item.breakdown.exactScorePoints, 3);

    const match2Item = itemsByMatch.get(2);
    assert.equal(match2Item.points, -1);
    assert.equal(match2Item.reason, 'wrong_winner');

    assert.equal(cachedResponse.body.summary.totalPoints, 4);
    assert.equal(cachedResponse.body.summary.scoredMatches, 2);
  });

  await t.test('cached endpoint shows not_calculated for non-calculated matches', async () => {
    const cachedResponse = await memberAgent.get('/api/member/scores/cached');
    const match3Item = cachedResponse.body.items.find((item) => item.matchNumber === 3);
    assert.equal(match3Item.reason, 'not_calculated');
    assert.equal(match3Item.points, null);
  });

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Phase 18: registration and password lifecycle behavior', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const memberAgent = request.agent(app);
  const adminAgent = request.agent(app);

  try {
    await t.test('member registration requires password confirmation and enforces uniqueness', async () => {
      const create = await memberAgent.post('/api/member/register').send({
        username: 'member2',
        phone: '(555) 123-4567',
        password: 'password2',
        confirmPassword: 'password2'
      });
      assert.equal(create.status, 201);
      assert.equal(create.body.role, 'member');

      const dupUsername = await memberAgent.post('/api/member/register').send({
        username: 'member2',
        phone: '+15551239999',
        password: 'password3',
        confirmPassword: 'password3'
      });
      assert.equal(dupUsername.status, 409);

      const mismatch = await memberAgent.post('/api/member/register').send({
        username: 'member3',
        phone: '+15551230000',
        password: 'password3',
        confirmPassword: 'different'
      });
      assert.equal(mismatch.status, 400);

      const compatRoute = await memberAgent.post('/api/register').send({
        username: 'member4',
        phone: '+15551238888',
        password: 'password4',
        confirmPassword: 'password4'
      });
      assert.equal(compatRoute.status, 201);
    });

    await t.test('member can login and change password using current password', async () => {
      const login = await memberAgent.post('/api/login').send({
        username: 'member2',
        password: 'password2'
      });
      assert.equal(login.status, 200);

      const badCurrent = await memberAgent.put('/api/member/password').send({
        currentPassword: 'wrong-current',
        newPassword: 'new-password2',
        confirmNewPassword: 'new-password2'
      });
      assert.equal(badCurrent.status, 401);

      const changed = await memberAgent.put('/api/member/password').send({
        currentPassword: 'password2',
        newPassword: 'new-password2',
        confirmNewPassword: 'new-password2'
      });
      assert.equal(changed.status, 200);

      await memberAgent.post('/api/logout').send({});
      const oldPasswordDenied = await memberAgent.post('/api/login').send({
        username: 'member2',
        password: 'password2'
      });
      assert.equal(oldPasswordDenied.status, 401);

      const newPasswordWorks = await memberAgent.post('/api/login').send({
        username: 'member2',
        password: 'new-password2'
      });
      assert.equal(newPasswordWorks.status, 200);
    });

    await t.test('admin can reset member password to provided value', async () => {
      const adminLogin = await adminAgent.post('/api/login').send({
        username: 'admin',
        password: 'password'
      });
      assert.equal(adminLogin.status, 200);

      const member = await db.get('SELECT id FROM users WHERE username = ?', ['member2']);
      assert.equal(Boolean(member?.id), true);

      const reset = await adminAgent.put(`/api/admin/users/${member.id}/password`).send({
        newPassword: 'reset-by-admin',
        confirmNewPassword: 'reset-by-admin'
      });
      assert.equal(reset.status, 200);

      await memberAgent.post('/api/logout').send({});
      const resetLogin = await memberAgent.post('/api/login').send({
        username: 'member2',
        password: 'reset-by-admin'
      });
      assert.equal(resetLogin.status, 200);
    });
  } finally {
    await db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('signup route compatibility: direct member signup path and 5-user fallback-password login flow', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const agent = request.agent(app);

  try {
    const signupPage = await agent.get('/member/signup');
    assert.equal(signupPage.status, 200);
    assert.match(signupPage.text, /Create Member Account/);

    for (let i = 1; i <= 5; i += 1) {
      const username = `newmember${i}`;
      const password = `fallback-${i}`;
      const phone = `+1555000000${i}`;

      const create = await agent.post('/member/signup').send({
        username,
        phone,
        password,
        confirmPassword: password
      });
      assert.equal(create.status, 201);
      assert.equal(create.body.username, username);

      const login = await request.agent(app).post('/api/login').send({ username, password });
      assert.equal(login.status, 200);
      assert.equal(login.body.role, 'member');
      assert.equal(login.body.username, username);
    }
  } finally {
    await db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 13: league isolation, assignment, and member session league context', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);
  const member1Agent = request.agent(app);
  const member2Agent = request.agent(app);

  try {
    const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
    assert.equal(adminLogin.status, 200);

    const createA = await adminAgent.post('/api/admin/leagues').send({ name: 'League A' });
    assert.equal(createA.status, 201);
    const createB = await adminAgent.post('/api/admin/leagues').send({ name: 'League B' });
    assert.equal(createB.status, 201);

    const registerMember2 = await adminAgent.post('/api/member/register').send({
      username: 'member2',
      phone: '+15551112222',
      password: 'password2',
      confirmPassword: 'password2'
    });
    assert.equal(registerMember2.status, 201);

    const members = await adminAgent.get('/api/admin/members');
    assert.equal(members.status, 200);
    const member1 = members.body.members.find((m) => m.username === 'member1');
    const member2 = members.body.members.find((m) => m.username === 'member2');
    assert.equal(Boolean(member1), true);
    assert.equal(Boolean(member2), true);

    const assign1 = await adminAgent.put(`/api/admin/members/${member1.id}/league`).send({ leagueId: createA.body.id });
    assert.equal(assign1.status, 200);
    const assign2 = await adminAgent.put(`/api/admin/members/${member2.id}/league`).send({ leagueId: createB.body.id });
    assert.equal(assign2.status, 200);

    const member1Login = await member1Agent.post('/api/login').send({ username: 'member1', password: 'password' });
    assert.equal(member1Login.status, 200);
    assert.equal(member1Login.body.leagueId, createA.body.id);
    assert.equal(member1Login.body.leagueName, 'League A');

    const member2Login = await member2Agent.post('/api/login').send({ username: 'member2', password: 'password2' });
    assert.equal(member2Login.status, 200);
    assert.equal(member2Login.body.leagueId, createB.body.id);

    const member1Session = await member1Agent.get('/api/session');
    assert.equal(member1Session.status, 200);
    assert.equal(member1Session.body.leagueId, createA.body.id);
    assert.equal(member1Session.body.leagueName, 'League A');

    const leagueSummary = await member1Agent.get('/api/member/league-summary');
    assert.equal(leagueSummary.status, 200);
    assert.equal(leagueSummary.body.league.id, createA.body.id);

    const deniedCrossLeague = await member1Agent.get(`/api/member/league-summary?leagueId=${createB.body.id}`);
    assert.equal(deniedCrossLeague.status, 403);
    assert.equal(deniedCrossLeague.body.reason, 'cross_league_forbidden');

    const adminResultCreate = await adminAgent.post('/api/admin/results').send({
      matchNumber: 1,
      teamAScore: 1,
      teamBScore: 0
    });
    assert.equal(adminResultCreate.status, 201);
  } finally {
    await db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 13: legacy admin league aliases create and assign successfully', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);

  try {
    const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
    assert.equal(adminLogin.status, 200);

    const create = await adminAgent.post('/admin/leagues').send({ name: 'Legacy League' });
    assert.equal(create.status, 201);

    const leagues = await adminAgent.get('/admin/leagues');
    assert.equal(leagues.status, 200);
    const createdLeague = leagues.body.leagues.find((league) => league.name === 'Legacy League');
    assert.equal(Boolean(createdLeague), true);

    const members = await adminAgent.get('/admin/members');
    assert.equal(members.status, 200);
    const member1 = members.body.members.find((m) => m.username === 'member1');
    assert.equal(Boolean(member1), true);

    const assign = await adminAgent
      .put(`/admin/members/${member1.id}/league`)
      .send({ leagueId: createdLeague.id });
    assert.equal(assign.status, 200);
    assert.equal(assign.body.leagueName, 'Legacy League');
  } finally {
    await db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Phase 15: league leaderboard and peer read APIs enforce privacy and ordering', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const adminAgent = request.agent(app);
  const member1Agent = request.agent(app);
  const member2Agent = request.agent(app);
  const member3Agent = request.agent(app);

  try {
    const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
    assert.equal(adminLogin.status, 200);

    const leagueA = await adminAgent.post('/api/admin/leagues').send({ name: 'Phase15 League A' });
    const leagueB = await adminAgent.post('/api/admin/leagues').send({ name: 'Phase15 League B' });
    assert.equal(leagueA.status, 201);
    assert.equal(leagueB.status, 201);

    const member2Create = await adminAgent.post('/api/member/register').send({
      username: 'phase15member2',
      phone: '+15551230001',
      password: 'password2',
      confirmPassword: 'password2'
    });
    const member3Create = await adminAgent.post('/api/member/register').send({
      username: 'phase15member3',
      phone: '+15551230002',
      password: 'password3',
      confirmPassword: 'password3'
    });
    assert.equal(member2Create.status, 201);
    assert.equal(member3Create.status, 201);

    const members = await adminAgent.get('/api/admin/members');
    assert.equal(members.status, 200);
    const member1 = members.body.members.find((item) => item.username === 'member1');
    const member2 = members.body.members.find((item) => item.username === 'phase15member2');
    const member3 = members.body.members.find((item) => item.username === 'phase15member3');
    assert.equal(Boolean(member1), true);
    assert.equal(Boolean(member2), true);
    assert.equal(Boolean(member3), true);

    await adminAgent.put(`/api/admin/members/${member1.id}/league`).send({ leagueId: leagueA.body.id });
    await adminAgent.put(`/api/admin/members/${member2.id}/league`).send({ leagueId: leagueA.body.id });
    await adminAgent.put(`/api/admin/members/${member3.id}/league`).send({ leagueId: leagueB.body.id });

    const member1Login = await member1Agent.post('/api/login').send({ username: 'member1', password: 'password' });
    const member2Login = await member2Agent.post('/api/login').send({ username: 'phase15member2', password: 'password2' });
    const member3Login = await member3Agent.post('/api/login').send({ username: 'phase15member3', password: 'password3' });
    assert.equal(member1Login.status, 200);
    assert.equal(member2Login.status, 200);
    assert.equal(member3Login.status, 200);

    for (let matchNumber = 1; matchNumber <= 12; matchNumber += 1) {
      await member2Agent.post('/api/predictions').send({
        matchNumber,
        teamAScore: matchNumber % 3,
        teamBScore: (matchNumber + 1) % 3
      });
    }

    await member1Agent.post('/api/predictions').send({ matchNumber: 1, teamAScore: 1, teamBScore: 0 });
    await member1Agent.post('/api/predictions').send({ matchNumber: 2, teamAScore: 2, teamBScore: 1 });

    await adminAgent.post('/api/admin/results').send({ matchNumber: 1, teamAScore: 1, teamBScore: 0 });
    await adminAgent.post('/api/admin/results').send({ matchNumber: 2, teamAScore: 2, teamBScore: 1 });
    await adminAgent.post('/api/admin/results').send({ matchNumber: 3, teamAScore: 0, teamBScore: 1 });

    const leaderboard = await member1Agent.get('/api/member/leaderboard');
    assert.equal(leaderboard.status, 200);
    assert.equal(leaderboard.body.league.id, leagueA.body.id);
    assert.equal(leaderboard.body.leaderboard.length, 2);
    assert.equal(leaderboard.body.leaderboard.some((item) => item.username === 'phase15member3'), false);
    assert.equal(typeof leaderboard.body.leaderboard[0].rank, 'number');
    assert.equal(typeof leaderboard.body.leaderboard[0].exactCorrect, 'number');
    assert.equal(typeof leaderboard.body.leaderboard[0].resultsCorrect, 'number');
    assert.equal(typeof leaderboard.body.leaderboard[0].missedPredictions, 'number');
    const member1LeaderboardEntry = leaderboard.body.leaderboard.find((item) => item.username === 'member1');
    assert.equal(member1LeaderboardEntry.missedPredictions, 1);
    const member2LeaderboardEntry = leaderboard.body.leaderboard.find((item) => item.username === 'phase15member2');
    assert.equal(member2LeaderboardEntry.missedPredictions, 0);

    const peers = await member1Agent.get('/api/member/peers');
    assert.equal(peers.status, 200);
    assert.equal(peers.body.members.some((item) => item.username === 'member1'), true);
    assert.equal(peers.body.members.some((item) => item.username === 'phase15member2'), true);
    assert.equal(peers.body.members.some((item) => item.username === 'phase15member3'), false);

    const defaultPeerPredictions = await member1Agent.get(`/api/member/peers/${member2.id}/predictions`);
    assert.equal(defaultPeerPredictions.status, 200);
    assert.equal(defaultPeerPredictions.body.predictions.length, 10);
    assert.equal(defaultPeerPredictions.body.totalPredictions, 12);
    assert.equal(defaultPeerPredictions.body.limit, 10);

    const allPeerPredictions = await member1Agent.get(`/api/member/peers/${member2.id}/predictions?limit=all`);
    assert.equal(allPeerPredictions.status, 200);
    assert.equal(allPeerPredictions.body.predictions.length, 12);
    assert.equal(allPeerPredictions.body.totalPredictions, 12);
    assert.equal(allPeerPredictions.body.limit, 'all');

    const insights = await member1Agent.get('/api/member/insights/points-chart');
    assert.equal(insights.status, 200);
    assert.equal(insights.body.league.id, leagueA.body.id);
    assert.equal(insights.body.officialStatus, 'preview');
    assert.equal(insights.body.matches.length, 3);
    assert.equal(insights.body.series.length, 2);
    assert.equal(insights.body.series.some((item) => item.username === 'member1'), true);
    assert.equal(insights.body.series.every((item) => item.points.length === 3), true);

    const peerPredictions = await member1Agent.get(`/api/member/peers/${member2.id}/predictions?limit=5`);
    assert.equal(peerPredictions.status, 200);
    assert.equal(peerPredictions.body.peer.username, 'phase15member2');
    assert.equal(peerPredictions.body.predictions.length, 5);

    for (let i = 1; i < peerPredictions.body.predictions.length; i += 1) {
      const prev = new Date(peerPredictions.body.predictions[i - 1].kickoffAt).getTime();
      const next = new Date(peerPredictions.body.predictions[i].kickoffAt).getTime();
      assert.equal(prev >= next, true);
    }

    const crossLeagueDenied = await member1Agent.get(`/api/member/peers/${member3.id}/predictions?limit=5`);
    assert.equal(crossLeagueDenied.status, 403);
    assert.equal(crossLeagueDenied.body.reason, 'cross_league_forbidden');

    const adminDenied = await adminAgent.get('/api/member/leaderboard');
    assert.equal(adminDenied.status, 403);
  } finally {
    await db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

  test('Phase 16: admin can delete users and leagues with guardrails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
    const dbFile = path.join(tmpDir, 'predictions.db');

    const { app, db } = await buildApp({ dbFile });
    const adminAgent = request.agent(app);
    const memberAgent = request.agent(app);

    try {
      const adminLogin = await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
      assert.equal(adminLogin.status, 200);

      const users = await adminAgent.get('/api/admin/users');
      assert.equal(users.status, 200);
      assert.equal(users.body.users.some((user) => user.username === 'admin' && user.role === 'admin'), true);
      assert.equal(users.body.users.some((user) => user.username === 'member1' && user.role === 'member'), true);

      const selfDelete = await adminAgent.delete(`/api/admin/users/${adminLogin.body.userId}`);
      assert.equal(selfDelete.status, 400);
      assert.equal(selfDelete.body.reason, 'cannot_delete_self');

      const leagueA = await adminAgent.post('/api/admin/leagues').send({ name: 'Phase16 League A' });
      const leagueB = await adminAgent.post('/api/admin/leagues').send({ name: 'Phase16 League B' });
      assert.equal(leagueA.status, 201);
      assert.equal(leagueB.status, 201);

      const member2Create = await adminAgent.post('/api/member/register').send({
        username: 'phase16delete',
        phone: '+15551234001',
        password: 'password2',
        confirmPassword: 'password2'
      });
      assert.equal(member2Create.status, 201);

      const members = await adminAgent.get('/api/admin/members');
      const member1 = members.body.members.find((item) => item.username === 'member1');
      const member2 = members.body.members.find((item) => item.username === 'phase16delete');
      await adminAgent.put(`/api/admin/members/${member1.id}/league`).send({ leagueId: leagueA.body.id });
      await adminAgent.put(`/api/admin/members/${member2.id}/league`).send({ leagueId: leagueA.body.id });

      const deleteWithoutDestination = await adminAgent.delete(`/api/admin/leagues/${leagueA.body.id}`);
      assert.equal(deleteWithoutDestination.status, 400);
      assert.equal(deleteWithoutDestination.body.reason, 'destination_league_required');

      const deleteLeague = await adminAgent.delete(`/api/admin/leagues/${leagueA.body.id}?moveUsersTo=${leagueB.body.id}`);
      assert.equal(deleteLeague.status, 200);
      assert.equal(deleteLeague.body.deleted, true);
      assert.equal(deleteLeague.body.movedMemberCount, 2);

      const movedMembers = await adminAgent.get('/api/admin/members');
      assert.equal(movedMembers.body.members.find((item) => item.id === member1.id).leagueId, leagueB.body.id);
      assert.equal(movedMembers.body.members.find((item) => item.id === member2.id).leagueId, leagueB.body.id);
      assert.equal(movedMembers.body.members.some((item) => item.leagueId === leagueA.body.id), false);

      await memberAgent.post('/api/login').send({ username: 'phase16delete', password: 'password2' });
      await memberAgent.post('/api/predictions').send({ matchNumber: 1, teamAScore: 2, teamBScore: 1 });
      await db.run(
        `INSERT INTO member_scores (user_id, match_number, points, reason)
         VALUES (?, ?, ?, ?)`,
        [member2.id, 1, 5, 'exact']
      );

      const memberDenied = await memberAgent.delete(`/api/admin/users/${member2.id}`);
      assert.equal(memberDenied.status, 403);

      const deleteUser = await adminAgent.delete(`/api/admin/users/${member2.id}`);
      assert.equal(deleteUser.status, 200);
      assert.equal(deleteUser.body.deleted, true);
      assert.equal(deleteUser.body.deletedRecords.predictions, 1);
      assert.equal(deleteUser.body.deletedRecords.memberScores, 1);

      const deletedUser = await db.get('SELECT id FROM users WHERE id = ?', [member2.id]);
      const deletedPrediction = await db.get('SELECT id FROM predictions WHERE user_id = ?', [member2.id]);
      const deletedScore = await db.get('SELECT id FROM member_scores WHERE user_id = ?', [member2.id]);
      const deletedAssignment = await db.get('SELECT user_id FROM member_leagues WHERE user_id = ?', [member2.id]);
      assert.equal(deletedUser, undefined);
      assert.equal(deletedPrediction, undefined);
      assert.equal(deletedScore, undefined);
      assert.equal(deletedAssignment, undefined);
    } finally {
      await db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('Phase 16: admin cannot delete the last league', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
    const dbFile = path.join(tmpDir, 'predictions.db');

    const { app, db } = await buildApp({ dbFile });
    const adminAgent = request.agent(app);

    try {
      await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });
      const leagues = await adminAgent.get('/api/admin/leagues');
      assert.equal(leagues.status, 200);
      assert.equal(leagues.body.leagues.length, 1);

      const lastLeague = await adminAgent.delete(`/api/admin/leagues/${leagues.body.leagues[0].id}`);
      assert.equal(lastLeague.status, 400);
      assert.equal(lastLeague.body.reason, 'cannot_delete_last_league');
    } finally {
      await db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

