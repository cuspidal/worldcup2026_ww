const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const gzip = promisify(zlib.gzip);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function optionalEnv(name, fallback = '') {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function utcStamp(date) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}Z`;
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dbFile = optionalEnv('DB_FILE', path.join(process.cwd(), 'data', 'predictions.db'));
  const bucket = requiredEnv('S3_BUCKET');
  const region = requiredEnv('S3_REGION');
  const accessKeyId = requiredEnv('S3_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('S3_SECRET_ACCESS_KEY');
  const endpoint = optionalEnv('S3_ENDPOINT');
  const backupPrefix = optionalEnv('BACKUP_PREFIX', 'worldcup2026_ww');
  const forcePathStyle = optionalEnv('S3_FORCE_PATH_STYLE', 'true').toLowerCase() === 'true';

  if (!(await fileExists(dbFile))) {
    throw new Error(`Database file not found/readable: ${dbFile}`);
  }

  const stamp = utcStamp(new Date());
  const baseName = `predictions-${stamp}.db`;
  const tempCopyPath = path.join(os.tmpdir(), baseName);

  // Copy first to avoid uploading a file handle that may change during read.
  await fsp.copyFile(dbFile, tempCopyPath);

  const sqliteBuffer = await fsp.readFile(tempCopyPath);
  const gzBuffer = await gzip(sqliteBuffer, { level: zlib.constants.Z_BEST_COMPRESSION });

  const key = `${backupPrefix.replace(/\/$/, '')}/${baseName}.gz`;
  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey }
  });

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: gzBuffer,
    ContentType: 'application/gzip',
    Metadata: {
      source: 'railway-cron',
      db_file: dbFile
    }
  }));

  await fsp.unlink(tempCopyPath).catch(() => {});

  console.log(`Backup uploaded: s3://${bucket}/${key}`);
  console.log(`Original DB bytes: ${sqliteBuffer.length}`);
  console.log(`Compressed bytes: ${gzBuffer.length}`);
}

main().catch((error) => {
  console.error('[backup-db-to-bucket] failed:', error.message);
  process.exitCode = 1;
});
