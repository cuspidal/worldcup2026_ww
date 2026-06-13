const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

function run(db, sql, params = []) {
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

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function addColumnIfMissing(db, tableName, columnDefinition) {
  await run(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });
}

async function initDatabase(dbFile) {
  const defaultPath = path.join(__dirname, 'data', 'predictions.db');
  const filePath = dbFile || process.env.DB_FILE || defaultPath;

  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const db = new sqlite3.Database(filePath);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member'
    )`
  );

  await run(db, `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(db, `ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York'`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(db, `ALTER TABLE users ADD COLUMN alias TEXT`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(db, `ALTER TABLE users ADD COLUMN phone_e164 TEXT`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(db, `ALTER TABLE users ADD COLUMN password_login_enabled INTEGER NOT NULL DEFAULT 1`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(db, `ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1`).catch((error) => {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  });

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_number INTEGER NOT NULL,
      team_a_score INTEGER NOT NULL,
      team_b_score INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_number),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );

  await addColumnIfMissing(db, 'predictions', `penalty_winner_side TEXT DEFAULT NULL`);
  await addColumnIfMissing(db, 'predictions', `golden_boot_boost INTEGER NOT NULL DEFAULT 0`);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS actual_results (
      match_number INTEGER PRIMARY KEY,
      team_a_score INTEGER NOT NULL,
      team_b_score INTEGER NOT NULL,
      entered_by_user_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(entered_by_user_id) REFERENCES users(id)
    )`
  );

  await addColumnIfMissing(db, 'actual_results', `penalty_winner_side TEXT DEFAULT NULL`);
  await addColumnIfMissing(db, 'actual_results', `underdog_winner_side TEXT DEFAULT NULL`);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS member_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_number INTEGER NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_number),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );

  await addColumnIfMissing(db, 'member_scores', `base_points INTEGER NOT NULL DEFAULT 0`);
  await addColumnIfMissing(db, 'member_scores', `advancer_points INTEGER NOT NULL DEFAULT 0`);
  await addColumnIfMissing(db, 'member_scores', `underdog_bonus_points INTEGER NOT NULL DEFAULT 0`);
  await addColumnIfMissing(db, 'member_scores', `golden_boot_bonus_points INTEGER NOT NULL DEFAULT 0`);
  await addColumnIfMissing(db, 'member_scores', `breakdown_json TEXT`);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS score_calculation_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      matched_actual_results_count INTEGER NOT NULL,
      triggered_by_user_id INTEGER NOT NULL,
      FOREIGN KEY(triggered_by_user_id) REFERENCES users(id)
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    db,
    `INSERT INTO app_settings (key, value)
     VALUES ('unlock_all_predictions', '0')
     ON CONFLICT(key) DO NOTHING`
  );

  // Phase 18: OTP has been removed. Clean up legacy OTP tables when present.
  await run(db, 'DROP TABLE IF EXISTS otp_challenges');
  await run(db, 'DROP TABLE IF EXISTS auth_rate_limits');
  await run(db, 'DROP TABLE IF EXISTS auth_events');

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS member_leagues (
      user_id INTEGER PRIMARY KEY,
      league_id INTEGER NOT NULL,
      assigned_by_user_id INTEGER,
      assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(league_id) REFERENCES leagues(id),
      FOREIGN KEY(assigned_by_user_id) REFERENCES users(id)
    )`
  );

  await run(db, `CREATE INDEX IF NOT EXISTS idx_member_scores_user_match ON member_scores(user_id, match_number)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_predictions_user_match ON predictions(user_id, match_number)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_predictions_user_boost ON predictions(user_id, golden_boot_boost, match_number)`);
  await run(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_alias_unique ON users(alias) WHERE alias IS NOT NULL`);
  await run(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone_e164) WHERE phone_e164 IS NOT NULL`);

  const adminPassword = process.env.ADMIN_PASSWORD || 'password';

  await run(
    db,
     `INSERT INTO users (username, password, role)
      VALUES ('admin', ?, 'admin')
      ON CONFLICT(username) DO UPDATE SET password = excluded.password, role = 'admin'`,
      [adminPassword]
    );

    await run(
     db,
     `INSERT INTO users (username, password, role)
      VALUES ('member1', 'password', 'member')
      ON CONFLICT(username) DO UPDATE SET password = 'password', role = 'member'`
  );

    await run(
      db,
      `INSERT INTO leagues (name)
       VALUES ('General League')
       ON CONFLICT(name) DO NOTHING`
    );

    const defaultLeague = await get(db, 'SELECT id FROM leagues WHERE name = ?', ['General League']);
    if (defaultLeague && Number.isInteger(defaultLeague.id)) {
      await run(
        db,
        `INSERT INTO member_leagues (user_id, league_id, assigned_by_user_id)
         SELECT u.id, ?, NULL
         FROM users u
         LEFT JOIN member_leagues ml ON ml.user_id = u.id
         WHERE u.role = 'member' AND ml.user_id IS NULL`,
        [defaultLeague.id]
      );
    }

  return {
    run: (sql, params) => run(db, sql, params),
    get: (sql, params) => get(db, sql, params),
    all: (sql, params) => all(db, sql, params),
    close: () =>
      new Promise((resolve, reject) => {
        db.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      })
  };
}

module.exports = {
  initDatabase
};
