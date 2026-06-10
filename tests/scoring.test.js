const test = require('node:test');
const assert = require('node:assert/strict');
const { scorePrediction } = require('../scoring');

const groupMatch = { match_number: 1, stage: 'Group Stage' };
const knockoutMatch = { match_number: 73, stage: 'Round of 32' };

function pick(result) {
  return {
    points: result.points,
    reason: result.reason,
    breakdown: result.breakdown,
    validation: result.validation
  };
}

test('returns pending with zero points when actual score missing', () => {
  const result = scorePrediction({ teamAScore: 2, teamBScore: 1 }, null, { match: groupMatch });
  assert.equal(result.points, 0);
  assert.equal(result.reason, 'pending');
});

test('returns missing_prediction penalty when actual exists but prediction missing', () => {
  const result = scorePrediction(null, { teamAScore: 1, teamBScore: 0 }, { match: groupMatch });
  assert.equal(result.points, -2);
  assert.equal(result.reason, 'missing_prediction');
});

test('returns five points for exact group-stage scoreline', () => {
  const result = scorePrediction(
    { teamAScore: 3, teamBScore: 2 },
    { teamAScore: 3, teamBScore: 2 },
    { match: groupMatch }
  );
  assert.equal(result.points, 5);
  assert.equal(result.reason, 'exact');
  assert.equal(result.breakdown.advancerPoints, 2);
  assert.equal(result.breakdown.exactScorePoints, 3);
});

test('returns winner_only points when winner prediction is correct but scoreline differs', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 0 },
    { teamAScore: 1, teamBScore: 0 },
    { match: groupMatch }
  );
  assert.equal(result.points, 2);
  assert.equal(result.reason, 'winner_only');
});

test('returns winner_only points for draw outcome with non-exact draw scoreline', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 2 },
    { teamAScore: 1, teamBScore: 1 },
    { match: groupMatch }
  );
  assert.equal(result.points, 2);
  assert.equal(result.reason, 'winner_only');
});

test('returns wrong_winner penalty when winner prediction is incorrect', () => {
  const result = scorePrediction(
    { teamAScore: 0, teamBScore: 1 },
    { teamAScore: 2, teamBScore: 0 },
    { match: groupMatch }
  );
  assert.equal(result.points, -1);
  assert.equal(result.reason, 'wrong_winner');
  assert.equal(result.breakdown.advancerPoints, -1);
});

test('knockout draw prediction without penalty winner is invalid', () => {
  const result = scorePrediction(
    { teamAScore: 1, teamBScore: 1 },
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.validation.valid, false);
  assert.deepEqual(result.validation.errors, ['prediction_penalty_winner_required']);
});

test('tied knockout actual without penalty winner is invalid', () => {
  const result = scorePrediction(
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'A' },
    { teamAScore: 1, teamBScore: 1 },
    { match: knockoutMatch }
  );
  assert.equal(result.validation.valid, false);
  assert.deepEqual(result.validation.errors, ['actual_penalty_winner_required']);
});

test('side penalty winner decides knockout actual advancer', () => {
  const result = scorePrediction(
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'B' },
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'B' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 5);
  assert.equal(result.reason, 'exact_knockout');
  assert.equal(result.breakdown.predictedAdvancerSide, 'B');
  assert.equal(result.breakdown.actualAdvancerSide, 'B');
});

test('exact tied knockout scoreline still earns exact points when penalty winner is wrong', () => {
  const result = scorePrediction(
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'B' },
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 2);
  assert.equal(result.reason, 'wrong_advancer');
  assert.equal(result.breakdown.advancerPoints, -1);
  assert.equal(result.breakdown.exactScorePoints, 3);
});

test('non-draw knockout prediction can be correct when actual is tied and same side advances', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1 },
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 2);
  assert.equal(result.reason, 'correct_advancer');
});

test('wrong knockout advancer returns minus one including penalty-decided actual', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1 },
    { teamAScore: 1, teamBScore: 1, penaltyWinnerSide: 'B' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, -1);
  assert.equal(result.reason, 'wrong_advancer');
  assert.equal(result.breakdown.advancerPoints, -1);
});

test('Golden Boot adds three only when valid and correct', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1, goldenBootBoost: true },
    { teamAScore: 3, teamBScore: 1 },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 5);
  assert.equal(result.breakdown.goldenBootBonusPoints, 3);
});

test('Golden Boot adds zero when boosted prediction has wrong advancer', () => {
  const result = scorePrediction(
    { teamAScore: 0, teamBScore: 1, goldenBootBoost: true },
    { teamAScore: 2, teamBScore: 0 },
    { match: knockoutMatch }
  );
  assert.equal(result.points, -1);
  assert.equal(result.breakdown.goldenBootBonusPoints, 0);
});

test('Golden Boot on group-stage prediction is ignored', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1, goldenBootBoost: true },
    { teamAScore: 2, teamBScore: 1 },
    { match: groupMatch }
  );
  assert.equal(result.points, 5);
  assert.equal(result.breakdown.goldenBootBonusPoints, 0);
});

test('underdog bonus applies only when flagged side advances and member predicted it', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1 },
    { teamAScore: 3, teamBScore: 2, underdogWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 4);
  assert.equal(result.breakdown.underdogBonusPoints, 2);
});

test('underdog bonus does not apply when member predicted other side', () => {
  const result = scorePrediction(
    { teamAScore: 0, teamBScore: 1 },
    { teamAScore: 3, teamBScore: 2, underdogWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, -1);
  assert.equal(result.breakdown.underdogBonusPoints, 0);
});

test('perfect knockout underdog with Golden Boot returns ten', () => {
  const result = scorePrediction(
    { teamAScore: 2, teamBScore: 1, goldenBootBoost: true },
    { teamAScore: 2, teamBScore: 1, underdogWinnerSide: 'A' },
    { match: knockoutMatch }
  );
  assert.equal(result.points, 10);
  assert.equal(result.breakdown.advancerPoints, 2);
  assert.equal(result.breakdown.exactScorePoints, 3);
  assert.equal(result.breakdown.goldenBootBonusPoints, 3);
  assert.equal(result.breakdown.underdogBonusPoints, 2);
});
