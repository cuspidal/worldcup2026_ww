function getOutcome(scoreA, scoreB) {
  if (scoreA > scoreB) {
    return 'A';
  }
  if (scoreB > scoreA) {
    return 'B';
  }
  return 'D';
}

function isKnockoutMatch(match) {
  return Boolean(match && match.stage !== 'Group Stage');
}

function normalizeSide(value) {
  if (value === 'A' || value === 'B') return value;
  return null;
}

function buildResult({
  points,
  reason,
  exactScorePoints = 0,
  advancerPoints = 0,
  underdogBonusPoints = 0,
  goldenBootBonusPoints = 0,
  predictedAdvancerSide = null,
  actualAdvancerSide = null,
  penaltyWinnerSide = null,
  goldenBootBoost = false,
  underdogWinnerSide = null,
  isKnockout = false,
  validation = { valid: true, errors: [] }
}) {
  return {
    points,
    reason,
    breakdown: {
      exactScorePoints,
      advancerPoints,
      underdogBonusPoints,
      goldenBootBonusPoints,
      predictedAdvancerSide,
      actualAdvancerSide,
      penaltyWinnerSide,
      goldenBootBoost,
      underdogWinnerSide,
      isKnockout
    },
    validation
  };
}

function getAdvancerSide(scoreA, scoreB, penaltyWinnerSide, knockout) {
  const outcome = getOutcome(scoreA, scoreB);
  if (outcome !== 'D') return outcome;
  if (!knockout) return 'D';
  return normalizeSide(penaltyWinnerSide);
}

function getPredictedAdvancerSide(prediction, match) {
  if (!prediction) return null;
  return getAdvancerSide(
    prediction.teamAScore,
    prediction.teamBScore,
    prediction.penaltyWinnerSide,
    isKnockoutMatch(match)
  );
}

function getActualAdvancerSide(actualResult, match) {
  if (!actualResult) return null;
  return getAdvancerSide(
    actualResult.teamAScore,
    actualResult.teamBScore,
    actualResult.penaltyWinnerSide,
    isKnockoutMatch(match)
  );
}

function scorePrediction(prediction, actualResult, options = {}) {
  const match = options.match || { stage: 'Group Stage' };
  const knockout = isKnockoutMatch(match);

  if (!actualResult) {
    return buildResult({ points: 0, reason: 'pending', isKnockout: knockout });
  }

  const actualAdvancerSide = getActualAdvancerSide(actualResult, match);
  const actualDraw = getOutcome(actualResult.teamAScore, actualResult.teamBScore) === 'D';
  if (knockout && actualDraw && !actualAdvancerSide) {
    return buildResult({
      points: 0,
      reason: 'invalid_actual_result',
      actualAdvancerSide,
      penaltyWinnerSide: actualResult.penaltyWinnerSide || null,
      underdogWinnerSide: actualResult.underdogWinnerSide || options.underdogWinnerSide || null,
      isKnockout: knockout,
      validation: { valid: false, errors: ['actual_penalty_winner_required'] }
    });
  }

  if (!prediction) {
    return buildResult({
      points: -2,
      reason: 'missing_prediction',
      actualAdvancerSide,
      penaltyWinnerSide: actualResult.penaltyWinnerSide || null,
      underdogWinnerSide: actualResult.underdogWinnerSide || options.underdogWinnerSide || null,
      isKnockout: knockout
    });
  }

  const predictedAdvancerSide = getPredictedAdvancerSide(prediction, match);
  const predictedDraw = getOutcome(prediction.teamAScore, prediction.teamBScore) === 'D';
  const goldenBootBoost = knockout && Boolean(prediction.goldenBootBoost) && options.goldenBootBoostAllowed !== false;
  const underdogWinnerSide = normalizeSide(actualResult.underdogWinnerSide || options.underdogWinnerSide);

  if (knockout && predictedDraw && !predictedAdvancerSide) {
    return buildResult({
      points: -1,
      reason: 'invalid_prediction',
      predictedAdvancerSide,
      actualAdvancerSide,
      penaltyWinnerSide: prediction.penaltyWinnerSide || null,
      goldenBootBoost,
      underdogWinnerSide,
      isKnockout: knockout,
      validation: { valid: false, errors: ['prediction_penalty_winner_required'] }
    });
  }

  const exactScoreline = prediction.teamAScore === actualResult.teamAScore
    && prediction.teamBScore === actualResult.teamBScore;
  const correctWinner = predictedAdvancerSide === actualAdvancerSide;
  const exactScorePoints = exactScoreline ? 3 : 0;
  const advancerPoints = correctWinner ? 2 : -1;
  const goldenBootBonusPoints = goldenBootBoost && correctWinner ? 3 : 0;
  const underdogBonusPoints = underdogWinnerSide
    && underdogWinnerSide === actualAdvancerSide
    && underdogWinnerSide === predictedAdvancerSide
    ? 2
    : 0;

  if (!correctWinner) {
    return buildResult({
      points: advancerPoints + exactScorePoints,
      reason: knockout ? 'wrong_advancer' : 'wrong_winner',
      exactScorePoints,
      advancerPoints,
      predictedAdvancerSide,
      actualAdvancerSide,
      penaltyWinnerSide: prediction.penaltyWinnerSide || actualResult.penaltyWinnerSide || null,
      goldenBootBoost,
      underdogWinnerSide,
      isKnockout: knockout
    });
  }

  const points = advancerPoints + exactScorePoints + goldenBootBonusPoints + underdogBonusPoints;
  const reason = exactScoreline
    ? (knockout ? 'exact_knockout' : 'exact')
    : (knockout ? 'correct_advancer' : 'winner_only');

  return buildResult({
    points,
    reason,
    exactScorePoints,
    advancerPoints,
    underdogBonusPoints,
    goldenBootBonusPoints,
    predictedAdvancerSide,
    actualAdvancerSide,
    penaltyWinnerSide: prediction.penaltyWinnerSide || actualResult.penaltyWinnerSide || null,
    goldenBootBoost,
    underdogWinnerSide,
    isKnockout: knockout
  });
}

module.exports = {
  scorePrediction,
  getOutcome,
  isKnockoutMatch,
  getAdvancerSide,
  getPredictedAdvancerSide,
  getActualAdvancerSide
};
