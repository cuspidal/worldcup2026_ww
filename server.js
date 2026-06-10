require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { initDatabase } = require('./db');
const { scorePrediction } = require('./scoring');

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'world-cup-2026-local-secret';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true' || IS_PRODUCTION;
const PUBLIC_FILE_NAMES = new Set([
  'app.js',
  'styles.css',
  'world-cup-2026-schedule.json',
  'colors-fifa-unveils-official-logo-for-2026-world-cup-custom-cities.png'
]);

function normalizePhoneE164(rawPhone) {
  if (typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;

  if (rawPhone.trim().startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

function parseScore(value) {
  if (!Number.isInteger(value) || value < 0 || value > 50) {
    return null;
  }
  return value;
}

function parseMatchStartTime(match) {
  // Parses match.date (YYYY-MM-DD) and match.time_et (HH:MM) into a UTC-convertible Date
  // Assumes time_et is in Eastern Time (ET); for Phase 6 simplicity, treating as if UTC-based
  // In production, use proper timezone library
  if (!match.date || !match.time_et) {
    return null;
  }
  const [year, month, day] = match.date.split('-').map(Number);
  const [hour, minute] = match.time_et.split(':').map(Number);
  // For now, assume ET offset is UTC-4 (EDT) or UTC-5 (EST); we'll use UTC-4 for mid-June
  // Real solution: use a proper timezone library
  const etDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  // Convert from ET to UTC by adding 4 hours (EDT offset)
  const utcDate = new Date(etDate.getTime() + 4 * 60 * 60 * 1000);
  return utcDate;
}

function isMatchStarted(match) {
  const startTime = parseMatchStartTime(match);
  if (!startTime) return false;
  return new Date() > startTime;
}

function filterGroupStageMatches(schedule) {
  return schedule.matches
    .filter((match) => match.stage === 'Group Stage')
    .sort((a, b) => a.match_number - b.match_number);
}

function filterTournamentMatches(schedule) {
  return schedule.matches
    .slice()
    .sort((a, b) => a.match_number - b.match_number);
}

function isKnockoutMatch(match) {
  return Boolean(match && match.stage !== 'Group Stage');
}

function normalizeSide(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value === 'A' || value === 'B') return value;
  return undefined;
}

function parseBooleanFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

function requireMember(req, res, next) {
  if (req.session.role !== 'member') {
    res.status(403).json({ error: 'Member access required' });
    return;
  }
  next();
}

async function buildApp(options = {}) {
  const db = await initDatabase(options.dbFile);
  const app = express();
  app.disable('x-powered-by');
  if (TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  const schedulePath = path.join(__dirname, 'world-cup-2026-schedule.json');
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const allMatches = filterTournamentMatches(schedule);
  const groupStageMatches = filterGroupStageMatches(schedule);
  const validMatchNumbers = new Set(allMatches.map((match) => match.match_number));
  const matchMap = new Map(allMatches.map((match) => [match.match_number, match]));
  const groupStageMatchMap = new Map(groupStageMatches.map((match) => [match.match_number, match]));

  async function goldenBootUsageForUser(userId, excludeMatchNumber = null) {
    const params = [userId];
    let excludeClause = '';
    if (Number.isInteger(excludeMatchNumber)) {
      excludeClause = 'AND match_number != ?';
      params.push(excludeMatchNumber);
    }

    const row = await db.get(
      `SELECT COUNT(*) AS count
       FROM predictions
       WHERE user_id = ? AND golden_boot_boost = 1 ${excludeClause}`,
      params
    );
    return Number(row?.count || 0);
  }

  async function buildGoldenBootContext(userId) {
    const used = await goldenBootUsageForUser(userId);
    return {
      goldenBootBoostsUsed: used,
      goldenBootBoostsRemaining: Math.max(0, 5 - used)
    };
  }

  function predictionFromRow(row) {
    if (!row) return null;
    return {
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      goldenBootBoost: Boolean(row.golden_boot_boost)
    };
  }

  function actualFromRow(row) {
    if (!row) return null;
    return {
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      underdogWinnerSide: row.underdog_winner_side || null
    };
  }

  function parseBreakdownJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async function validatePredictionPayload({ userId, match, teamAScore, teamBScore, penaltyWinnerSide, goldenBootBoost, existingMatchNumber = null }) {
    const parsedA = parseScore(teamAScore);
    const parsedB = parseScore(teamBScore);
    const parsedPenaltyWinnerSide = normalizeSide(penaltyWinnerSide);
    const wantsGoldenBootBoost = parseBooleanFlag(goldenBootBoost);

    if (parsedA === null || parsedB === null || parsedPenaltyWinnerSide === undefined) {
      return { error: 'Invalid prediction payload', status: 400 };
    }

    const knockout = isKnockoutMatch(match);
    if (!knockout && parsedPenaltyWinnerSide !== null) {
      return { error: 'Penalty winner is only available for knockout matches', reason: 'penalty_winner_not_allowed', status: 400 };
    }
    if (!knockout && wantsGoldenBootBoost) {
      return { error: 'Golden Boot Boost is only available for knockout matches', reason: 'golden_boot_group_stage_not_allowed', status: 400 };
    }
    if (knockout && parsedA === parsedB && !parsedPenaltyWinnerSide) {
      return { error: 'Penalty winner required for tied knockout prediction', reason: 'penalty_winner_required', status: 400 };
    }

    const boostCountExcludingCurrent = await goldenBootUsageForUser(userId, existingMatchNumber);
    if (wantsGoldenBootBoost && boostCountExcludingCurrent >= 5) {
      return { error: 'Golden Boot Boost limit exceeded', reason: 'golden_boot_limit_exceeded', status: 400 };
    }

    return {
      teamAScore: parsedA,
      teamBScore: parsedB,
      penaltyWinnerSide: knockout && parsedA === parsedB ? parsedPenaltyWinnerSide : null,
      goldenBootBoost: knockout && wantsGoldenBootBoost ? 1 : 0
    };
  }

  function validateResultPayload({ match, teamAScore, teamBScore, penaltyWinnerSide, underdogWinnerSide }) {
    const parsedA = parseScore(teamAScore);
    const parsedB = parseScore(teamBScore);
    const parsedPenaltyWinnerSide = normalizeSide(penaltyWinnerSide);
    const parsedUnderdogWinnerSide = normalizeSide(underdogWinnerSide);

    if (parsedA === null || parsedB === null || parsedPenaltyWinnerSide === undefined || parsedUnderdogWinnerSide === undefined) {
      return { error: 'Invalid result payload', status: 400 };
    }

    const knockout = isKnockoutMatch(match);
    if (!knockout && parsedPenaltyWinnerSide !== null) {
      return { error: 'Penalty winner is only available for knockout matches', reason: 'penalty_winner_not_allowed', status: 400 };
    }
    if (knockout && parsedA === parsedB && !parsedPenaltyWinnerSide) {
      return { error: 'Penalty winner required for tied knockout result', reason: 'penalty_winner_required', status: 400 };
    }

    return {
      teamAScore: parsedA,
      teamBScore: parsedB,
      penaltyWinnerSide: knockout && parsedA === parsedB ? parsedPenaltyWinnerSide : null,
      underdogWinnerSide: parsedUnderdogWinnerSide
    };
  }

  async function getDefaultLeagueId() {
    const byName = await db.get('SELECT id FROM leagues WHERE name = ?', ['General League']);
    if (byName?.id) return byName.id;

    const firstLeague = await db.get('SELECT id FROM leagues ORDER BY id ASC LIMIT 1');
    if (firstLeague?.id) return firstLeague.id;

    const created = await db.run('INSERT INTO leagues (name) VALUES (?)', ['General League']);
    return created.lastID;
  }

  async function refreshMemberLeagueContext(userId) {
    return db.get(
      `SELECT l.id AS league_id, l.name AS league_name
       FROM member_leagues ml
       JOIN leagues l ON l.id = ml.league_id
       WHERE ml.user_id = ?`,
      [userId]
    );
  }

  async function ensureMemberLeagueContext(userId) {
    const existing = await refreshMemberLeagueContext(userId);
    if (existing) return existing;

    const defaultLeagueId = await getDefaultLeagueId();
    await db.run(
      `INSERT INTO member_leagues (user_id, league_id, assigned_by_user_id)
       VALUES (?, ?, NULL)
       ON CONFLICT(user_id) DO UPDATE SET
         league_id = excluded.league_id,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, defaultLeagueId]
    );

    return refreshMemberLeagueContext(userId);
  }

  async function getLeagueMembers(leagueId) {
    return db.all(
      `SELECT u.id, u.username
       FROM users u
       JOIN member_leagues ml ON ml.user_id = u.id
       WHERE u.role = 'member' AND ml.league_id = ?
       ORDER BY u.username ASC`,
      [leagueId]
    );
  }

  function scoreStatsForMember(predictionRows, actualMap, memberId) {
    const predictionMap = new Map(
      predictionRows
        .filter((row) => row.user_id === memberId)
        .map((row) => [
          row.match_number,
          {
            teamAScore: row.team_a_score,
            teamBScore: row.team_b_score
          }
        ])
    );

    const stats = {
      totalPoints: 0,
      exactCorrect: 0,
      resultsCorrect: 0
    };

    for (const match of groupStageMatches) {
      const prediction = predictionMap.get(match.match_number) || null;
      const actual = actualMap.get(match.match_number) || null;
      const result = scorePrediction(prediction, actual);
      stats.totalPoints += result.points;
      if (result.reason === 'exact') {
        stats.exactCorrect += 1;
        stats.resultsCorrect += 1;
      } else if (result.reason === 'winner_only') {
        stats.resultsCorrect += 1;
      }
    }

    return stats;
  }

  async function requireMemberLeagueContext(req, res, next) {
    if (req.session.role !== 'member') {
      res.status(403).json({ error: 'Member access required' });
      return;
    }

    const league = await ensureMemberLeagueContext(req.session.userId);
    if (!league) {
      res.status(403).json({ error: 'League assignment required', reason: 'league_assignment_required' });
      return;
    }

    req.session.leagueId = league.league_id;
    req.session.leagueName = league.league_name;
    req.memberLeague = {
      leagueId: league.league_id,
      leagueName: league.league_name
    };
    next();
  }

  async function requireLeagueContextIfMember(req, res, next) {
    if (req.session.role !== 'member') {
      next();
      return;
    }
    await requireMemberLeagueContext(req, res, next);
  }

  app.use(express.json());
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'wc26.sid',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: IS_PRODUCTION,
        maxAge: 1000 * 60 * 60 * 24 * 14
      }
    })
  );

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, environment: NODE_ENV });
  });

  app.use(async (req, res, next) => {
    if (!req.session?.userId) {
      next();
      return;
    }

    try {
      const user = await db.get('SELECT id FROM users WHERE id = ?', [req.session.userId]);
      if (user) {
        next();
        return;
      }

      req.session.destroy(() => {
        res.status(401).json({ error: 'Authentication required', reason: 'session_user_deleted' });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Invalid login payload' });
      return;
    }

    const user = await db.get(
      `SELECT u.id, u.username, u.role, u.timezone,
              l.id AS league_id, l.name AS league_name
       FROM users u
       LEFT JOIN member_leagues ml ON ml.user_id = u.id
       LEFT JOIN leagues l ON l.id = ml.league_id
       WHERE u.username = ? AND u.password = ?`,
      [username, password]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    let resolvedLeague = null;
    if (user.role === 'member') {
      resolvedLeague = (Number.isInteger(user.league_id) && user.league_name)
        ? { league_id: user.league_id, league_name: user.league_name }
        : await ensureMemberLeagueContext(user.id);
      if (!resolvedLeague) {
        res.status(403).json({ error: 'League assignment required', reason: 'league_assignment_required' });
        return;
      }
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.timezone = user.timezone || 'America/New_York';
    req.session.leagueId = user.role === 'member' ? resolvedLeague.league_id : null;
    req.session.leagueName = user.role === 'member' ? resolvedLeague.league_name : null;
    res.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      timezone: req.session.timezone,
      leagueId: req.session.leagueId,
      leagueName: req.session.leagueName
    });
  });

  const registerMemberHandler = async (req, res) => {
    const { username, phone, password, confirmPassword } = req.body || {};
    if (
      typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password.trim() ||
      typeof confirmPassword !== 'string' || !confirmPassword.trim()
    ) {
      res.status(400).json({ error: 'Invalid registration payload' });
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    let phoneE164 = null;
    if (typeof phone === 'string' && phone.trim()) {
      phoneE164 = normalizePhoneE164(phone);
    }
    if (typeof phone === 'string' && phone.trim() && !phoneE164) {
      res.status(400).json({ error: 'Phone must be a valid E.164-compatible number' });
      return;
    }

    try {
      const result = await db.run(
        `INSERT INTO users (username, password, role, phone_e164)
         VALUES (?, ?, 'member', ?)`,
        [username.trim(), password.trim(), phoneE164]
      );

      const defaultLeagueId = await getDefaultLeagueId();
      await db.run(
        `INSERT INTO member_leagues (user_id, league_id, assigned_by_user_id)
         VALUES (?, ?, NULL)
         ON CONFLICT(user_id) DO UPDATE SET league_id = excluded.league_id, updated_at = CURRENT_TIMESTAMP`,
        [result.lastID, defaultLeagueId]
      );

      const assignedLeague = await db.get('SELECT name FROM leagues WHERE id = ?', [defaultLeagueId]);

      res.status(201).json({
        userId: result.lastID,
        username: username.trim(),
        role: 'member',
        leagueId: defaultLeagueId,
        leagueName: assignedLeague?.name || null
      });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ error: 'Username or phone already exists' });
        return;
      }
      res.status(500).json({ error: 'Could not register member' });
    }
  };

  app.post('/api/member/register', registerMemberHandler);
  app.post('/api/register', registerMemberHandler);
  // Backward-compatible aliases for older clients that still post outside /api.
  app.post('/member/register', registerMemberHandler);
  app.post('/member/signup', registerMemberHandler);

  app.put('/api/member/password', requireAuth, requireMember, async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    const confirmNewPassword = typeof req.body?.confirmNewPassword === 'string' ? req.body.confirmNewPassword.trim() : '';

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.status(400).json({ error: 'Invalid password update payload' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New password confirmation does not match' });
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({ error: 'New password must differ from current password' });
      return;
    }

    const user = await db.get('SELECT id, password FROM users WHERE id = ?', [req.session.userId]);
    if (!user || user.password !== currentPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    await db.run(
      'UPDATE users SET password = ?, auth_version = auth_version + 1 WHERE id = ?',
      [newPassword, req.session.userId]
    );
    res.json({ updated: true });
  });

  app.put('/api/admin/users/:userId/password', requireAuth, requireAdmin, async (req, res) => {
    const userId = Number(req.params.userId);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    const confirmNewPassword = typeof req.body?.confirmNewPassword === 'string' ? req.body.confirmNewPassword.trim() : '';

    if (!Number.isInteger(userId) || userId <= 0 || !newPassword || !confirmNewPassword) {
      res.status(400).json({ error: 'Invalid password reset payload' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New password confirmation does not match' });
      return;
    }

    const user = await db.get('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found', reason: 'user_not_found' });
      return;
    }

    await db.run(
      'UPDATE users SET password = ?, auth_version = auth_version + 1 WHERE id = ?',
      [newPassword, userId]
    );

    res.json({ userId, username: user.username, passwordReset: true });
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });

  app.get('/api/session', async (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ error: 'No active session' });
      return;
    }

    if (req.session.role === 'member') {
      const league = await ensureMemberLeagueContext(req.session.userId);
      if (!league) {
        res.status(403).json({ error: 'League assignment required', reason: 'league_assignment_required' });
        return;
      }
      req.session.leagueId = league.league_id;
      req.session.leagueName = league.league_name;
    }

    res.json({
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      timezone: req.session.timezone || 'America/New_York',
      leagueId: req.session.leagueId || null,
      leagueName: req.session.leagueName || null
    });
  });

  app.get('/api/matches', requireAuth, (req, res) => {
    res.json({ matches: allMatches });
  });

  app.get('/api/matches/group-stage', requireAuth, (req, res) => {
    res.json({ matches: groupStageMatches });
  });

  app.get('/api/matches/status', requireAuth, async (req, res) => {
    const actualResults = await db.all('SELECT match_number FROM actual_results');
    const actualMap = new Set(actualResults.map((r) => r.match_number));

    const status = allMatches.map((match) => ({
      matchNumber: match.match_number,
      hasStarted: isMatchStarted(match),
      isLocked: actualMap.has(match.match_number),
      startTime: parseMatchStartTime(match),
      stage: match.stage,
      isKnockout: isKnockoutMatch(match)
    }));

    res.json({ status });
  });

  app.get('/api/matches/group-stage/status', requireAuth, async (req, res) => {
    // Returns match status including lock and started info
    const actualResults = await db.all('SELECT match_number FROM actual_results');
    const actualMap = new Set(actualResults.map((r) => r.match_number));

    const status = groupStageMatches.map((match) => ({
      matchNumber: match.match_number,
      hasStarted: isMatchStarted(match),
      isLocked: actualMap.has(match.match_number),
      startTime: parseMatchStartTime(match)
    }));

    res.json({ status });
  });

  app.get('/api/predictions', requireAuth, requireLeagueContextIfMember, async (req, res) => {
    const boostContext = await buildGoldenBootContext(req.session.userId);
    const rows = await db.all(
      `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost, updated_at
       FROM predictions
       WHERE user_id = ?
       ORDER BY match_number ASC`,
      [req.session.userId]
    );

    const predictions = rows.map((row) => ({
      matchNumber: row.match_number,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      goldenBootBoost: Boolean(row.golden_boot_boost),
      goldenBootBoostsUsed: boostContext.goldenBootBoostsUsed,
      goldenBootBoostsRemaining: boostContext.goldenBootBoostsRemaining,
      updatedAt: row.updated_at
    }));

    res.json({ predictions, ...boostContext });
  });

  app.get('/api/predictions/:matchNumber', requireAuth, requireLeagueContextIfMember, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);
    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid match number' });
      return;
    }

    const row = await db.get(
      `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost, updated_at
       FROM predictions
       WHERE user_id = ? AND match_number = ?`,
      [req.session.userId, parsedMatch]
    );

    if (!row) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    const boostContext = await buildGoldenBootContext(req.session.userId);
    res.json({
      matchNumber: row.match_number,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      goldenBootBoost: Boolean(row.golden_boot_boost),
      ...boostContext,
      updatedAt: row.updated_at
    });
  });

  app.post('/api/predictions', requireAuth, requireLeagueContextIfMember, async (req, res) => {
    const { matchNumber, teamAScore, teamBScore, penaltyWinnerSide, goldenBootBoost } = req.body || {};
    const parsedMatch = Number(matchNumber);

    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid prediction payload' });
      return;
    }

    const match = matchMap.get(parsedMatch);
    const parsedPayload = await validatePredictionPayload({
      userId: req.session.userId,
      match,
      teamAScore,
      teamBScore,
      penaltyWinnerSide,
      goldenBootBoost
    });
    if (parsedPayload.error) {
      res.status(parsedPayload.status).json({ error: parsedPayload.error, reason: parsedPayload.reason });
      return;
    }

    // Phase 6: Check if match has started
    if (match && isMatchStarted(match)) {
      res.status(409).json({ error: 'Match has started', reason: 'match_started' });
      return;
    }

    // Phase 6: Check if actual score is locked (admin has entered final score)
    const actualResult = await db.get(
      'SELECT match_number FROM actual_results WHERE match_number = ?',
      [parsedMatch]
    );
    if (actualResult) {
      res.status(409).json({ error: 'Final score already set', reason: 'score_locked' });
      return;
    }

    try {
      await db.run(
        `INSERT INTO predictions (user_id, match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.session.userId, parsedMatch, parsedPayload.teamAScore, parsedPayload.teamBScore, parsedPayload.penaltyWinnerSide, parsedPayload.goldenBootBoost]
      );
      const boostContext = await buildGoldenBootContext(req.session.userId);
      res.status(201).json({
        matchNumber: parsedMatch,
        teamAScore: parsedPayload.teamAScore,
        teamBScore: parsedPayload.teamBScore,
        penaltyWinnerSide: parsedPayload.penaltyWinnerSide,
        goldenBootBoost: Boolean(parsedPayload.goldenBootBoost),
        ...boostContext
      });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ error: 'Prediction already exists. Use update.' });
        return;
      }
      res.status(500).json({ error: 'Could not create prediction' });
    }
  });

  app.put('/api/predictions/:matchNumber', requireAuth, requireLeagueContextIfMember, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);

    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid prediction payload' });
      return;
    }

    const match = matchMap.get(parsedMatch);
    const parsedPayload = await validatePredictionPayload({
      userId: req.session.userId,
      match,
      teamAScore: req.body?.teamAScore,
      teamBScore: req.body?.teamBScore,
      penaltyWinnerSide: req.body?.penaltyWinnerSide,
      goldenBootBoost: req.body?.goldenBootBoost,
      existingMatchNumber: parsedMatch
    });
    if (parsedPayload.error) {
      res.status(parsedPayload.status).json({ error: parsedPayload.error, reason: parsedPayload.reason });
      return;
    }

    // Phase 6: Check if match has started
    if (match && isMatchStarted(match)) {
      res.status(409).json({ error: 'Match has started', reason: 'match_started' });
      return;
    }

    // Phase 6: Check if actual score is locked (admin has entered final score)
    const actualResult = await db.get(
      'SELECT match_number FROM actual_results WHERE match_number = ?',
      [parsedMatch]
    );
    if (actualResult) {
      res.status(409).json({ error: 'Final score already set', reason: 'score_locked' });
      return;
    }

    const result = await db.run(
      `UPDATE predictions
       SET team_a_score = ?, team_b_score = ?, penalty_winner_side = ?, golden_boot_boost = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND match_number = ?`,
      [parsedPayload.teamAScore, parsedPayload.teamBScore, parsedPayload.penaltyWinnerSide, parsedPayload.goldenBootBoost, req.session.userId, parsedMatch]
    );

    if (result.changes === 0) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    const boostContext = await buildGoldenBootContext(req.session.userId);
    res.json({
      matchNumber: parsedMatch,
      teamAScore: parsedPayload.teamAScore,
      teamBScore: parsedPayload.teamBScore,
      penaltyWinnerSide: parsedPayload.penaltyWinnerSide,
      goldenBootBoost: Boolean(parsedPayload.goldenBootBoost),
      ...boostContext
    });
  });

  app.delete('/api/predictions/:matchNumber', requireAuth, requireLeagueContextIfMember, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);
    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid match number' });
      return;
    }

    const result = await db.run(
      'DELETE FROM predictions WHERE user_id = ? AND match_number = ?',
      [req.session.userId, parsedMatch]
    );

    if (result.changes === 0) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    res.status(204).end();
  });

  app.get('/api/member/scores', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const [predictionRows, actualRows, boostContext] = await Promise.all([
      db.all(
        `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost
         FROM predictions
         WHERE user_id = ?`,
        [req.session.userId]
      ),
      db.all(
        `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side
         FROM actual_results`
      ),
      buildGoldenBootContext(req.session.userId)
    ]);

    const predictionMap = new Map(
      predictionRows.map((row) => [
        row.match_number,
        predictionFromRow(row)
      ])
    );

    const actualMap = new Map(
      actualRows.map((row) => [
        row.match_number,
        actualFromRow(row)
      ])
    );

    const items = allMatches.map((match) => {
      const prediction = predictionMap.get(match.match_number) || null;
      const actual = actualMap.get(match.match_number) || null;
      const score = scorePrediction(prediction, actual, { match });

      return {
        matchNumber: match.match_number,
        stage: match.stage,
        prediction,
        actual,
        points: score.points,
        reason: score.reason,
        breakdown: score.breakdown,
        validation: score.validation,
        officialStatus: 'preview',
        ...boostContext
      };
    });

    const summary = items.reduce(
      (accumulator, item) => {
        accumulator.totalPoints += item.points;
        if (item.reason === 'pending') {
          accumulator.pendingMatches += 1;
        } else {
          accumulator.scoredMatches += 1;
        }
        return accumulator;
      },
      { totalPoints: 0, scoredMatches: 0, pendingMatches: 0 }
    );

    res.json({ items, summary, officialStatus: 'preview', ...boostContext });
  });

  app.get('/api/member/scores/cached', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const cachedScores = await db.all(
      `SELECT match_number, points, reason, base_points, advancer_points, underdog_bonus_points, golden_boot_bonus_points, breakdown_json, calculated_at
       FROM member_scores
       WHERE user_id = ?
       ORDER BY match_number ASC`,
      [req.session.userId]
    );

    const items = allMatches.map((match) => {
      const cached = cachedScores.find((s) => s.match_number === match.match_number);

      if (!cached) {
        return {
          matchNumber: match.match_number,
          stage: match.stage,
          points: null,
          reason: 'not_calculated',
          breakdown: null,
          calculatedAt: null,
          officialStatus: 'not_calculated'
        };
      }

      return {
        matchNumber: match.match_number,
        stage: match.stage,
        points: cached.points,
        reason: cached.reason,
        breakdown: parseBreakdownJson(cached.breakdown_json) || {
          exactScorePoints: cached.base_points,
          advancerPoints: cached.advancer_points,
          underdogBonusPoints: cached.underdog_bonus_points,
          goldenBootBonusPoints: cached.golden_boot_bonus_points
        },
        calculatedAt: cached.calculated_at,
        officialStatus: 'official'
      };
    });

    const summary = cachedScores.reduce(
      (accumulator, item) => {
        accumulator.totalPoints += item.points;
        if (item.reason === 'pending') {
          accumulator.pendingMatches += 1;
        } else {
          accumulator.scoredMatches += 1;
        }
        return accumulator;
      },
      { totalPoints: 0, scoredMatches: 0, pendingMatches: 0 }
    );

    res.json({ items, summary });
  });

  const ALLOWED_TIMEZONES = [
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Kolkata'
  ];

  app.put('/api/member/timezone', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const { timezone } = req.body || {};
    if (!timezone || !ALLOWED_TIMEZONES.includes(timezone)) {
      res.status(400).json({ error: 'Invalid or unsupported timezone' });
      return;
    }

    await db.run(
      'UPDATE users SET timezone = ? WHERE id = ?',
      [timezone, req.session.userId]
    );
    req.session.timezone = timezone;
    res.json({ timezone });
  });

  app.get('/api/member/league-summary', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const requestedLeagueId = req.query.leagueId ? Number(req.query.leagueId) : null;
    if (requestedLeagueId && requestedLeagueId !== req.memberLeague.leagueId) {
      res.status(403).json({ error: 'Cross-league access denied', reason: 'cross_league_forbidden' });
      return;
    }

    const members = await db.all(
      `SELECT u.id, u.username
       FROM users u
       JOIN member_leagues ml ON ml.user_id = u.id
       WHERE u.role = 'member' AND ml.league_id = ?
       ORDER BY u.username ASC`,
      [req.memberLeague.leagueId]
    );

    res.json({
      league: {
        id: req.memberLeague.leagueId,
        name: req.memberLeague.leagueName
      },
      members
    });
  });

  app.get('/api/member/leaderboard', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const members = await getLeagueMembers(req.memberLeague.leagueId);
    if (members.length === 0) {
      res.json({
        league: {
          id: req.memberLeague.leagueId,
          name: req.memberLeague.leagueName
        },
        leaderboard: []
      });
      return;
    }

    const calculationState = await db.get(
      'SELECT calculated_at FROM score_calculation_state ORDER BY calculated_at DESC, id DESC LIMIT 1'
    );

    if (!calculationState) {
      // No official scores yet — calculate live scores for all league members
      const memberIds = members.map((member) => member.id);
      const placeholders = memberIds.map(() => '?').join(',');

      const [predictionRows, actualRows] = await Promise.all([
        db.all(
          `SELECT user_id, match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost
           FROM predictions WHERE user_id IN (${placeholders})`,
          memberIds
        ),
        db.all(
          `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side
           FROM actual_results`
        )
      ]);

      const actualMap = new Map(actualRows.map((row) => [row.match_number, actualFromRow(row)]));

      const liveEntries = members.map((member) => {
        const memberPreds = predictionRows.filter((row) => row.user_id === member.id);
        const predMap = new Map(memberPreds.map((row) => [row.match_number, predictionFromRow(row)]));

        let totalPoints = 0;
        let exactCorrect = 0;
        let resultsCorrect = 0;
        let missedPredictions = 0;

        for (const match of allMatches) {
          const prediction = predMap.get(match.match_number) || null;
          const actual = actualMap.get(match.match_number) || null;
          if (!actual) continue;
          const score = scorePrediction(prediction, actual, { match });
          totalPoints += score.points;
          if (score.breakdown?.exactScorePoints > 0) exactCorrect += 1;
          if (score.breakdown?.advancerPoints > 0) resultsCorrect += 1;
          if (score.reason === 'missing_prediction') missedPredictions += 1;
        }

        return {
          userId: member.id,
          username: member.username,
          totalPoints,
          exactCorrect,
          resultsCorrect,
          missedPredictions,
          officialStatus: 'preview',
          calculatedAt: null
        };
      });

      liveEntries.sort((a, b) =>
        (b.totalPoints - a.totalPoints)
        || (b.exactCorrect - a.exactCorrect)
        || (b.resultsCorrect - a.resultsCorrect)
        || a.username.localeCompare(b.username)
      );

      let rank = 0;
      let prev = null;
      for (let i = 0; i < liveEntries.length; i++) {
        const entry = liveEntries[i];
        const same = prev
          && prev.totalPoints === entry.totalPoints
          && prev.exactCorrect === entry.exactCorrect
          && prev.resultsCorrect === entry.resultsCorrect;
        if (!same) rank = i + 1;
        entry.rank = rank;
        prev = entry;
      }

      res.json({
        league: { id: req.memberLeague.leagueId, name: req.memberLeague.leagueName },
        leaderboard: liveEntries,
        officialStatus: 'preview',
        message: 'Live preview scores — official scores pending admin calculation.'
      });
      return;
    }

    const memberIds = members.map((member) => member.id);
    const placeholders = memberIds.map(() => '?').join(',');
    const cachedRows = await db.all(
      `SELECT user_id, points, reason, base_points, advancer_points, underdog_bonus_points, golden_boot_bonus_points, calculated_at
       FROM member_scores
       WHERE user_id IN (${placeholders})`,
      memberIds
    );

    const cachedByMember = new Map();
    for (const row of cachedRows) {
      if (!cachedByMember.has(row.user_id)) cachedByMember.set(row.user_id, []);
      cachedByMember.get(row.user_id).push(row);
    }

    const entries = members.map((member) => {
      const rows = cachedByMember.get(member.id) || [];
      return {
        userId: member.id,
        username: member.username,
        totalPoints: rows.reduce((sum, row) => sum + row.points, 0),
        exactCorrect: rows.filter((row) => row.base_points > 0).length,
        resultsCorrect: rows.filter((row) => row.advancer_points > 0).length,
        missedPredictions: rows.filter((row) => row.reason === 'missing_prediction').length,
        underdogBonuses: rows.filter((row) => row.underdog_bonus_points > 0).length,
        goldenBootBonuses: rows.filter((row) => row.golden_boot_bonus_points > 0).length,
        officialStatus: 'official',
        calculatedAt: rows[0]?.calculated_at || calculationState.calculated_at
      };
    });

    entries.sort((a, b) =>
      (b.totalPoints - a.totalPoints)
      || (b.exactCorrect - a.exactCorrect)
      || (b.resultsCorrect - a.resultsCorrect)
      || a.username.localeCompare(b.username)
    );

    let currentRank = 0;
    let previous = null;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const sameAsPrevious = previous
        && previous.totalPoints === entry.totalPoints
        && previous.exactCorrect === entry.exactCorrect
        && previous.resultsCorrect === entry.resultsCorrect;

      if (!sameAsPrevious) {
        currentRank = index + 1;
      }
      entry.rank = currentRank;
      previous = entry;
    }

    res.json({
      league: {
        id: req.memberLeague.leagueId,
        name: req.memberLeague.leagueName
      },
      leaderboard: entries,
      officialStatus: 'official',
      calculatedAt: calculationState.calculated_at
    });
  });

  app.get('/api/member/insights/points-chart', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const members = await getLeagueMembers(req.memberLeague.leagueId);
    const league = { id: req.memberLeague.leagueId, name: req.memberLeague.leagueName };
    if (members.length === 0) {
      res.json({ league, matches: [], series: [], officialStatus: 'preview' });
      return;
    }

    const calculationState = await db.get(
      'SELECT calculated_at FROM score_calculation_state ORDER BY calculated_at DESC, id DESC LIMIT 1'
    );
    const memberIds = members.map((member) => member.id);
    const placeholders = memberIds.map(() => '?').join(',');

    if (calculationState) {
      const cachedRows = await db.all(
        `SELECT user_id, match_number, points
         FROM member_scores
         WHERE user_id IN (${placeholders})
         ORDER BY match_number ASC`,
        memberIds
      );
      const scoredMatchNumbers = [...new Set(cachedRows.map((row) => row.match_number))]
        .sort((left, right) => left - right);
      const matches = scoredMatchNumbers.map((matchNumber) => {
        const match = matchMap.get(matchNumber) || {};
        return { matchNumber, stage: match.stage || null };
      });
      const rowsByMember = new Map();
      for (const row of cachedRows) {
        if (!rowsByMember.has(row.user_id)) rowsByMember.set(row.user_id, new Map());
        rowsByMember.get(row.user_id).set(row.match_number, row.points);
      }
      const series = members.map((member) => {
        const rows = rowsByMember.get(member.id) || new Map();
        let cumulative = 0;
        return {
          userId: member.id,
          username: member.username,
          points: scoredMatchNumbers.map((matchNumber) => {
            cumulative += Number(rows.get(matchNumber) || 0);
            return cumulative;
          })
        };
      });

      res.json({ league, matches, series, officialStatus: 'official', calculatedAt: calculationState.calculated_at });
      return;
    }

    const [predictionRows, actualRows] = await Promise.all([
      db.all(
        `SELECT user_id, match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost
         FROM predictions WHERE user_id IN (${placeholders})`,
        memberIds
      ),
      db.all(
        `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side
         FROM actual_results`
      )
    ]);
    const actualMap = new Map(actualRows.map((row) => [row.match_number, actualFromRow(row)]));
    const scoredMatches = allMatches.filter((match) => actualMap.has(match.match_number));
    const predictionsByMember = new Map();
    for (const row of predictionRows) {
      if (!predictionsByMember.has(row.user_id)) predictionsByMember.set(row.user_id, new Map());
      predictionsByMember.get(row.user_id).set(row.match_number, predictionFromRow(row));
    }
    const series = members.map((member) => {
      const predictionMap = predictionsByMember.get(member.id) || new Map();
      let cumulative = 0;
      return {
        userId: member.id,
        username: member.username,
        points: scoredMatches.map((match) => {
          const score = scorePrediction(predictionMap.get(match.match_number) || null, actualMap.get(match.match_number), { match });
          cumulative += score.points;
          return cumulative;
        })
      };
    });
    const matches = scoredMatches.map((match) => ({ matchNumber: match.match_number, stage: match.stage }));

    res.json({ league, matches, series, officialStatus: 'preview' });
  });

  app.get('/api/member/peers', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const members = await getLeagueMembers(req.memberLeague.leagueId);
    res.json({
      league: {
        id: req.memberLeague.leagueId,
        name: req.memberLeague.leagueName
      },
      members
    });
  });

  app.get('/api/member/peers/:userId/predictions', requireAuth, requireMemberLeagueContext, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    const requestedLimit = req.query?.limit;
    const showAll = requestedLimit === 'all';
    const numericLimit = Number(requestedLimit);
    const limit = showAll
      ? null
      : (Number.isInteger(numericLimit) ? Math.min(20, Math.max(1, numericLimit)) : 10);

    const peer = await db.get(
      `SELECT u.id, u.username, ml.league_id
       FROM users u
       LEFT JOIN member_leagues ml ON ml.user_id = u.id
       WHERE u.id = ? AND u.role = 'member'`,
      [userId]
    );

    if (!peer) {
      res.status(404).json({ error: 'Peer not found' });
      return;
    }

    if (!Number.isInteger(peer.league_id) || peer.league_id !== req.memberLeague.leagueId) {
      res.status(403).json({ error: 'Cross-league access denied', reason: 'cross_league_forbidden' });
      return;
    }

    const predictionRows = await db.all(
      `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost, updated_at
       FROM predictions
       WHERE user_id = ?`,
      [peer.id]
    );

    const cachedRows = await db.all(
      `SELECT match_number, points, reason, breakdown_json, calculated_at
       FROM member_scores
       WHERE user_id = ?`,
      [peer.id]
    );
    const cachedMap = new Map(cachedRows.map((row) => [row.match_number, row]));

    const allPredictions = predictionRows
      .map((row) => {
        const match = matchMap.get(row.match_number);
        const kickoffAt = match ? parseMatchStartTime(match) : null;
        return {
          matchNumber: row.match_number,
          teamAScore: row.team_a_score,
          teamBScore: row.team_b_score,
          penaltyWinnerSide: row.penalty_winner_side || null,
          goldenBootBoost: Boolean(row.golden_boot_boost),
          updatedAt: row.updated_at,
          kickoffAt: kickoffAt ? kickoffAt.toISOString() : null,
          group: match?.group || null,
          stage: match?.stage || null,
          teamA: match?.team_a || null,
          teamB: match?.team_b || null,
          date: match?.date || null,
          timeEt: match?.time_et || null,
          points: cachedMap.get(row.match_number)?.points ?? null,
          reason: cachedMap.get(row.match_number)?.reason || null,
          breakdown: parseBreakdownJson(cachedMap.get(row.match_number)?.breakdown_json) || null,
          officialStatus: cachedMap.has(row.match_number) ? 'official' : 'not_calculated',
          calculatedAt: cachedMap.get(row.match_number)?.calculated_at || null
        };
      })
      .sort((a, b) => {
        const left = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
        const right = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
        return (right - left) || (b.matchNumber - a.matchNumber);
      });

    const predictions = showAll ? allPredictions : allPredictions.slice(0, limit);

    res.json({
      league: {
        id: req.memberLeague.leagueId,
        name: req.memberLeague.leagueName
      },
      peer: {
        userId: peer.id,
        username: peer.username
      },
      totalPredictions: allPredictions.length,
      limit: showAll ? 'all' : limit,
      predictions
    });
  });

  const listAdminLeaguesHandler = async (req, res) => {
    const rows = await db.all(
      `SELECT l.id, l.name, COUNT(ml.user_id) AS member_count
       FROM leagues l
       LEFT JOIN member_leagues ml ON ml.league_id = l.id
       GROUP BY l.id, l.name
       ORDER BY l.name ASC`
    );

    const leagues = rows.map((row) => ({
      id: row.id,
      name: row.name,
      memberCount: row.member_count
    }));
    res.json({ leagues });
  };

  app.get('/api/admin/leagues', requireAuth, requireAdmin, listAdminLeaguesHandler);
  app.get('/admin/leagues', requireAuth, requireAdmin, listAdminLeaguesHandler);

  const createAdminLeagueHandler = async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'League name is required' });
      return;
    }

    try {
      const result = await db.run(
        `INSERT INTO leagues (name) VALUES (?)`,
        [name]
      );
      res.status(201).json({ id: result.lastID, name });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ error: 'League name already exists' });
        return;
      }
      res.status(500).json({ error: 'Could not create league' });
    }
  };

  app.post('/api/admin/leagues', requireAuth, requireAdmin, createAdminLeagueHandler);
  app.post('/admin/leagues', requireAuth, requireAdmin, createAdminLeagueHandler);

  const updateAdminLeagueHandler = async (req, res) => {
    const leagueId = Number(req.params.leagueId);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!Number.isInteger(leagueId) || leagueId <= 0 || !name) {
      res.status(400).json({ error: 'Invalid league update payload' });
      return;
    }

    try {
      const result = await db.run(
        `UPDATE leagues SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, leagueId]
      );
      if (result.changes === 0) {
        res.status(404).json({ error: 'League not found' });
        return;
      }
      res.json({ id: leagueId, name });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ error: 'League name already exists' });
        return;
      }
      res.status(500).json({ error: 'Could not update league' });
    }
  };

  app.put('/api/admin/leagues/:leagueId', requireAuth, requireAdmin, updateAdminLeagueHandler);
  app.put('/admin/leagues/:leagueId', requireAuth, requireAdmin, updateAdminLeagueHandler);

  const deleteAdminLeagueHandler = async (req, res) => {
    const leagueId = Number(req.params.leagueId);
    const moveUsersTo = Number(req.query.moveUsersTo ?? req.body?.moveUsersTo);
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      res.status(400).json({ error: 'Invalid league id', reason: 'invalid_league_id' });
      return;
    }

    const league = await db.get('SELECT id, name FROM leagues WHERE id = ?', [leagueId]);
    if (!league) {
      res.status(404).json({ error: 'League not found', reason: 'league_not_found' });
      return;
    }

    const leagueCount = await db.get('SELECT COUNT(*) AS count FROM leagues');
    if (Number(leagueCount.count) <= 1) {
      res.status(400).json({ error: 'Cannot delete the last league', reason: 'cannot_delete_last_league' });
      return;
    }

    const memberCount = await db.get('SELECT COUNT(*) AS count FROM member_leagues WHERE league_id = ?', [leagueId]);
    if (Number(memberCount.count) > 0) {
      if (!Number.isInteger(moveUsersTo) || moveUsersTo <= 0) {
        res.status(400).json({ error: 'Destination league is required', reason: 'destination_league_required' });
        return;
      }
      if (moveUsersTo === leagueId) {
        res.status(400).json({ error: 'Destination must differ from source', reason: 'destination_must_differ_from_source' });
        return;
      }

      const destination = await db.get('SELECT id, name FROM leagues WHERE id = ?', [moveUsersTo]);
      if (!destination) {
        res.status(400).json({ error: 'Destination league not found', reason: 'destination_league_not_found' });
        return;
      }
    }

    try {
      await db.run('BEGIN IMMEDIATE TRANSACTION');
      if (Number(memberCount.count) > 0) {
        await db.run(
          `UPDATE member_leagues
           SET league_id = ?, assigned_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
           WHERE league_id = ?`,
          [moveUsersTo, req.session.userId, leagueId]
        );
      }
      const result = await db.run('DELETE FROM leagues WHERE id = ?', [leagueId]);
      await db.run('COMMIT');

      res.json({
        deleted: true,
        leagueId,
        movedMemberCount: Number(memberCount.count),
        destinationLeagueId: Number(memberCount.count) > 0 ? moveUsersTo : null,
        deletedCount: result.changes
      });
    } catch (error) {
      await db.run('ROLLBACK').catch(() => {});
      res.status(500).json({ error: 'Could not delete league', reason: 'league_delete_failed' });
    }
  };

  app.delete('/api/admin/leagues/:leagueId', requireAuth, requireAdmin, deleteAdminLeagueHandler);
  app.delete('/admin/leagues/:leagueId', requireAuth, requireAdmin, deleteAdminLeagueHandler);

  const listAdminUsersHandler = async (req, res) => {
    const rows = await db.all(
      `SELECT u.id, u.username, u.alias, u.phone_e164, u.role, ml.league_id, l.name AS league_name
       FROM users u
       LEFT JOIN member_leagues ml ON ml.user_id = u.id
       LEFT JOIN leagues l ON l.id = ml.league_id
       ORDER BY u.role ASC, u.username ASC`
    );

    const users = rows.map((row) => ({
      id: row.id,
      username: row.username,
      alias: row.alias || null,
      phone: row.phone_e164 || null,
      role: row.role,
      leagueId: row.league_id || null,
      leagueName: row.league_name || null
    }));
    res.json({ users });
  };

  app.get('/api/admin/users', requireAuth, requireAdmin, listAdminUsersHandler);

  const listAdminMembersHandler = async (req, res) => {
    const rows = await db.all(
      `SELECT u.id, u.username, ml.league_id, l.name AS league_name
       FROM users u
       LEFT JOIN member_leagues ml ON ml.user_id = u.id
       LEFT JOIN leagues l ON l.id = ml.league_id
       WHERE u.role = 'member'
       ORDER BY u.username ASC`
    );

    const members = rows.map((row) => ({
      id: row.id,
      username: row.username,
      leagueId: row.league_id || null,
      leagueName: row.league_name || null
    }));
    res.json({ members });
  };

  app.get('/api/admin/members', requireAuth, requireAdmin, listAdminMembersHandler);
  app.get('/admin/members', requireAuth, requireAdmin, listAdminMembersHandler);

  const deleteAdminUserHandler = async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ error: 'Invalid user id', reason: 'invalid_user_id' });
      return;
    }
    if (userId === req.session.userId) {
      res.status(400).json({ error: 'Cannot delete your own admin session', reason: 'cannot_delete_self' });
      return;
    }

    const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found', reason: 'user_not_found' });
      return;
    }

    if (user.role === 'admin') {
      const adminCount = await db.get('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['admin']);
      if (Number(adminCount.count) <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin', reason: 'cannot_delete_last_admin' });
        return;
      }
    }

    const deleteIfTableExists = async (tableName) => {
      const table = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [tableName]);
      if (!table) return 0;
      return (await db.run(`DELETE FROM ${tableName} WHERE user_id = ?`, [userId])).changes;
    };

    try {
      await db.run('BEGIN IMMEDIATE TRANSACTION');
      const deleted = {
        predictions: (await db.run('DELETE FROM predictions WHERE user_id = ?', [userId])).changes,
        memberScores: (await db.run('DELETE FROM member_scores WHERE user_id = ?', [userId])).changes,
        otpChallenges: await deleteIfTableExists('otp_challenges'),
        authEvents: await deleteIfTableExists('auth_events'),
        memberLeagues: (await db.run('DELETE FROM member_leagues WHERE user_id = ?', [userId])).changes
      };
      await db.run('UPDATE actual_results SET entered_by_user_id = ? WHERE entered_by_user_id = ?', [req.session.userId, userId]);
      await db.run('UPDATE score_calculation_state SET triggered_by_user_id = ? WHERE triggered_by_user_id = ?', [req.session.userId, userId]);
      const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
      await db.run('COMMIT');

      res.json({
        deleted: true,
        userId,
        username: user.username,
        deletedCount: result.changes,
        deletedRecords: deleted
      });
    } catch (error) {
      await db.run('ROLLBACK').catch(() => {});
      res.status(500).json({ error: 'Could not delete user', reason: 'user_delete_failed' });
    }
  };

  app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, deleteAdminUserHandler);

  const assignAdminMemberLeagueHandler = async (req, res) => {
    const userId = Number(req.params.userId);
    const leagueId = Number(req.body?.leagueId);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(leagueId) || leagueId <= 0) {
      res.status(400).json({ error: 'Invalid league assignment payload' });
      return;
    }

    const [member, league] = await Promise.all([
      db.get('SELECT id FROM users WHERE id = ? AND role = ?', [userId, 'member']),
      db.get('SELECT id, name FROM leagues WHERE id = ?', [leagueId])
    ]);

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    await db.run(
      `INSERT INTO member_leagues (user_id, league_id, assigned_by_user_id, assigned_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         league_id = excluded.league_id,
         assigned_by_user_id = excluded.assigned_by_user_id,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, leagueId, req.session.userId]
    );

    res.json({
      userId,
      leagueId: league.id,
      leagueName: league.name
    });
  };

  app.put('/api/admin/members/:userId/league', requireAuth, requireAdmin, assignAdminMemberLeagueHandler);
  app.put('/admin/members/:userId/league', requireAuth, requireAdmin, assignAdminMemberLeagueHandler);

  app.get('/api/admin/results', requireAuth, requireAdmin, async (req, res) => {
    const rows = await db.all(
      `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side, entered_by_user_id, updated_at
       FROM actual_results
       ORDER BY match_number ASC`
    );

    const results = rows.map((row) => ({
      matchNumber: row.match_number,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      underdogWinnerSide: row.underdog_winner_side || null,
      enteredByUserId: row.entered_by_user_id,
      updatedAt: row.updated_at
    }));

    res.json({ results });
  });

  app.get('/api/admin/results/:matchNumber', requireAuth, requireAdmin, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);
    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid match number' });
      return;
    }

    const row = await db.get(
      `SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side, entered_by_user_id, updated_at
       FROM actual_results
       WHERE match_number = ?`,
      [parsedMatch]
    );

    if (!row) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    res.json({
      matchNumber: row.match_number,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      penaltyWinnerSide: row.penalty_winner_side || null,
      underdogWinnerSide: row.underdog_winner_side || null,
      enteredByUserId: row.entered_by_user_id,
      updatedAt: row.updated_at
    });
  });

  app.post('/api/admin/results', requireAuth, requireAdmin, async (req, res) => {
    const { matchNumber, teamAScore, teamBScore, penaltyWinnerSide, underdogWinnerSide } = req.body || {};
    const parsedMatch = Number(matchNumber);

    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid result payload' });
      return;
    }

    const parsedPayload = validateResultPayload({
      match: matchMap.get(parsedMatch),
      teamAScore,
      teamBScore,
      penaltyWinnerSide,
      underdogWinnerSide
    });
    if (parsedPayload.error) {
      res.status(parsedPayload.status).json({ error: parsedPayload.error, reason: parsedPayload.reason });
      return;
    }

    try {
      await db.run(
        `INSERT INTO actual_results (match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side, entered_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [parsedMatch, parsedPayload.teamAScore, parsedPayload.teamBScore, parsedPayload.penaltyWinnerSide, parsedPayload.underdogWinnerSide, req.session.userId]
      );

      res.status(201).json({
        matchNumber: parsedMatch,
        teamAScore: parsedPayload.teamAScore,
        teamBScore: parsedPayload.teamBScore,
        penaltyWinnerSide: parsedPayload.penaltyWinnerSide,
        underdogWinnerSide: parsedPayload.underdogWinnerSide
      });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({ error: 'Result already exists. Use update.' });
        return;
      }
      res.status(500).json({ error: 'Could not create result' });
    }
  });

  app.put('/api/admin/results/:matchNumber', requireAuth, requireAdmin, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);

    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid result payload' });
      return;
    }

    const parsedPayload = validateResultPayload({
      match: matchMap.get(parsedMatch),
      teamAScore: req.body?.teamAScore,
      teamBScore: req.body?.teamBScore,
      penaltyWinnerSide: req.body?.penaltyWinnerSide,
      underdogWinnerSide: req.body?.underdogWinnerSide
    });
    if (parsedPayload.error) {
      res.status(parsedPayload.status).json({ error: parsedPayload.error, reason: parsedPayload.reason });
      return;
    }

    const result = await db.run(
      `UPDATE actual_results
       SET team_a_score = ?, team_b_score = ?, penalty_winner_side = ?, underdog_winner_side = ?, entered_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE match_number = ?`,
      [parsedPayload.teamAScore, parsedPayload.teamBScore, parsedPayload.penaltyWinnerSide, parsedPayload.underdogWinnerSide, req.session.userId, parsedMatch]
    );

    if (result.changes === 0) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    res.json({
      matchNumber: parsedMatch,
      teamAScore: parsedPayload.teamAScore,
      teamBScore: parsedPayload.teamBScore,
      penaltyWinnerSide: parsedPayload.penaltyWinnerSide,
      underdogWinnerSide: parsedPayload.underdogWinnerSide
    });
  });

  app.delete('/api/admin/results/:matchNumber', requireAuth, requireAdmin, async (req, res) => {
    const parsedMatch = Number(req.params.matchNumber);
    if (!Number.isInteger(parsedMatch) || !validMatchNumbers.has(parsedMatch)) {
      res.status(400).json({ error: 'Invalid match number' });
      return;
    }

    const result = await db.run('DELETE FROM actual_results WHERE match_number = ?', [parsedMatch]);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    res.status(204).end();
  });

  app.post('/api/admin/calculate-scores', requireAuth, requireAdmin, async (req, res) => {
    try {
      // Fetch all users (excluding admin)
      const users = await db.all(
        'SELECT id FROM users WHERE role = ?',
        ['member']
      );

      // Fetch all predictions and actual results
      const predictions = await db.all(
        'SELECT user_id, match_number, team_a_score, team_b_score, penalty_winner_side, golden_boot_boost FROM predictions'
      );

      const actualResults = await db.all(
        'SELECT match_number, team_a_score, team_b_score, penalty_winner_side, underdog_winner_side FROM actual_results'
      );

      const allowedBoostsByUser = new Map();
      for (const prediction of predictions) {
        if (!prediction.golden_boot_boost) continue;
        if (!allowedBoostsByUser.has(prediction.user_id)) allowedBoostsByUser.set(prediction.user_id, new Set());
        const allowedSet = allowedBoostsByUser.get(prediction.user_id);
        if (allowedSet.size < 5) {
          allowedSet.add(prediction.match_number);
        }
      }

      // Build maps for fast lookup
      const predictionMap = new Map();
      predictions.forEach((p) => {
        const key = `${p.user_id}-${p.match_number}`;
        predictionMap.set(key, predictionFromRow(p));
      });

      const actualMap = new Map(
        actualResults.map((r) => [
          r.match_number,
          actualFromRow(r)
        ])
      );

      // Clear existing member_scores before recalculating
      await db.run('DELETE FROM member_scores');

      // Calculate and insert scores for each user/match combination
      let totalScored = 0;

      for (const user of users) {
        for (const [matchNumber, actual] of actualMap) {
          const predictionKey = `${user.id}-${matchNumber}`;
          const prediction = predictionMap.get(predictionKey) || null;
          const match = matchMap.get(matchNumber) || null;
          const allowedBoosts = allowedBoostsByUser.get(user.id) || new Set();
          const goldenBootBoostAllowed = !prediction?.goldenBootBoost || allowedBoosts.has(matchNumber);
          const score = scorePrediction(prediction, actual, { match, goldenBootBoostAllowed });
          const breakdownJson = JSON.stringify(score.breakdown);

          await db.run(
            `INSERT INTO member_scores (
               user_id, match_number, points, reason,
               base_points, advancer_points, underdog_bonus_points, golden_boot_bonus_points,
               breakdown_json, calculated_at
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              user.id,
              matchNumber,
              score.points,
              score.reason,
              score.breakdown.exactScorePoints,
              score.breakdown.advancerPoints,
              score.breakdown.underdogBonusPoints,
              score.breakdown.goldenBootBonusPoints,
              breakdownJson
            ]
          );

          totalScored += 1;
        }
      }

      // Record calculation state
      await db.run(
        `INSERT INTO score_calculation_state (calculated_at, matched_actual_results_count, triggered_by_user_id)
         VALUES (CURRENT_TIMESTAMP, ?, ?)`,
        [actualResults.length, req.session.userId]
      );

      res.json({
        success: true,
        totalMembers: users.length,
        totalMatchesWithScores: actualResults.length,
        totalScoredEntries: totalScored
      });
    } catch (error) {
      console.error('Error calculating scores:', error);
      res.status(500).json({ error: 'Could not calculate scores' });
    }
  });

  app.get('/:fileName', (req, res, next) => {
    if (!PUBLIC_FILE_NAMES.has(req.params.fileName)) {
      next();
      return;
    }
    res.sendFile(path.join(__dirname, req.params.fileName));
  });

  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    if (req.path.includes('.')) {
      next();
      return;
    }
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.locals.db = db;
  return { app, db };
}

async function startServer() {
  const { app } = await buildApp();
  app.listen(PORT, () => {
    console.log(`World Cup prediction app running at http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildApp,
  startServer
};
