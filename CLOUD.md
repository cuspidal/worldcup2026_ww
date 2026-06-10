# Cloud Deployment Notes

This app is cloud-ready as a small single-node Express app with SQLite.

## Recommended Hosting Shape

Use a host that supports:

- Node.js 18+
- A persistent disk or volume for SQLite
- Environment variables
- HTTPS termination in front of the app

Good lightweight options: Render, Railway, Fly.io, or a small VPS. Avoid serverless-only hosts unless you move SQLite to a managed database, because local files are usually ephemeral there.

## Railway Deployment

This repo includes a `Dockerfile`. Railway should use it automatically on the next deploy. The Dockerfile forces `sqlite3` to compile inside the same Debian/Node image that runs the app, which avoids native binary errors such as:

```text
GLIBC_2.38 not found ... node_sqlite3.node
```

Railway setup:

1. Deploy from the GitHub repo.
2. Add a persistent volume mounted at `/data`.
3. Set the environment variables below.
4. Redeploy. If Railway still shows the GLIBC error, clear the build cache or trigger a fresh redeploy after the Dockerfile is pushed.

Railway does not need a custom start command when using this Dockerfile. The image runs `npm start`.

## Required Environment Variables

Set these in the cloud host:

```bash
NODE_ENV=production
PORT=<provided by host>
SESSION_SECRET=<long random string>
ADMIN_PASSWORD=<admin login password>
DB_FILE=/path/to/persistent/disk/predictions.db
TRUST_PROXY=1
```

`SESSION_SECRET` does not protect private personal data, but it does protect login sessions. Generate any long random value and keep it out of source control.

## SQLite Persistence

The app defaults to `data/predictions.db` locally. In the cloud, point `DB_FILE` at a persistent disk path. Examples:

```bash
DB_FILE=/var/data/predictions.db
DB_FILE=/data/predictions.db
```

If the disk is not persistent, predictions and users may disappear when the service restarts or redeploys.

## Health Check

Use this endpoint for uptime checks:

```text
GET /api/health
```

It returns `{ "ok": true }` when the app is running.

## Build And Start

For non-Docker hosts, install dependencies and start the app:

```bash
npm install
npm start
```

No build step is required.

## Practical Security Notes

This is intentionally lightweight for a friends-and-family fantasy game. The app now avoids serving backend source files publicly, uses HTTP-only session cookies, uses secure cookies in production, and supports reverse proxies. For a bigger public app, the next upgrades would be password hashing, rate limiting, a persistent session store, and managed database backups.
