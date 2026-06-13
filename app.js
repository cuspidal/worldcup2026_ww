const landingView = document.getElementById('landing-view');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const predictionsView = document.getElementById('predictions-view');
const adminView = document.getElementById('admin-view');

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const signupForm = document.getElementById('signup-form');
const signupUsernameInput = document.getElementById('signup-username');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
const signupStatus = document.getElementById('signup-status');

const landingTimezoneSelect = document.getElementById('landing-timezone-select');
const hostCitiesGrid = document.getElementById('host-cities-grid');
const publicFixturesList = document.getElementById('public-fixtures-list');

const welcomeText = document.getElementById('welcome-text');
const totalPointsText = document.getElementById('member-total-points');
const memberBoostsRemainingText = document.getElementById('member-boosts-remaining');
const memberOfficialStatusText = document.getElementById('member-official-status');
const memberTabPredictions = document.getElementById('member-tab-predictions');
const memberTabLeague = document.getElementById('member-tab-league');
const memberTabInsights = document.getElementById('member-tab-insights');
const memberPredictionsScreen = document.getElementById('member-predictions-screen');
const memberLeagueScreen = document.getElementById('member-league-screen');
const memberInsightsScreen = document.getElementById('member-insights-screen');
const memberLeaderboardTitle = document.getElementById('member-leaderboard-title');
const memberLeaderboardBody = document.getElementById('member-leaderboard-body');
const memberPeerSelect = document.getElementById('member-peer-select');
const memberPeerToggle = document.getElementById('member-peer-toggle');
const memberPeerStatus = document.getElementById('member-peer-status');
const memberPeerPredictionsBody = document.getElementById('member-peer-predictions-body');
const memberInsightsTitle = document.getElementById('member-insights-title');
const memberInsightsStatus = document.getElementById('member-insights-status');
const memberPointsChart = document.getElementById('member-points-chart');
const memberPasswordForm = document.getElementById('member-password-form');
const memberCurrentPasswordInput = document.getElementById('member-current-password');
const memberNewPasswordInput = document.getElementById('member-new-password');
const memberConfirmPasswordInput = document.getElementById('member-confirm-password');
const memberPasswordStatus = document.getElementById('member-password-status');
const scoringRulesButton = document.getElementById('scoring-rules-btn');
const scoringRulesModal = document.getElementById('scoring-rules-modal');
const scoringRulesClose = document.getElementById('scoring-rules-close');
const logoutButton = document.getElementById('logout-btn');
const matchesBody = document.getElementById('matches-body');
const timezoneSelect = document.getElementById('timezone-select');

const adminWelcomeText = document.getElementById('admin-welcome-text');
const adminLogoutButton = document.getElementById('admin-logout-btn');
const adminMatchesBody = document.getElementById('admin-matches-body');
const adminMatchesScreen = document.getElementById('admin-matches-screen');
const adminLeaguesUsersScreen = document.getElementById('admin-leagues-users-screen');
const adminNavMatches = document.getElementById('admin-nav-matches');
const adminNavLeaguesUsers = document.getElementById('admin-nav-leagues-users');
const adminDateTime = document.getElementById('admin-datetime');
const adminUnlockAllScoresButton = document.getElementById('admin-unlock-all-scores-btn');
const adminMatchStatus = document.getElementById('admin-match-status');
const kpiMembers = document.getElementById('kpi-members');
const kpiMatches = document.getElementById('kpi-matches');
const kpiStatus = document.getElementById('kpi-status');
const adminLeagueCreateForm = document.getElementById('admin-league-create-form');
const adminLeagueNameInput = document.getElementById('admin-league-name');
const adminLeagueStatus = document.getElementById('admin-league-status');
const adminLeaguesList = document.getElementById('admin-leagues-list');
const adminLeaguesBody = document.getElementById('admin-leagues-body');
const adminUsersBody = document.getElementById('admin-users-body');
const adminMemberAssignForm = document.getElementById('admin-member-assign-form');
const adminMemberSelect = document.getElementById('admin-member-select');
const adminLeagueSelect = document.getElementById('admin-league-select');

const memberRowTemplate = document.getElementById('member-row-template');
const adminRowTemplate = document.getElementById('admin-row-template');

const cityModal = document.getElementById('city-modal');
const cityModalTitle = document.getElementById('city-modal-title');
const cityModalVenue = document.getElementById('city-modal-venue');
const cityModalBody = document.getElementById('city-modal-body');
const cityModalClose = document.getElementById('city-modal-close');
const matchPeersModal = document.getElementById('match-peers-modal');
const matchPeersModalTitle = document.getElementById('match-peers-modal-title');
const matchPeersModalBody = document.getElementById('match-peers-modal-body');
const matchPeersModalClose = document.getElementById('match-peers-modal-close');

let sessionUser = null;
let currentTimezone = 'America/New_York';
let scheduleCache = [];
let adminClockTimer = null;
let adminActiveScreen = 'matches';
let memberActiveScreen = 'predictions';
let adminLeagueData = { leagues: [], members: [], users: [] };
let memberPeersData = [];
let memberPeerShowAll = false;
let matchPeerPredictionsCache = new Map();
let adminUnlockAllPredictionsEnabled = false;

const PEER_PREDICTION_LATEST_LIMIT = 10;
const CHART_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9'];

const ROUTES = {
  landing: '#/',
  login: '#/member/login',
  signup: '#/member/signup',
  member: '#/member',
  admin: '#/admin/dashboard'
};

const ALLOWED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Europe/Rome', 
  'Asia/Singapore',
  'Australia/Sydney',
  'Asia/Tokyo'
];

const PUBLIC_TIMEZONE_COOKIE = 'wc26_timezone';

const REASON_LABELS = {
  exact: 'Exact scoreline',
  exact_knockout: 'Exact knockout scoreline',
  winner_only: 'Winner only',
  correct_advancer: 'Correct advancer',
  wrong_winner: 'Wrong winner',
  wrong_advancer: 'Wrong advancer',
  missing_prediction: 'No prediction',
  pending: 'Pending actual score',
  not_calculated: 'Official pending',
  invalid_prediction: 'Invalid prediction',
  invalid_actual_result: 'Invalid result'
};

// const TEAM_FLAG_MAP = {
//   Algeria: '🇩🇿',
//   Argentina: '🇦🇷',
//   Australia: '🇦🇺',
//   Austria: '🇦🇹',
//   Belgium: '🇧🇪',
//   'Bosnia and Herzegovina': '🇧🇦',
//   Brazil: '🇧🇷',
//   'Cabo Verde': '🇨🇻',
//   Canada: '🇨🇦',
//   Colombia: '🇨🇴',
//   'Congo DR': '🇨🇩',
//   Croatia: '🇭🇷',
//   Curaçao: '🇨🇼',
//   Czechia: '🇨🇿',
//   'Côte d’Ivoire': '🇨🇮',
//   Ecuador: '🇪🇨',
//   Egypt: '🇪🇬',
//   England: '🏴',
//   France: '🇫🇷',
//   Germany: '🇩🇪',
//   Ghana: '🇬🇭',
//   Haiti: '🇭🇹',
//   Iran: '🇮🇷',
//   Iraq: '🇮🇶',
//   Japan: '🇯🇵',
//   Jordan: '🇯🇴',
//   'Korea Republic': '🇰🇷',
//   Mexico: '🇲🇽',
//   Morocco: '🇲🇦',
//   Netherlands: '🇳🇱',
//   'New Zealand': '🇳🇿',
//   Norway: '🇳🇴',
//   Panama: '🇵🇦',
//   Paraguay: '🇵🇾',
//   Portugal: '🇵🇹',
//   Qatar: '🇶🇦',
//   'Saudi Arabia': '🇸🇦',
//   Scotland: '🏴',
//   Senegal: '🇸🇳',
//   'South Africa': '🇿🇦',
//   Spain: '🇪🇸',
//   Sweden: '🇸🇪',
//   Switzerland: '🇨🇭',
//   Tunisia: '🇹🇳',
//   Türkiye: '🇹🇷',
//   'United States': '🇺🇸',
//   Uruguay: '🇺🇾',
//   Uzbekistan: '🇺🇿'
// };

const TEAM_ISO_MAP = {
  Algeria: 'dz', Argentina: 'ar', Australia: 'au', Austria: 'at',
  Belgium: 'be', 'Bosnia and Herzegovina': 'ba', Brazil: 'br',
  'Cabo Verde': 'cv', Canada: 'ca', Colombia: 'co', 'Congo DR': 'cd',
  Croatia: 'hr', 'Curaçao': 'cw', Czechia: 'cz', "Côte d'Ivoire": 'ci',
  "Côte d’Ivoire": "ci",  Ecuador: 'ec', Egypt: 'eg', England: 'gb-eng', France: 'fr',
  Germany: 'de', Ghana: 'gh', Haiti: 'ht', Iran: 'ir', Iraq: 'iq',
  Japan: 'jp', Jordan: 'jo', 'Korea Republic': 'kr', Mexico: 'mx',
  Morocco: 'ma', Netherlands: 'nl', 'New Zealand': 'nz', Norway: 'no',
  Panama: 'pa', Paraguay: 'py', Portugal: 'pt', Qatar: 'qa',
  'Saudi Arabia': 'sa', Scotland: 'gb-sct', Senegal: 'sn',
  'South Africa': 'za', Spain: 'es', Sweden: 'se', Switzerland: 'ch',
  Tunisia: 'tn', Türkiye: 'tr', 'United States': 'us', Uruguay: 'uy',
  Uzbekistan: 'uz'
};

function flagImg(team) {
  const iso = TEAM_ISO_MAP[team];
  if (!iso) return '';
  return `<img src="https://flagcdn.com/20x15/${iso}.png" width="20" height="15" alt="${team} flag" style="vertical-align:middle;border-radius:2px;">`;
}

function toIntOrNull(value) {
  if (value === '') return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue > 50) return null;
  return numberValue;
}

function formatTeamsWithFlags(teamA, teamB) {
  const flagA = flagImg(teamA);
  const flagB = flagImg(teamB);
  return `${flagA} ${teamA} vs ${teamB} ${flagB}`;
}

function parseEtToUtc(dateValue, timeEtValue) {
  if (!dateValue || !timeEtValue) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeEtValue.split(':').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour + 4, minute);
  return new Date(utcMs);
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMatchTime(match, timezone) {
  if (!match.date || !match.time_et) return formatDate(match.date);
  const matchDate = parseEtToUtc(match.date, match.time_et);
  if (!matchDate) return `${formatDate(match.date)} ${match.time_et} ET`;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(matchDate);
}

function getCookieValue(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || null;
}

function savePublicTimezone(timezone) {
  if (!ALLOWED_TIMEZONES.includes(timezone)) return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${PUBLIC_TIMEZONE_COOKIE}=${encodeURIComponent(timezone)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function loadPublicTimezone() {
  const timezone = decodeURIComponent(getCookieValue(PUBLIC_TIMEZONE_COOKIE) || '');
  return ALLOWED_TIMEZONES.includes(timezone) ? timezone : 'America/New_York';
}

function syncTimezoneControls() {
  if (landingTimezoneSelect) landingTimezoneSelect.value = currentTimezone;
  if (timezoneSelect) timezoneSelect.value = currentTimezone;
}

function isMatchStarted(match) {
  if (!match.date || !match.time_et) return false;
  return new Date() > parseEtToUtc(match.date, match.time_et);
}

function currentRoute() {
  if (!window.location.hash) return ROUTES.landing;
  return window.location.hash;
}

function navigate(route) {
  if (window.location.hash !== route) {
    window.location.hash = route;
  } else {
    renderRoute().catch((error) => {
      loginError.textContent = `Failed to render route: ${error.message}`;
    });
  }
}

function hideAllViews() {
  landingView.classList.add('hidden');
  loginView.classList.add('hidden');
  signupView.classList.add('hidden');
  predictionsView.classList.add('hidden');
  adminView.classList.add('hidden');
}

function stopTimers() {
  if (adminClockTimer) {
    clearInterval(adminClockTimer);
    adminClockTimer = null;
  }
}

function openCityModal(city, venue) {
  const matches = scheduleCache
    .filter((m) => m.city === city && m.venue === venue)
    .sort((a, b) => a.match_number - b.match_number);

  cityModalTitle.textContent = city;
  cityModalVenue.textContent = venue;
  cityModalBody.innerHTML = matches.map((m) => `
    <div class="city-modal-row">
      <span class="city-modal-match-num">#${m.match_number}</span>
      <span class="city-modal-date">${formatMatchTime(m, currentTimezone)}</span>
      <span class="fixture-badge">Group ${m.group}</span>
      <span class="city-modal-teams">${formatTeamsWithFlags(m.team_a, m.team_b)}</span>
    </div>
  `).join('');

  cityModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCityModal() {
  cityModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function openMatchPeersModal(match, predictions) {
  if (!matchPeersModal || !matchPeersModalTitle || !matchPeersModalBody) return;
  matchPeersModalTitle.textContent = `All League Predictions - Match #${match.match_number}`;
  matchPeersModalBody.innerHTML = '';

  if (!predictions.length) {
    const empty = document.createElement('p');
    empty.className = 'match-peer-empty';
    empty.textContent = 'No league predictions available yet.';
    matchPeersModalBody.appendChild(empty);
  } else {
    for (const item of predictions) {
      const row = document.createElement('div');
      row.className = 'match-peer-row';
      const predictionText = item.hasPrediction
        ? `${item.teamAScore}:${item.teamBScore}${item.penaltyWinnerSide ? ` (P:${item.penaltyWinnerSide})` : ''}${item.goldenBootBoost ? ' +GB' : ''}`
        : 'No prediction yet';
      row.innerHTML = `
        <span class="match-peer-user">${item.username}</span>
        <span class="match-peer-pick">${predictionText}</span>
      `;
      matchPeersModalBody.appendChild(row);
    }
  }

  matchPeersModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeMatchPeersModal() {
  if (!matchPeersModal) return;
  matchPeersModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function openScoringRulesModal() {
  if (!scoringRulesModal) return;
  scoringRulesModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeScoringRulesModal() {
  if (!scoringRulesModal) return;
  scoringRulesModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderHostCities() {
  if (!hostCitiesGrid) return;

  const cityMap = new Map();
  for (const match of scheduleCache.filter((m) => m.stage === 'Group Stage')) {
    const key = `${match.city}|${match.venue}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city: match.city,
        venue: match.venue,
        count: 0
      });
    }
    cityMap.get(key).count += 1;
  }

  hostCitiesGrid.innerHTML = '';
  const topCities = [...cityMap.values()].sort((a, b) => b.count - a.count).slice(0, 20);

  for (const item of topCities) {
    const now = new Date();
    const nextMatch = scheduleCache
    .filter((m) => m.city === item.city && m.venue === item.venue && new Date(m.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    const nextMatchLine = nextMatch
    ? `<p class="host-city-meta host-city-next">⚽ Next: ${formatTeamsWithFlags(nextMatch.team_a, nextMatch.team_b)}<br>
       <span class="host-city-next-date">${formatMatchTime(nextMatch, currentTimezone)}</span></p>`
    : `<p class="host-city-meta host-city-next">All matches completed</p>`;

    const card = document.createElement('article');
    card.className = 'host-city-card host-city-card-token';
    card.innerHTML = `
      <h3>${item.city}</h3>
      <p class="host-city-meta">${item.venue}</p>
      <p class="host-city-meta">${item.count} group-stage matches</p>
      ${nextMatchLine}
      <button class="btn btn-secondary city-schedule-btn" type="button">View Schedule</button>
    `;
    card.querySelector('.city-schedule-btn').addEventListener('click', () => {
      openCityModal(item.city, item.venue);
    });
    hostCitiesGrid.appendChild(card);
  }
}

function renderPublicFixtures() {
  if (!publicFixturesList) return;
  publicFixturesList.innerHTML = '';

  const now = Date.now();

  const fixtures = scheduleCache
    .filter((m) => m.stage === 'Group Stage' && kickoffTimeMs(m) >= now)
    .sort((a, b) => {
      const kickoffDiff = kickoffTimeMs(a) - kickoffTimeMs(b);
      if (kickoffDiff !== 0) return kickoffDiff;
      return a.match_number - b.match_number;
    })
    .slice(0, 5);

  if (!fixtures.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'fixture-empty-state';
    emptyState.textContent = 'No upcoming group-stage fixtures.';
    publicFixturesList.appendChild(emptyState);
    return;
  }

  for (const match of fixtures) {
    const row = document.createElement('article');
    row.className = 'fixture-row';

    row.innerHTML = `
      <div>
        <div class="fixture-time">${formatMatchTime(match, currentTimezone)}</div>
      </div>
      <div>
        <span class="fixture-badge fixture-stage-badge">Group Stage - ${match.group}</span>
        <div class="fixture-teams">
          <span class="fixture-football-icon">⚽</span>
          <span>${formatTeamsWithFlags(match.team_a, match.team_b)}</span>
        </div>
      </div>
      <div>${match.venue}</div>
    `;

    publicFixturesList.appendChild(row);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function buildDetailPanel(match) {
  const renderSlots = (results) => {
    const safeResults = Array.isArray(results) ? results.slice(0, 3) : ['-', '-', '-'];
    while (safeResults.length < 3) safeResults.push('-');
    return safeResults
      .map((result) => `<span class="form-slot ${resultToSlotClass(result)}">${result}</span>`)
      .join('');
  };

  const formSlots = (teamA, teamB, teamAResults, teamBResults) => `
    <div class="compact-form-stack">
      <div class="compact-form-line">
        <span class="compact-form-team">${flagImg(teamA)} ${teamA}</span>
        <div class="form-slots compact-form-slots">
          ${renderSlots(teamAResults)}
        </div>
      </div>
      <div class="compact-form-line">
        <span class="compact-form-team">${flagImg(teamB)} ${teamB}</span>
        <div class="form-slots compact-form-slots">
          ${renderSlots(teamBResults)}
        </div>
      </div>
    </div>
    <p class="form-caption compact-form-caption">Based on earlier World Cup matches</p>
  `;

  return `
    <div class="match-detail-panel">
      <div class="detail-section">
        <h4>Venue</h4>
        <p>${match.venue}</p>
        <p style="color:#475569;font-size:12px">${match.city}, ${match.country}</p>
      </div>
      <div class="detail-section detail-section-form">
        <h4>Last 3 Results</h4>
        ${formSlots(match.team_a, match.team_b, match.lastThree?.teamAResults, match.lastThree?.teamBResults)}
      </div>
      <div class="detail-section detail-section-league-picks" data-match-peer-preview data-match-number="${match.match_number}">
        <h4>League Predictions</h4>
        <div class="match-peer-list" data-match-peer-list>
          <p class="match-peer-empty">Loading league predictions...</p>
        </div>
        <button class="btn btn-secondary match-peer-more-btn hidden" type="button" data-match-peer-more>View more</button>
      </div>
    </div>
  `;
}

function resultToSlotClass(result) {
  if (result === 'W') return 'form-slot-win';
  if (result === 'L') return 'form-slot-loss';
  if (result === 'D') return 'form-slot-draw';
  return 'form-slot-empty';
}

function resolveTeamResult(match, actual, teamName) {
  if (!match || !actual || !teamName) return null;
  const teamAScore = Number(actual.teamAScore);
  const teamBScore = Number(actual.teamBScore);
  if (!Number.isInteger(teamAScore) || !Number.isInteger(teamBScore)) return null;

  const isTeamA = match.team_a === teamName;
  const isTeamB = match.team_b === teamName;
  if (!isTeamA && !isTeamB) return null;

  const scoreDiff = teamAScore - teamBScore;
  if (scoreDiff !== 0) {
    if (isTeamA) return scoreDiff > 0 ? 'W' : 'L';
    return scoreDiff < 0 ? 'W' : 'L';
  }

  if (match.stage !== 'Group Stage' && actual.penaltyWinnerSide) {
    if (isTeamA) return actual.penaltyWinnerSide === 'A' ? 'W' : 'L';
    return actual.penaltyWinnerSide === 'B' ? 'W' : 'L';
  }

  return 'D';
}

function kickoffTimeMs(match) {
  return parseEtToUtc(match.date, match.time_et)?.getTime() || 0;
}

function buildLastThreeFormByMatch(matches, scoreMap) {
  const sortedMatches = [...matches].sort((left, right) => {
    const timeDiff = kickoffTimeMs(left) - kickoffTimeMs(right);
    if (timeDiff !== 0) return timeDiff;
    return left.match_number - right.match_number;
  });

  const formMap = new Map();

  for (const match of sortedMatches) {
    const currentKickoff = kickoffTimeMs(match);

    const computeTeamHistory = (teamName) => {
      const outcomes = [];
      for (const priorMatch of sortedMatches) {
        if (priorMatch.match_number === match.match_number) continue;
        if (kickoffTimeMs(priorMatch) >= currentKickoff) continue;
        if (priorMatch.team_a !== teamName && priorMatch.team_b !== teamName) continue;

        const actual = scoreMap.get(priorMatch.match_number)?.actual || null;
        if (!actual) continue;

        const result = resolveTeamResult(priorMatch, actual, teamName);
        if (result) outcomes.push(result);
      }

      const lastThree = outcomes.slice(-3).reverse();
      while (lastThree.length < 3) lastThree.push('-');
      return lastThree;
    };

    formMap.set(match.match_number, {
      teamAResults: computeTeamHistory(match.team_a),
      teamBResults: computeTeamHistory(match.team_b)
    });
  }

  return formMap;
}

function renderMatchPeerPreview(container, predictions, match) {
  const listEl = container.querySelector('[data-match-peer-list]');
  const moreBtn = container.querySelector('[data-match-peer-more]');
  if (!listEl || !moreBtn) return;

  listEl.innerHTML = '';
  if (!predictions.length) {
    const empty = document.createElement('p');
    empty.className = 'match-peer-empty';
    empty.textContent = 'No league predictions yet.';
    listEl.appendChild(empty);
    moreBtn.classList.add('hidden');
    return;
  }

  const previewItems = predictions.slice(0, 4);
  for (const item of previewItems) {
    const row = document.createElement('div');
    row.className = 'match-peer-row';
    const predictionText = item.hasPrediction
      ? `${item.teamAScore}:${item.teamBScore}${item.penaltyWinnerSide ? ` (P:${item.penaltyWinnerSide})` : ''}${item.goldenBootBoost ? ' +GB' : ''}`
      : 'No prediction yet';
    row.innerHTML = `
      <span class="match-peer-user">${item.username}</span>
      <span class="match-peer-pick">${predictionText}</span>
    `;
    listEl.appendChild(row);
  }

  if (predictions.length > 4) {
    moreBtn.classList.remove('hidden');
    moreBtn.onclick = () => openMatchPeersModal(match, predictions);
  } else {
    moreBtn.classList.add('hidden');
  }
}

async function loadAndRenderMatchPeerPreview(container, match) {
  const cached = matchPeerPredictionsCache.get(match.match_number);
  if (cached) {
    renderMatchPeerPreview(container, cached, match);
    return;
  }

  const listEl = container.querySelector('[data-match-peer-list]');
  try {
    const payload = await api(`/api/member/matches/${match.match_number}/peer-predictions`);
    const predictions = payload.predictions || [];
    matchPeerPredictionsCache.set(match.match_number, predictions);
    renderMatchPeerPreview(container, predictions, match);
  } catch (error) {
    if (!listEl) return;
    listEl.innerHTML = '';
    const err = document.createElement('p');
    err.className = 'match-peer-empty status-error';
    err.textContent = error.message;
    listEl.appendChild(err);
  }
}

function wireSteppers(container, input) {
  container.querySelector('.stepper-dec').addEventListener('click', () => {
    const current = Number.isInteger(Number(input.value)) ? Number(input.value) : 0;
    input.value = Math.max(0, current - 1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  container.querySelector('.stepper-inc').addEventListener('click', () => {
    const current = Number.isInteger(Number(input.value)) ? Number(input.value) : -1;
    input.value = Math.min(50, current + 1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function renderScoreBreakdown(scoreItem, officialItem) {
  const source = officialItem && officialItem.points !== null ? officialItem : scoreItem;
  if (!source) return '-';
  const reason = source.reason;
  const breakdown = source.breakdown || {};
  const points = source.points;

  if (reason === 'missing_prediction') return 'No prediction (-2)';
  if (reason === 'invalid_prediction') return 'Missing penalty pick (-1)';
  if (reason === 'pending') return 'Pending result';

  const parts = [];
  if (Number.isInteger(breakdown.advancerPoints)) parts.push(`Result ${breakdown.advancerPoints > 0 ? '+' : ''}${breakdown.advancerPoints}`);
  if (breakdown.exactScorePoints > 0) parts.push(`Scoreline +${breakdown.exactScorePoints}`);
  if (breakdown.goldenBootBonusPoints > 0) parts.push(`Golden Boot Bonus +${breakdown.goldenBootBonusPoints}`);
  if (breakdown.underdogBonusPoints > 0) parts.push(`Underdog Bonus+${breakdown.underdogBonusPoints}`);
  if (parts.length) return parts.join(' | ');
  if (reason) return REASON_LABELS[reason] || reason;
  return '-';
}

function syncPenaltyToggleUI(toggleEl, value) {
  if (!toggleEl) return;
  toggleEl.dataset.selected = value || '';
  toggleEl.querySelectorAll('.penalty-btn').forEach((btn) => {
    btn.classList.toggle('penalty-btn-active', btn.dataset.side === value);
  });
}

function updateKnockoutControls({ match, scoreAInput, scoreBInput, controls, penaltySelect, penaltyToggle, boostInput, existingPrediction, boostsRemaining }) {
  const isKnockout = match.stage !== 'Group Stage';
  if (!controls) return;
  controls.classList.toggle('hidden', !isKnockout);
  if (!isKnockout) {
    if (penaltySelect) penaltySelect.value = '';
    if (penaltyToggle) syncPenaltyToggleUI(penaltyToggle, '');
    if (boostInput) boostInput.checked = false;
    return;
  }

  const teamAScore = toIntOrNull(scoreAInput.value);
  const teamBScore = toIntOrNull(scoreBInput.value);
  const predictedDraw = teamAScore !== null && teamBScore !== null && teamAScore === teamBScore;
  if (penaltySelect) {
    penaltySelect.disabled = !predictedDraw;
    penaltySelect.closest('.penalty-winner-control')?.classList.toggle('control-required', predictedDraw);
    if (!predictedDraw) {
      penaltySelect.value = '';
      if (penaltyToggle) syncPenaltyToggleUI(penaltyToggle, '');
    }
  }
  if (penaltyToggle) {
    penaltyToggle.querySelectorAll('.penalty-btn').forEach((btn) => {
      btn.disabled = !predictedDraw;
    });
    penaltyToggle.classList.toggle('penalty-toggle-active', predictedDraw);
  }
  if (boostInput) {
    const ownsSavedBoost = Boolean(existingPrediction?.goldenBootBoost);
    boostInput.disabled = !ownsSavedBoost && Number(boostsRemaining) <= 0;
    const countEl = boostInput.closest('.golden-boot-control')?.querySelector('.boost-count');
    if (countEl) {
      if (boostInput.checked) {
        countEl.textContent = '1 used here';
        countEl.style.display = '';
      } else {
        countEl.textContent = '';
        countEl.style.display = 'none';
      }

    }
  }
}

async function renderPredictionsTable() {
  matchPeerPredictionsCache = new Map();
  const [matchesResult, scoresResult, cachedScoresResult, statusResult] = await Promise.all([
    api('/api/matches'),
    api('/api/member/scores'),
    api('/api/member/scores/cached'),
    api('/api/matches/status')
  ]);

  const cachedItems = cachedScoresResult.items || [];
  const hasOfficialScores = cachedItems.some((item) => item.officialStatus === 'official');
  const displaySummary = hasOfficialScores ? cachedScoresResult.summary : scoresResult.summary;
  totalPointsText.textContent = `My Points: ${displaySummary.totalPoints}`;

  const boostsRemaining = Number(scoresResult.goldenBootBoostsRemaining ?? 5);
  // if (memberBoostsRemainingText) {
  //   memberBoostsRemainingText.textContent = `Golden Boot Boosts: ${boostsRemaining} remaining`;
  // }
  // if (memberOfficialStatusText) {
  //   memberOfficialStatusText.textContent = hasOfficialScores
  //     ? 'Official scores calculated'
  //     : 'Live preview shown - official scores pending admin calculation';
  //   memberOfficialStatusText.classList.toggle('status-ok', hasOfficialScores);
  //   memberOfficialStatusText.classList.toggle('status-pending', !hasOfficialScores);
  // }

  const scoreMap = new Map(scoresResult.items.map((item) => [item.matchNumber, item]));
  const cachedScoreMap = new Map(cachedItems.map((item) => [item.matchNumber, item]));
  const statusMap = new Map(statusResult.status.map((item) => [item.matchNumber, item]));
  const unlockAllPredictions = Boolean(statusResult.unlockAllPredictions);
  const lastThreeFormByMatch = buildLastThreeFormByMatch(matchesResult.matches || [], scoreMap);

  matchesBody.innerHTML = '';
  let currentStage = '';

  for (const match of matchesResult.matches) {
    const matchWithForm = {
      ...match,
      lastThree: lastThreeFormByMatch.get(match.match_number) || { teamAResults: ['-', '-', '-'], teamBResults: ['-', '-', '-'] }
    };

    if (match.stage !== currentStage) {
      currentStage = match.stage;
      const stageRow = document.createElement('tr');
      stageRow.className = 'stage-divider-row';
      stageRow.innerHTML = `<td colspan="9">${currentStage}</td>`;
      matchesBody.appendChild(stageRow);
    }

    const fragment = memberRowTemplate.content.cloneNode(true);
    const mainRow = fragment.querySelector('.match-main-row');
    const detailRow = fragment.querySelector('.match-detail-row');

    const scoreAInput = mainRow.querySelector('.score-a');
    const scoreBInput = mainRow.querySelector('.score-b');
    const statusEl = mainRow.querySelector('.confirm-status');
    const actionCell = mainRow.querySelector('.action-cell');
    const actualCell = mainRow.querySelector('.actual-score');
    const pointsCell = mainRow.querySelector('.member-points');
    const reasonCell = mainRow.querySelector('.member-status');
    const knockoutControls = mainRow.querySelector('[data-knockout-controls]');
    const penaltySelect = mainRow.querySelector('.penalty-winner-side');
    const penaltyToggle = mainRow.querySelector('[data-penalty-toggle]');
    const boostInput = mainRow.querySelector('.golden-boot-boost');

    // Wire penalty pill toggle to hidden select
    if (penaltyToggle) {
      penaltyToggle.querySelectorAll('.penalty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const side = btn.dataset.side;
          const current = penaltySelect.value;
          const next = current === side ? '' : side;
          penaltySelect.value = next;
          syncPenaltyToggleUI(penaltyToggle, next);
        });
      });
    }

    mainRow.querySelector('.match-number').textContent = matchWithForm.match_number;
    mainRow.querySelector('.match-date').textContent = formatMatchTime(matchWithForm, currentTimezone);
    mainRow.querySelector('.match-group').textContent = matchWithForm.group || matchWithForm.stage;
    mainRow.querySelector('.match-teams').innerHTML = formatTeamsWithFlags(matchWithForm.team_a, matchWithForm.team_b);

    const scoreItem = scoreMap.get(matchWithForm.match_number);
    const officialItem = cachedScoreMap.get(matchWithForm.match_number);
    const existingPrediction = scoreItem?.prediction || null;
    const actualResult = scoreItem?.actual || null;
    const statusInfo = statusMap.get(matchWithForm.match_number);
    const isLocked = !unlockAllPredictions && (statusInfo?.isLocked || statusInfo?.hasStarted);

    if (existingPrediction) {
      scoreAInput.value = existingPrediction.teamAScore;
      scoreBInput.value = existingPrediction.teamBScore;
      if (penaltySelect) penaltySelect.value = existingPrediction.penaltyWinnerSide || '';
      if (penaltyToggle) syncPenaltyToggleUI(penaltyToggle, existingPrediction.penaltyWinnerSide || '');
      if (boostInput) boostInput.checked = Boolean(existingPrediction.goldenBootBoost);
    }

    actualCell.textContent = actualResult
      ? `${actualResult.teamAScore}:${actualResult.teamBScore}${actualResult.penaltyWinnerSide ? ` (Winner: ${actualResult.penaltyWinnerSide})` : ''}`
      : '-';

    const displayItem = officialItem && officialItem.points !== null ? officialItem : scoreItem;
    const pointsValue = displayItem?.points ?? 0;
    pointsCell.textContent = pointsValue > 0 ? `+${pointsValue}` : String(pointsValue);
    pointsCell.classList.remove('points-positive', 'points-negative', 'points-neutral');
    if (pointsValue > 0) pointsCell.classList.add('points-positive');
    else if (pointsValue < 0) pointsCell.classList.add('points-negative');
    else pointsCell.classList.add('points-neutral');

    const breakdownText = renderScoreBreakdown(scoreItem, officialItem);
    reasonCell.textContent = breakdownText;
    const pointsWrapCell = mainRow.querySelector('.member-points-cell');
    if (pointsWrapCell) pointsWrapCell.title = breakdownText;

    const refreshControls = () => updateKnockoutControls({
      match,
      scoreAInput,
      scoreBInput,
      controls: knockoutControls,
      penaltySelect,
      penaltyToggle,
      boostInput,
      existingPrediction,
      boostsRemaining
    });
    scoreAInput.addEventListener('input', refreshControls);
    scoreBInput.addEventListener('input', refreshControls);
    if (boostInput) boostInput.addEventListener('change', refreshControls);
    refreshControls();

    if (isLocked) {
      scoreAInput.disabled = true;
      scoreBInput.disabled = true;
      if (penaltySelect) penaltySelect.disabled = true;
      if (penaltyToggle) penaltyToggle.querySelectorAll('.penalty-btn').forEach((btn) => { btn.disabled = true; });
      if (boostInput) boostInput.disabled = true;
      mainRow.querySelectorAll('.stepper-btn').forEach((btn) => btn.remove());
      actionCell.innerHTML = '<div class="lock-badge-wrap"><span class="lock-badge">LOCKED</span></div>';
      mainRow.classList.add('row-locked');
    } else {
      const stepperA = mainRow.querySelector('.score-inputs .score-stepper:first-child');
      const stepperB = mainRow.querySelector('.score-inputs .score-stepper:last-child');
      if (stepperA) wireSteppers(stepperA, scoreAInput);
      if (stepperB) wireSteppers(stepperB, scoreBInput);

      const confirmButton = actionCell.querySelector('.confirm-btn');
      const clearButton = actionCell.querySelector('.clear-btn');

      confirmButton.addEventListener('click', async () => {
        const teamAScore = toIntOrNull(scoreAInput.value);
        const teamBScore = toIntOrNull(scoreBInput.value);
          const isKnockout = matchWithForm.stage !== 'Group Stage';
        const predictedDraw = teamAScore !== null && teamBScore !== null && teamAScore === teamBScore;
        const penaltyWinnerSide = isKnockout && predictedDraw ? penaltySelect?.value || null : null;
        const goldenBootBoost = isKnockout ? Boolean(boostInput?.checked) : false;

        if (teamAScore === null || teamBScore === null) {
          statusEl.textContent = 'enter 0-50';
          statusEl.classList.remove('status-ok');
          statusEl.classList.add('status-error');
          return;
        }
        if (isKnockout && predictedDraw && !penaltyWinnerSide) {
          statusEl.textContent = 'select penalty winner';
          statusEl.classList.remove('status-ok');
          statusEl.classList.add('status-error');
          return;
        }

        try {
          const payload = { teamAScore, teamBScore, penaltyWinnerSide, goldenBootBoost };
          if (existingPrediction) {
            await api(`/api/predictions/${matchWithForm.match_number}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            });
          } else {
            await api('/api/predictions', {
              method: 'POST',
              body: JSON.stringify({ matchNumber: matchWithForm.match_number, ...payload })
            });
          }

          statusEl.textContent = 'saved';
          statusEl.classList.remove('status-error');
          statusEl.classList.add('status-ok');

          await new Promise(resolve => setTimeout(resolve, 800));
          await renderPredictionsTable();
        } catch (error) {
          statusEl.textContent = error.message;
          statusEl.classList.remove('status-ok');
          statusEl.classList.add('status-error');
        }
      });

      clearButton.addEventListener('click', async () => {
        if (!existingPrediction) {
          scoreAInput.value = '';
          scoreBInput.value = '';
          if (penaltySelect) penaltySelect.value = '';
          if (penaltyToggle) syncPenaltyToggleUI(penaltyToggle, '');
          if (boostInput) boostInput.checked = false;
          refreshControls();
          statusEl.textContent = 'empty';
          statusEl.classList.remove('status-error');
          statusEl.classList.add('status-ok');
          return;
        }

        try {
          await api(`/api/predictions/${matchWithForm.match_number}`, { method: 'DELETE' });
          statusEl.textContent = 'deleted';
          statusEl.classList.remove('status-error');
          statusEl.classList.add('status-ok');
          await new Promise(resolve => setTimeout(resolve, 800));
          await renderPredictionsTable();
        } catch (error) {
          statusEl.textContent = error.message;
          statusEl.classList.remove('status-ok');
          statusEl.classList.add('status-error');
        }
      });
    }

    const expandBtn = mainRow.querySelector('.expand-btn');
    let detailRendered = false;

    expandBtn.addEventListener('click', () => {
      const expanded = expandBtn.classList.contains('expanded');
      if (!detailRendered) {
        detailRow.querySelector('.match-detail-cell').innerHTML = buildDetailPanel(matchWithForm);
        const peerPreviewContainer = detailRow.querySelector('[data-match-peer-preview]');
        if (peerPreviewContainer) {
          loadAndRenderMatchPeerPreview(peerPreviewContainer, matchWithForm).catch(() => {
            // Row-level errors are rendered in the preview container.
          });
        }
        detailRendered = true;
      }
      expandBtn.classList.toggle('expanded', !expanded);
      detailRow.classList.toggle('hidden', expanded);
    });

    matchesBody.appendChild(mainRow);
    matchesBody.appendChild(detailRow);
  }
}

function renderMemberLeaderboardRows(leaderboard) {
  if (!memberLeaderboardBody) return;
  memberLeaderboardBody.innerHTML = '';

  if (!leaderboard.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">No leaderboard data yet.</td>';
    memberLeaderboardBody.appendChild(row);
    return;
  }

  for (const entry of leaderboard) {
    const row = document.createElement('tr');
    if (entry.rank <= 3) row.classList.add(`leaderboard-rank-${entry.rank}`);
    if (entry.userId === sessionUser?.userId || entry.username === sessionUser?.username) {
      row.classList.add('leaderboard-current-user');
    }

    const rankCell = document.createElement('td');
    const rankBadge = document.createElement('span');
    rankBadge.className = `rank-badge rank-badge-${Math.min(entry.rank, 3)}`;
    rankBadge.textContent = entry.rank;
    rankCell.appendChild(rankBadge);
    row.appendChild(rankCell);
    appendTextCell(row, entry.username);
    appendTextCell(row, entry.totalPoints);
    appendTextCell(row, entry.exactCorrect);
    appendTextCell(row, entry.resultsCorrect);
    appendTextCell(row, entry.missedPredictions || 0);
    memberLeaderboardBody.appendChild(row);
  }
}

function createSvgNode(tagName, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function pointsToPath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function renderPointsChart(payload) {
  if (!memberPointsChart) return;
  memberPointsChart.innerHTML = '';

  const matches = payload.matches || [];
  const series = payload.series || [];
  if (!matches.length || !series.length) {
    const empty = document.createElement('p');
    empty.className = 'chart-empty-state';
    empty.textContent = 'No scored matches yet.';
    memberPointsChart.appendChild(empty);
    return;
  }

  const width = 760;
  const height = 360;
  const padding = { top: 32, right: 28, bottom: 48, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(5, ...series.flatMap((item) => item.points || [0]));
  const xForIndex = (index) => padding.left + (matches.length === 1 ? 0 : (index / (matches.length - 1)) * plotWidth);
  const yForPoints = (points) => padding.top + plotHeight - (points / maxPoints) * plotHeight;

  const svg = createSvgNode('svg', { viewBox: `0 0 ${width} ${height}`, class: 'points-chart-svg', role: 'presentation' });

  for (let step = 0; step <= 4; step += 1) {
    const y = padding.top + (step / 4) * plotHeight;
    const value = Math.round(maxPoints - (step / 4) * maxPoints);
    svg.appendChild(createSvgNode('line', { x1: padding.left, y1: y, x2: width - padding.right, y2: y, class: 'chart-grid-line' }));
    const label = createSvgNode('text', { x: padding.left - 10, y: y + 4, class: 'chart-axis-label', 'text-anchor': 'end' });
    label.textContent = value;
    svg.appendChild(label);
  }

  svg.appendChild(createSvgNode('line', { x1: padding.left, y1: padding.top, x2: padding.left, y2: height - padding.bottom, class: 'chart-axis-line' }));
  svg.appendChild(createSvgNode('line', { x1: padding.left, y1: height - padding.bottom, x2: width - padding.right, y2: height - padding.bottom, class: 'chart-axis-line' }));

  const tickIndexes = Array.from(new Set([0, Math.floor((matches.length - 1) / 2), matches.length - 1]));
  for (const index of tickIndexes) {
    const x = xForIndex(index);
    const label = createSvgNode('text', { x, y: height - 20, class: 'chart-axis-label', 'text-anchor': 'middle' });
    label.textContent = matches[index].matchNumber;
    svg.appendChild(label);
  }

  const legend = createSvgNode('g', { class: 'chart-legend' });
  series.forEach((item, index) => {
    const x = padding.left + index * 112;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    legend.appendChild(createSvgNode('rect', { x, y: 8, width: 12, height: 12, rx: 2, fill: color }));
    const label = createSvgNode('text', { x: x + 18, y: 18, class: 'chart-legend-label' });
    label.textContent = item.username;
    legend.appendChild(label);
  });
  svg.appendChild(legend);

  series.forEach((item, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const chartPoints = (item.points || []).map((points, pointIndex) => ({ x: xForIndex(pointIndex), y: yForPoints(points) }));
    if (!chartPoints.length) return;

    const areaPath = `${pointsToPath(chartPoints)} L ${chartPoints[chartPoints.length - 1].x} ${height - padding.bottom} L ${chartPoints[0].x} ${height - padding.bottom} Z`;
    svg.appendChild(createSvgNode('path', { d: areaPath, fill: color, opacity: 0.12 }));
    svg.appendChild(createSvgNode('path', { d: pointsToPath(chartPoints), fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  });

  const xLabel = createSvgNode('text', { x: padding.left + plotWidth / 2, y: height - 4, class: 'chart-axis-title', 'text-anchor': 'middle' });
  xLabel.textContent = 'Match';
  svg.appendChild(xLabel);

  memberPointsChart.appendChild(svg);
}

async function renderMemberInsights() {
  if (!memberPointsChart || !memberInsightsStatus) return;
  memberInsightsStatus.textContent = '';
  memberInsightsStatus.classList.remove('status-error', 'status-ok');

  try {
    const payload = await api('/api/member/insights/points-chart');
    if (memberInsightsTitle) {
      const leagueName = payload.league?.name || sessionUser?.leagueName || 'League';
      memberInsightsTitle.textContent = `Points Table : ${leagueName}`;
    }
    renderPointsChart(payload);
    if (payload.officialStatus === 'preview') {
      memberInsightsStatus.textContent = 'Live preview';
      memberInsightsStatus.classList.add('status-ok');
    }
  } catch (error) {
    memberInsightsStatus.textContent = error.message;
    memberInsightsStatus.classList.add('status-error');
    renderPointsChart({ matches: [], series: [] });
  }
}

function renderPeerPredictionRows(predictions) {
  if (!memberPeerPredictionsBody) return;
  memberPeerPredictionsBody.innerHTML = '';

  if (!predictions.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3">No predictions found.</td>';
    memberPeerPredictionsBody.appendChild(row);
    return;
  }

  for (const prediction of predictions) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${prediction.matchNumber} (${prediction.group || '-'})</td>
      <td>${formatTeamsWithFlags(prediction.teamA || 'TBD', prediction.teamB || 'TBD')}</td>
      <td>${prediction.teamAScore}:${prediction.teamBScore}</td>
    `;
    memberPeerPredictionsBody.appendChild(row);
  }
}

async function renderPeerPredictionsForSelectedMember() {
  if (!memberPeerSelect || !memberPeerStatus) return;

  const selectedUserId = Number(memberPeerSelect.value);
  if (!Number.isInteger(selectedUserId) || selectedUserId <= 0) {
    renderPeerPredictionRows([]);
    return;
  }

  memberPeerStatus.textContent = '';
  memberPeerStatus.classList.remove('status-error', 'status-ok');

  try {
    const limit = memberPeerShowAll ? 'all' : String(PEER_PREDICTION_LATEST_LIMIT);
    const payload = await api(`/api/member/peers/${selectedUserId}/predictions?limit=${limit}`);
    const totalPredictions = Number(payload.totalPredictions || 0);
    const visiblePredictions = Number(payload.predictions?.length || 0);
    renderPeerPredictionRows(payload.predictions || []);
    if (memberPeerToggle) {
      const canExpand = totalPredictions > PEER_PREDICTION_LATEST_LIMIT;
      memberPeerToggle.hidden = !canExpand;
      memberPeerToggle.textContent = memberPeerShowAll ? 'Show latest 10' : 'Show all';
    }
    if (totalPredictions > visiblePredictions) {
      memberPeerStatus.textContent = `Showing latest ${visiblePredictions} of ${totalPredictions}.`;
      memberPeerStatus.classList.add('status-ok');
    } else if (memberPeerShowAll && totalPredictions > PEER_PREDICTION_LATEST_LIMIT) {
      memberPeerStatus.textContent = `Showing all ${totalPredictions}.`;
      memberPeerStatus.classList.add('status-ok');
    }
  } catch (error) {
    memberPeerStatus.textContent = error.message;
    memberPeerStatus.classList.add('status-error');
    renderPeerPredictionRows([]);
  }
}

async function renderMemberLeaderboardAndPeers() {
  if (!memberLeaderboardBody || !memberPeerSelect || !memberPeerStatus || !memberPeerPredictionsBody) return;

  memberPeerStatus.textContent = '';
  memberPeerStatus.classList.remove('status-error', 'status-ok');

  try {
    const [leaderboardPayload, peersPayload] = await Promise.all([
      api('/api/member/leaderboard'),
      api('/api/member/peers')
    ]);

    renderMemberLeaderboardRows(leaderboardPayload.leaderboard || []);
    if (memberLeaderboardTitle) {
      const leagueName = leaderboardPayload.league?.name || peersPayload.league?.name || sessionUser?.leagueName || 'Unassigned';
      memberLeaderboardTitle.textContent = `League Leaderboard : ${leagueName}`;
    }

    memberPeersData = peersPayload.members || [];
    memberPeerSelect.innerHTML = '';
    for (const member of memberPeersData) {
      const option = document.createElement('option');
      option.value = String(member.id);
      option.textContent = member.username;
      memberPeerSelect.appendChild(option);
    }

    const preferredUserId = Number(sessionUser?.userId);
    if (Number.isInteger(preferredUserId) && memberPeersData.some((member) => member.id === preferredUserId)) {
      memberPeerSelect.value = String(preferredUserId);
    }

    await renderPeerPredictionsForSelectedMember();
  } catch (error) {
    memberPeerStatus.textContent = error.message;
    memberPeerStatus.classList.add('status-error');
    renderMemberLeaderboardRows([]);
    renderPeerPredictionRows([]);
  }
}

function setMemberScreen(screenName) {
  memberActiveScreen = ['predictions', 'league', 'insights'].includes(screenName) ? screenName : 'predictions';
  const showingPredictions = memberActiveScreen === 'predictions';
  const showingLeague = memberActiveScreen === 'league';
  const showingInsights = memberActiveScreen === 'insights';

  if (memberTabPredictions) {
    memberTabPredictions.classList.toggle('active', showingPredictions);
    memberTabPredictions.setAttribute('aria-selected', String(showingPredictions));
  }
  if (memberTabLeague) {
    memberTabLeague.classList.toggle('active', showingLeague);
    memberTabLeague.setAttribute('aria-selected', String(showingLeague));
  }
  if (memberTabInsights) {
    memberTabInsights.classList.toggle('active', showingInsights);
    memberTabInsights.setAttribute('aria-selected', String(showingInsights));
  }
  if (memberPredictionsScreen) {
    memberPredictionsScreen.classList.toggle('hidden', !showingPredictions);
  }
  if (memberLeagueScreen) {
    memberLeagueScreen.classList.toggle('hidden', !showingLeague);
  }
  if (memberInsightsScreen) {
    memberInsightsScreen.classList.toggle('hidden', !showingInsights);
  }
}

function updateAdminResultModifiers({ match, scoreAInput, scoreBInput, modifiers, penaltySelect }) {
  const isKnockout = match.stage !== 'Group Stage';
  if (!modifiers) return;
  modifiers.classList.toggle('hidden', !isKnockout);
  if (!isKnockout) {
    if (penaltySelect) penaltySelect.value = '';
    return;
  }

  const teamAScore = toIntOrNull(scoreAInput.value);
  const teamBScore = toIntOrNull(scoreBInput.value);
  const tiedResult = teamAScore !== null && teamBScore !== null && teamAScore === teamBScore;
  if (penaltySelect) {
    penaltySelect.disabled = !tiedResult;
    penaltySelect.closest('.admin-penalty-winner-control')?.classList.toggle('control-required', tiedResult);
    if (!tiedResult) penaltySelect.value = '';
  }
}

async function renderAdminTable() {
  const [matchesResult, resultsResult, statusResult] = await Promise.all([
    api('/api/matches'),
    api('/api/admin/results'),
    api('/api/matches/status')
  ]);

  adminUnlockAllPredictionsEnabled = Boolean(statusResult.unlockAllPredictions);
  renderAdminUnlockToggleButton();

  const resultMap = new Map(
    resultsResult.results.map((result) => [
      result.matchNumber,
      {
        teamAScore: result.teamAScore,
        teamBScore: result.teamBScore,
        penaltyWinnerSide: result.penaltyWinnerSide || null,
        underdogWinnerSide: result.underdogWinnerSide || null
      }
    ])
  );

  adminMatchesBody.innerHTML = '';
  let currentStage = '';

  for (const match of matchesResult.matches) {
    if (match.stage !== currentStage) {
      currentStage = match.stage;
      const stageRow = document.createElement('tr');
      stageRow.className = 'stage-divider-row';
      stageRow.innerHTML = `<td colspan="7">${currentStage}</td>`;
      adminMatchesBody.appendChild(stageRow);
    }

    const row = adminRowTemplate.content.firstElementChild.cloneNode(true);
    const scoreAInput = row.querySelector('.score-a');
    const scoreBInput = row.querySelector('.score-b');
    const statusEl = row.querySelector('.confirm-status');
    const clearButton = row.querySelector('.clear-btn');
    const adminStatusCell = row.querySelector('.admin-status-cell');
    const modifiers = row.querySelector('[data-admin-modifiers]');
    const penaltySelect = row.querySelector('.admin-penalty-winner-side');
    const underdogSelect = row.querySelector('.admin-underdog-winner-side');

    row.querySelector('.match-number').textContent = match.match_number;
    row.querySelector('.match-date').textContent = `${formatDate(match.date)} ${match.time_et} ET`;
    row.querySelector('.match-group').textContent = match.group || match.stage;
    row.querySelector('.match-teams').innerHTML = formatTeamsWithFlags(match.team_a, match.team_b);

    const existing = resultMap.get(match.match_number);
    adminStatusCell.innerHTML = existing
      ? '<span class="admin-status-tag admin-status-active">Concluded</span>'
      : '<span class="admin-status-tag admin-status-pending">Pending Results</span>';

    if (existing) {
      scoreAInput.value = existing.teamAScore;
      scoreBInput.value = existing.teamBScore;
      if (penaltySelect) penaltySelect.value = existing.penaltyWinnerSide || '';
      if (underdogSelect) underdogSelect.value = existing.underdogWinnerSide || '';
      statusEl.textContent = 'saved';
      statusEl.classList.add('status-ok');
    }

    const refreshModifiers = () => updateAdminResultModifiers({ match, scoreAInput, scoreBInput, modifiers, penaltySelect });
    scoreAInput.addEventListener('input', refreshModifiers);
    scoreBInput.addEventListener('input', refreshModifiers);
    refreshModifiers();

    row.querySelector('.confirm-btn').addEventListener('click', async () => {
      const teamAScore = toIntOrNull(scoreAInput.value);
      const teamBScore = toIntOrNull(scoreBInput.value);
      const isKnockout = match.stage !== 'Group Stage';
      const tiedResult = teamAScore !== null && teamBScore !== null && teamAScore === teamBScore;
      const penaltyWinnerSide = isKnockout && tiedResult ? penaltySelect?.value || null : null;
      const underdogWinnerSide = isKnockout ? underdogSelect?.value || null : null;

      if (teamAScore === null || teamBScore === null) {
        statusEl.textContent = 'enter 0-50';
        statusEl.classList.remove('status-ok');
        statusEl.classList.add('status-error');
        return;
      }
      if (isKnockout && tiedResult && !penaltyWinnerSide) {
        statusEl.textContent = 'Penalty winner required for tied knockout result.';
        statusEl.classList.remove('status-ok');
        statusEl.classList.add('status-error');
        return;
      }

      const payload = { teamAScore, teamBScore, penaltyWinnerSide, underdogWinnerSide };

      try {
        if (resultMap.has(match.match_number)) {
          await api(`/api/admin/results/${match.match_number}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
        } else {
          await api('/api/admin/results', {
            method: 'POST',
            body: JSON.stringify({ matchNumber: match.match_number, ...payload })
          });
        }

        statusEl.textContent = underdogWinnerSide
          ? 'saved - underdog bonus applies only if flagged side advances'
          : 'saved';
        statusEl.classList.remove('status-error');
        statusEl.classList.add('status-ok');
        await renderAdminTable();
      } catch (error) {
        statusEl.textContent = error.message;
        statusEl.classList.remove('status-ok');
        statusEl.classList.add('status-error');
      }
    });

    clearButton.addEventListener('click', async () => {
      if (!resultMap.has(match.match_number)) {
        scoreAInput.value = '';
        scoreBInput.value = '';
        if (penaltySelect) penaltySelect.value = '';
        if (underdogSelect) underdogSelect.value = '';
        refreshModifiers();
        statusEl.textContent = 'empty';
        statusEl.classList.remove('status-error');
        statusEl.classList.add('status-ok');
        return;
      }

      try {
        await api(`/api/admin/results/${match.match_number}`, { method: 'DELETE' });
        statusEl.textContent = 'deleted';
        statusEl.classList.remove('status-error');
        statusEl.classList.add('status-ok');
        await renderAdminTable();
      } catch (error) {
        statusEl.textContent = error.message;
        statusEl.classList.remove('status-ok');
        statusEl.classList.add('status-error');
      }
    });

    adminMatchesBody.appendChild(row);
  }

  kpiMatches.textContent = String(matchesResult.matches.length);
  kpiStatus.textContent = 'Active';
}
function setAdminScreen(screen) {
  adminActiveScreen = screen === 'leagues-users' ? 'leagues-users' : 'matches';
  if (adminMatchesScreen) {
    adminMatchesScreen.classList.toggle('hidden', adminActiveScreen !== 'matches');
  }
  if (adminLeaguesUsersScreen) {
    adminLeaguesUsersScreen.classList.toggle('hidden', adminActiveScreen !== 'leagues-users');
  }
  if (adminNavMatches) {
    adminNavMatches.classList.toggle('active', adminActiveScreen === 'matches');
  }
  if (adminNavLeaguesUsers) {
    adminNavLeaguesUsers.classList.toggle('active', adminActiveScreen === 'leagues-users');
  }
}

function setAdminLeagueStatus(message, isError = false) {
  if (!adminLeagueStatus) return;
  adminLeagueStatus.textContent = message;
  adminLeagueStatus.classList.toggle('status-error', isError);
  adminLeagueStatus.classList.toggle('status-ok', !isError && Boolean(message));
}

function setAdminMatchStatus(message, isError = false) {
  if (!adminMatchStatus) return;
  adminMatchStatus.textContent = message;
  adminMatchStatus.classList.toggle('status-error', isError);
  adminMatchStatus.classList.toggle('status-ok', !isError && Boolean(message));
}

function renderAdminUnlockToggleButton() {
  if (!adminUnlockAllScoresButton) return;
  const icon = adminUnlockAllPredictionsEnabled ? '🔓' : '🔒';
  const label = adminUnlockAllPredictionsEnabled ? 'Unlocked (click to lock)' : 'Locked (click to unlock)';
  adminUnlockAllScoresButton.textContent = `${icon} ${label}`;
  adminUnlockAllScoresButton.classList.toggle('admin-toggle-unlocked', adminUnlockAllPredictionsEnabled);
  adminUnlockAllScoresButton.classList.toggle('admin-toggle-locked', !adminUnlockAllPredictionsEnabled);
}

function buildSelectOptions(selectEl, options, valueKey, labelBuilder) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  for (const option of options) {
    const el = document.createElement('option');
    el.value = String(option[valueKey]);
    el.textContent = labelBuilder(option);
    selectEl.appendChild(el);
  }
}

function appendTextCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value == null || value === '' ? '-' : String(value);
  row.appendChild(cell);
  return cell;
}

async function renderLeagueAdminPanel() {
  if (!adminLeaguesBody || !adminUsersBody || !adminMemberSelect || !adminLeagueSelect) return;

  const [leaguesResult, usersResult] = await Promise.all([
    api('/api/admin/leagues'),
    api('/api/admin/users')
  ]);

  const users = usersResult.users || [];
  const members = users.filter((user) => user.role === 'member');

  adminLeagueData = {
    leagues: leaguesResult.leagues || [],
    members,
    users
  };

  if (kpiMembers) {
    kpiMembers.textContent = String(adminLeagueData.members.length);
  }

  adminLeaguesBody.innerHTML = '';
  for (const league of adminLeagueData.leagues) {
    const row = document.createElement('tr');
    const destinationOptions = adminLeagueData.leagues.filter((item) => item.id !== league.id);
    const destinationSelect = document.createElement('select');
    destinationSelect.className = 'admin-row-select';
    destinationSelect.disabled = league.memberCount === 0 || destinationOptions.length === 0;
    for (const destination of destinationOptions) {
      const option = document.createElement('option');
      option.value = String(destination.id);
      option.textContent = `${destination.name} (${destination.memberCount} members)`;
      destinationSelect.appendChild(option);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.disabled = adminLeagueData.leagues.length <= 1;
    deleteButton.addEventListener('click', async () => {
      await handleAdminLeagueDelete(league, destinationSelect.value);
    });

    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    if (league.memberCount > 0) actions.appendChild(destinationSelect);
    actions.appendChild(deleteButton);

    appendTextCell(row, league.name);
    appendTextCell(row, league.memberCount);
    const actionCell = document.createElement('td');
    actionCell.appendChild(actions);
    row.appendChild(actionCell);
    adminLeaguesBody.appendChild(row);
  }

  adminUsersBody.innerHTML = '';
  const adminCount = adminLeagueData.users.filter((user) => user.role === 'admin').length;
  for (const user of adminLeagueData.users) {
    const row = document.createElement('tr');
    const resetCell = document.createElement('td');
    const actionCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const resetWrap = document.createElement('div');
    resetWrap.className = 'admin-actions';
    const resetInput = document.createElement('input');
    resetInput.type = 'password';
    resetInput.placeholder = 'New password';
    resetInput.className = 'admin-row-select';
    const resetConfirmInput = document.createElement('input');
    resetConfirmInput.type = 'password';
    resetConfirmInput.placeholder = 'Confirm';
    resetConfirmInput.className = 'admin-row-select';
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'btn btn-secondary';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', async () => {
      await handleAdminPasswordReset(user, resetInput.value.trim(), resetConfirmInput.value.trim());
      resetInput.value = '';
      resetConfirmInput.value = '';
    });
    resetWrap.appendChild(resetInput);
    resetWrap.appendChild(resetConfirmInput);
    resetWrap.appendChild(resetButton);

    if (user.role === 'member') {
      const leagueSelect = document.createElement('select');
      leagueSelect.className = 'admin-row-select';
      for (const league of adminLeagueData.leagues) {
        const option = document.createElement('option');
        option.value = String(league.id);
        option.textContent = league.name;
        leagueSelect.appendChild(option);
      }
      if (user.leagueId) leagueSelect.value = String(user.leagueId);

      const reassignButton = document.createElement('button');
      reassignButton.type = 'button';
      reassignButton.className = 'btn btn-secondary';
      reassignButton.textContent = 'Reassign';
      reassignButton.addEventListener('click', async () => {
        await handleAdminUserReassign(user, leagueSelect.value);
      });
      actions.appendChild(leagueSelect);
      actions.appendChild(reassignButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.disabled = user.id === sessionUser?.userId || (user.role === 'admin' && adminCount <= 1);
    deleteButton.addEventListener('click', async () => {
      await handleAdminUserDelete(user);
    });
    actions.appendChild(deleteButton);
    actionCell.appendChild(actions);

    appendTextCell(row, user.username);
    appendTextCell(row, user.alias);
    appendTextCell(row, user.phone);
    appendTextCell(row, user.role);
    appendTextCell(row, user.leagueName);
    resetCell.appendChild(resetWrap);
    row.appendChild(resetCell);
    row.appendChild(actionCell);
    adminUsersBody.appendChild(row);
  }

  buildSelectOptions(
    adminMemberSelect,
    adminLeagueData.members,
    'id',
    (member) => `${member.username}${member.leagueName ? ` (${member.leagueName})` : ''}`
  );
  buildSelectOptions(adminLeagueSelect, adminLeagueData.leagues, 'id', (league) => league.name);
}

async function handleAdminLeagueDelete(league, destinationLeagueId) {
  setAdminLeagueStatus('');
  if (adminLeagueData.leagues.length <= 1) {
    setAdminLeagueStatus('Cannot delete the last league.', true);
    return;
  }

  const query = league.memberCount > 0 ? `?moveUsersTo=${encodeURIComponent(destinationLeagueId)}` : '';
  const confirmed = window.confirm(
    league.memberCount > 0
      ? `Delete ${league.name} and move ${league.memberCount} members to the selected league?`
      : `Delete ${league.name}?`
  );
  if (!confirmed) return;

  try {
    await api(`/api/admin/leagues/${league.id}${query}`, { method: 'DELETE' });
    setAdminLeagueStatus('League deleted.');
    await renderLeagueAdminPanel();
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function handleAdminUserDelete(user) {
  setAdminLeagueStatus('');
  const confirmed = window.confirm(`Permanently delete ${user.username} and all prediction records?`);
  if (!confirmed) return;

  try {
    await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setAdminLeagueStatus(`Deleted ${user.username}.`);
    await renderLeagueAdminPanel();
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function handleAdminUserReassign(user, leagueIdValue) {
  setAdminLeagueStatus('');
  const leagueId = Number(leagueIdValue);
  if (!Number.isInteger(leagueId)) {
    setAdminLeagueStatus('Select a league first.', true);
    return;
  }

  try {
    const result = await api(`/api/admin/members/${user.id}/league`, {
      method: 'PUT',
      body: JSON.stringify({ leagueId })
    });
    setAdminLeagueStatus(`${user.username} assigned to ${result.leagueName}.`);
    await renderLeagueAdminPanel();
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function handleAdminLeagueCreate(event) {
  event.preventDefault();
  setAdminLeagueStatus('');

  const name = (adminLeagueNameInput?.value || '').trim();
  if (!name) {
    setAdminLeagueStatus('Enter a league name.', true);
    return;
  }

  try {
    await api('/api/admin/leagues', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    adminLeagueCreateForm.reset();
    setAdminLeagueStatus('League created.');
    await renderLeagueAdminPanel();
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function handleAdminMemberAssign(event) {
  event.preventDefault();
  setAdminLeagueStatus('');

  const userId = Number(adminMemberSelect?.value);
  const leagueId = Number(adminLeagueSelect?.value);
  if (!Number.isInteger(userId) || !Number.isInteger(leagueId)) {
    setAdminLeagueStatus('Select member and league first.', true);
    return;
  }

  try {
    const result = await api(`/api/admin/members/${userId}/league`, {
      method: 'PUT',
      body: JSON.stringify({ leagueId })
    });
    setAdminLeagueStatus(`Assigned to ${result.leagueName}.`);
    await renderLeagueAdminPanel();
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function handleAdminUnlockAllScores() {
  const enabling = !adminUnlockAllPredictionsEnabled;
  const confirmed = window.confirm(
    enabling
      ? 'Enable unlock-all for members? This keeps actual results unchanged and allows members to edit completed/locked matches.'
      : 'Switch back to locked mode? Members will no longer be able to edit completed/locked matches.'
  );
  if (!confirmed) return;

  setAdminMatchStatus('');

  try {
    const result = await api('/api/admin/predictions-lock', {
      method: 'PUT',
      body: JSON.stringify({ enabled: enabling })
    });
    adminUnlockAllPredictionsEnabled = Boolean(result.unlockAllPredictions);
    renderAdminUnlockToggleButton();
    setAdminMatchStatus(
      adminUnlockAllPredictionsEnabled
        ? `Unlocked mode enabled. Members can edit completed matches (${result.lockedMatches || 0} currently locked).`
        : `Locked mode enabled. Completed matches are protected again (${result.lockedMatches || 0} currently locked).`
    );
    await renderAdminTable();
  } catch (error) {
    setAdminMatchStatus(error.message, true);
  }
}

function startAdminClock() {
  if (adminClockTimer) clearInterval(adminClockTimer);

  const tick = () => {
    if (!adminDateTime) return;
    adminDateTime.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date());
  };

  tick();
  adminClockTimer = setInterval(tick, 60000);
}

async function renderLanding() {
  hideAllViews();
  stopTimers();
  landingView.classList.remove('hidden');
  renderHostCities();
  renderPublicFixtures();
}

async function renderLogin() {
  hideAllViews();
  stopTimers();
  loginError.textContent = '';
  loginView.classList.remove('hidden');
}

async function renderSignup() {
  hideAllViews();
  stopTimers();
  signupStatus.textContent = '';
  signupView.classList.remove('hidden');
}

async function renderMember() {
  if (!sessionUser || sessionUser.role !== 'member') {
    navigate(ROUTES.login);
    return;
  }

  hideAllViews();
  stopTimers();
  predictionsView.classList.remove('hidden');
  if (!memberActiveScreen) {
    memberActiveScreen = 'predictions';
  }
  setMemberScreen(memberActiveScreen);
  welcomeText.textContent = `Logged in as ${sessionUser.username}. Submit predictions before the match.`;
  await Promise.all([
    renderPredictionsTable(),
    renderMemberLeaderboardAndPeers(),
    renderMemberInsights()
  ]);
}

async function renderAdmin() {
  if (!sessionUser || sessionUser.role !== 'admin') {
    navigate(ROUTES.login);
    return;
  }
  hideAllViews();
  adminView.classList.remove('hidden');
  adminWelcomeText.textContent = `Welcome ${sessionUser.username}. Manage fixtures and results.`;
  setAdminScreen(adminActiveScreen);
  startAdminClock();
  await Promise.all([renderAdminTable(), renderLeagueAdminPanel()]);
}

async function renderRoute() {
  const route = currentRoute();

  if (route === ROUTES.landing) {
    await renderLanding();
    return;
  }

  if (route === ROUTES.login) {
    await renderLogin();
    return;
  }

  if (route === ROUTES.signup) {
    await renderSignup();
    return;
  }

  if (route === ROUTES.member) {
    await renderMember();
    return;
  }

  if (route === ROUTES.admin) {
    await renderAdmin();
    return;
  }

  navigate(ROUTES.landing);
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.textContent = '';

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    loginError.textContent = 'Enter both username and password.';
    return;
  }

  try {
    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    sessionUser = {
      userId: result.userId || null,
      username: result.username,
      role: result.role,
      timezone: result.timezone || 'America/New_York',
      leagueId: result.leagueId || null,
      leagueName: result.leagueName || null
    };

    if (result.role === 'member' && ALLOWED_TIMEZONES.includes(sessionUser.timezone)) {
      currentTimezone = sessionUser.timezone;
      timezoneSelect.value = currentTimezone;
    }

    navigate(result.role === 'admin' ? ROUTES.admin : ROUTES.member);
  } catch (error) {
    loginError.textContent = error.message;
  }
}

async function handleSignup(event) {
  event.preventDefault();
  signupStatus.textContent = '';

  const username = signupUsernameInput.value.trim();
  const password = signupPasswordInput.value.trim();
  const confirmPassword = signupConfirmPasswordInput.value.trim();

  if (!username || !password || !confirmPassword) {
    signupStatus.textContent = 'All fields are required.';
    return;
  }

  try {
    await api('/api/member/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, confirmPassword })
    });
    signupStatus.textContent = 'Account created. You can now sign in with your password.';
    signupStatus.classList.remove('status-error');
    signupStatus.classList.add('status-ok');
    signupForm.reset();
    navigate(ROUTES.login);
    usernameInput.value = username;
    loginError.textContent = 'Account created. Sign in with your username and password.';
  } catch (error) {
    signupStatus.textContent = error.message;
    signupStatus.classList.remove('status-ok');
    signupStatus.classList.add('status-error');
  }
}

async function handleLogout() {
  try {
    await api('/api/logout', { method: 'POST' });
  } finally {
    sessionUser = null;
    currentTimezone = 'America/New_York';
    loginForm.reset();
    navigate(ROUTES.landing);
  }
}

async function handleMemberPasswordUpdate(event) {
  event.preventDefault();
  if (!memberPasswordStatus) return;

  memberPasswordStatus.textContent = '';
  memberPasswordStatus.classList.remove('status-error', 'status-ok');

  const currentPassword = memberCurrentPasswordInput?.value?.trim() || '';
  const newPassword = memberNewPasswordInput?.value?.trim() || '';
  const confirmNewPassword = memberConfirmPasswordInput?.value?.trim() || '';

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    memberPasswordStatus.textContent = 'All password fields are required.';
    memberPasswordStatus.classList.add('status-error');
    return;
  }

  try {
    await api('/api/member/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
    });
    memberPasswordForm.reset();
    memberPasswordStatus.textContent = 'Password updated.';
    memberPasswordStatus.classList.add('status-ok');
  } catch (error) {
    memberPasswordStatus.textContent = error.message;
    memberPasswordStatus.classList.add('status-error');
  }
}

async function handleAdminPasswordReset(user, newPassword, confirmNewPassword) {
  if (!newPassword || !confirmNewPassword) {
    setAdminLeagueStatus('Enter and confirm a password first.', true);
    return;
  }

  try {
    await api(`/api/admin/users/${user.id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword, confirmNewPassword })
    });
    setAdminLeagueStatus(`Password reset for ${user.username}.`);
  } catch (error) {
    setAdminLeagueStatus(error.message, true);
  }
}

async function hydrateSchedule() {
  const response = await fetch('/world-cup-2026-schedule.json');
  if (!response.ok) throw new Error('Unable to load schedule data');
  const payload = await response.json();
  scheduleCache = payload.matches || [];
}

async function restoreSession() {
  try {
    const session = await api('/api/session');
    sessionUser = {
      userId: session.userId,
      username: session.username,
      role: session.role,
      timezone: session.timezone || 'America/New_York',
      leagueId: session.leagueId || null,
      leagueName: session.leagueName || null
    };

    if (sessionUser.role === 'member' && ALLOWED_TIMEZONES.includes(sessionUser.timezone)) {
      currentTimezone = sessionUser.timezone;
      timezoneSelect.value = currentTimezone;
    }
  } catch {
    sessionUser = null;
  }
}

async function start() {
  // Restore timezone from cookie for unauthenticated landing page use
  currentTimezone = loadPublicTimezone();
  syncTimezoneControls();

  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  if (memberPasswordForm) {
    memberPasswordForm.addEventListener('submit', handleMemberPasswordUpdate);
  }
  logoutButton.addEventListener('click', handleLogout);
  adminLogoutButton.addEventListener('click', handleLogout);
  if (scoringRulesButton) {
    scoringRulesButton.addEventListener('click', openScoringRulesModal);
  }
  if (scoringRulesClose) {
    scoringRulesClose.addEventListener('click', closeScoringRulesModal);
  }
  if (scoringRulesModal) {
    scoringRulesModal.addEventListener('click', (e) => {
      if (e.target === scoringRulesModal) closeScoringRulesModal();
    });
  }
  cityModalClose.addEventListener('click', closeCityModal);
  cityModal.addEventListener('click', (e) => {
    if (e.target === cityModal) closeCityModal();
  });
  if (matchPeersModalClose) {
    matchPeersModalClose.addEventListener('click', closeMatchPeersModal);
  }
  if (matchPeersModal) {
    matchPeersModal.addEventListener('click', (e) => {
      if (e.target === matchPeersModal) closeMatchPeersModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCityModal();
    if (e.key === 'Escape') closeScoringRulesModal();
    if (e.key === 'Escape') closeMatchPeersModal();
  });
  if (adminLeagueCreateForm) {
    adminLeagueCreateForm.addEventListener('submit', handleAdminLeagueCreate);
  }
  if (adminMemberAssignForm) {
    adminMemberAssignForm.addEventListener('submit', handleAdminMemberAssign);
  }
  if (adminNavMatches) {
    adminNavMatches.addEventListener('click', (event) => {
      event.preventDefault();
      setAdminScreen('matches');
    });
  }
  if (adminNavLeaguesUsers) {
    adminNavLeaguesUsers.addEventListener('click', (event) => {
      event.preventDefault();
      setAdminScreen('leagues-users');
      renderLeagueAdminPanel().catch((error) => setAdminLeagueStatus(error.message, true));
    });
  }
  if (adminUnlockAllScoresButton) {
    adminUnlockAllScoresButton.addEventListener('click', () => {
      handleAdminUnlockAllScores().catch((error) => setAdminMatchStatus(error.message, true));
    });
  }
  if (memberPeerSelect) {
    memberPeerSelect.addEventListener('change', () => {
      memberPeerShowAll = false;
      renderPeerPredictionsForSelectedMember().catch((error) => {
        if (memberPeerStatus) {
          memberPeerStatus.textContent = error.message;
          memberPeerStatus.classList.add('status-error');
        }
      });
    });
  }
  if (memberPeerToggle) {
    memberPeerToggle.addEventListener('click', () => {
      memberPeerShowAll = !memberPeerShowAll;
      renderPeerPredictionsForSelectedMember().catch((error) => {
        if (memberPeerStatus) {
          memberPeerStatus.textContent = error.message;
          memberPeerStatus.classList.add('status-error');
        }
      });
    });
  }
  if (memberTabPredictions) {
    memberTabPredictions.addEventListener('click', () => setMemberScreen('predictions'));
  }
  if (memberTabLeague) {
    memberTabLeague.addEventListener('click', () => setMemberScreen('league'));
  }
  if (memberTabInsights) {
    memberTabInsights.addEventListener('click', () => setMemberScreen('insights'));
  }
  window.addEventListener('hashchange', () => {
    renderRoute().catch((error) => {
      loginError.textContent = `Failed to render route: ${error.message}`;
    });
  });

  timezoneSelect.addEventListener('change', async () => {
    const tz = timezoneSelect.value;
    if (!ALLOWED_TIMEZONES.includes(tz)) return;

    currentTimezone = tz;
    try {
      await api('/api/member/timezone', {
        method: 'PUT',
        body: JSON.stringify({ timezone: tz })
      });
    } catch {
      // Non-fatal for UI render
    }

    if (currentRoute() === ROUTES.member) {
      await renderPredictionsTable();
    }
  });

  if (landingTimezoneSelect) {
    landingTimezoneSelect.addEventListener('change', () => {
      const tz = landingTimezoneSelect.value;
      if (!ALLOWED_TIMEZONES.includes(tz)) return;
      currentTimezone = tz;
      savePublicTimezone(tz);
      syncTimezoneControls();
      renderPublicFixtures();
      renderHostCities();
    });
  }

  await hydrateSchedule();
  await restoreSession();

  if (!window.location.hash) {
    navigate(ROUTES.landing);
  }

  const route = currentRoute();
  if (sessionUser?.role === 'member' && route === ROUTES.login) {
    navigate(ROUTES.member);
    return;
  }
  if (sessionUser?.role === 'admin' && (route === ROUTES.login || route === ROUTES.member)) {
    navigate(ROUTES.admin);
    return;
  }

  await renderRoute();
}

start().catch((error) => {
  loginError.textContent = `Failed to initialize app: ${error.message}`;
});
