const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { buildApp } = require('../server');

test('Phase 6: prediction submission restrictions by match time and score lock', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc26-'));
  const dbFile = path.join(tmpDir, 'predictions.db');

  const { app, db } = await buildApp({ dbFile });
  const memberAgent = request.agent(app);
  const adminAgent = request.agent(app);

  // Login
  await memberAgent.post('/api/login').send({ username: 'member1', password: 'password' });
  await adminAgent.post('/api/login').send({ username: 'admin', password: 'password' });

  await t.test('member can submit prediction for future match with no actual score', async () => {
    // Match 1 is in the future (2026-06-11 at 15:00 ET) and no actual score exists
    const response = await memberAgent.post('/api/predictions').send({
      matchNumber: 1,
      teamAScore: 2,
      teamBScore: 1
    });
    assert.equal(response.status, 201);
  });

  await t.test('member cannot submit prediction when actual score is locked', async () => {
    // Admin enters actual score for match 2
    await adminAgent.post('/api/admin/results').send({
      matchNumber: 2,
      teamAScore: 1,
      teamBScore: 0
    });

    // Member tries to submit prediction for locked match
    const response = await memberAgent.post('/api/predictions').send({
      matchNumber: 2,
      teamAScore: 1,
      teamBScore: 1
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.reason, 'score_locked');
  });

  await t.test('member cannot update prediction when actual score is locked', async () => {
    // Create a prediction first
    await memberAgent.post('/api/predictions').send({
      matchNumber: 3,
      teamAScore: 0,
      teamBScore: 0
    });

    // Admin enters actual score for match 3
    await adminAgent.post('/api/admin/results').send({
      matchNumber: 3,
      teamAScore: 2,
      teamBScore: 1
    });

    // Member tries to update prediction
    const response = await memberAgent.put('/api/predictions/3').send({
      teamAScore: 1,
      teamBScore: 1
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.reason, 'score_locked');
  });

  await t.test('match status endpoint reports lock and start status correctly', async () => {
    const statusResponse = await memberAgent.get('/api/matches/group-stage/status');
    assert.equal(statusResponse.status, 200);

    const statusMap = new Map(
      statusResponse.body.status.map((item) => [item.matchNumber, item])
    );

    // Match 1: no lock, in future
    const match1Status = statusMap.get(1);
    assert.equal(match1Status.isLocked, false);
    assert.equal(match1Status.hasStarted, false);

    // Match 2: locked (actual score entered)
    const match2Status = statusMap.get(2);
    assert.equal(match2Status.isLocked, true);

    // Match 3: locked (actual score entered)
    const match3Status = statusMap.get(3);
    assert.equal(match3Status.isLocked, true);
  });

  await t.test('existing prediction remains visible even when match is locked', async () => {
    // Fetch predictions for locked match 1 (still has prediction, and is not locked yet actually)
    // Actually, let's check match 3 which we created a prediction for and then locked
    const response = await memberAgent.get('/api/predictions/3');
    assert.equal(response.status, 200);
    assert.equal(response.body.teamAScore, 0);
    assert.equal(response.body.teamBScore, 0);
  });

  await db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
