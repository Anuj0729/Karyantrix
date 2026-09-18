# Deployment Guide

This document explains the Docker setup and the CI/CD pipeline that ships
`main` to production.

## 1. What got added

```
backend/Dockerfile              # multi-stage prod image for the API + worker
backend/.dockerignore
frontend/Dockerfile             # multi-stage prod image for the Next.js app
frontend/.dockerignore
docker-compose.yml              # base topology (mongo, redis, backend, worker, frontend)
docker-compose.override.yml     # auto-loaded locally -> builds images from source
docker-compose.prod.yml         # explicit prod hardening (no exposed DB ports, restart: always, log limits)
.env.example                    # compose-level variables (registry, tag, public URLs)
.github/workflows/ci.yml        # tests + lint + build on every PR / non-main push
.github/workflows/cd.yml        # test -> build & push images -> SSH deploy on push to main
```

No application source files were changed — this is purely additive
infrastructure.

## 2. Local usage

```bash
# builds images from source (docker-compose.override.yml is picked up automatically)
docker compose up --build

# backend  -> http://localhost:5000
# frontend -> http://localhost:3000
# mongo    -> localhost:27017, redis -> localhost:6379
```

`backend/.env` (already in the repo, gitignored) is loaded as-is for
secrets; `MONGO_URI`, `REDIS_URL`, `RUN_WORKER_IN_PROCESS` and `CLIENT_URL`
are overridden inside `docker-compose.yml` so the containers talk to each
other over the Docker network instead of `localhost`.

## 3. The pipeline (`ci.yml` + `cd.yml`)

**Every PR / branch push (`ci.yml`):**
1. Backend: `npm test` (Jest + `mongodb-memory-server`, no external DB needed).
2. Frontend: `npm run lint` and `npm run build`.
3. Both Dockerfiles are built (not pushed) to catch broken images early.

**On merge to `main` (`cd.yml`) — this is the previously-missing production path:**
1. **Test** — same checks as CI, gate the release.
2. **Build & push** — builds `backend/Dockerfile` and `frontend/Dockerfile`,
   pushes them to GHCR (`ghcr.io/<owner>/karyantrix-backend`,
   `.../karyantrix-frontend`) tagged with the short git SHA and `latest`.
3. **Deploy** — SSHes into the production host, logs in to GHCR, pulls the
   new images, and runs
   `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`,
   then hits `/api/health` to confirm the new containers came up.

A failed test or build stops the pipeline before anything touches
production, and the `production` GitHub Environment lets you add required
reviewers/approval gates in **Settings → Environments** if you want a
manual go/no-go before deploy.

## 4. One-time production server setup

On the VPS/server that will run the app:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # re-login after this

mkdir -p /opt/karyantrix && cd /opt/karyantrix
git clone <your-repo-url> .

cp .env.example .env                     # fill in REGISTRY/CLIENT_URL/SITE_URL
cp backend/.env.example backend/.env      # fill in real secrets (Mongo creds if external, JWT, SendGrid, Twilio, Razorpay, S3...)
```

If you don't already have `backend/.env.example`, copy `backend/.env` and
strip the real secret values before committing it — never commit real
secrets.

## 5. Required GitHub Secrets

Set these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|---|---|
| `PROD_HOST` | Production server IP/hostname |
| `PROD_SSH_USER` | SSH user on that server |
| `PROD_SSH_KEY` | Private key with access to that user (public half in `~/.ssh/authorized_keys` on the server) |
| `PROD_SSH_PORT` | Optional, defaults to 22 |
| `PROD_DEPLOY_PATH` | e.g. `/opt/karyantrix` — where the repo was cloned in step 4 |
| `GHCR_USERNAME` | GitHub username used to `docker login ghcr.io` from the server |
| `GHCR_TOKEN` | A PAT with `read:packages` scope for that login (or make the packages public and skip the login step) |

`GITHUB_TOKEN` (used to push images in the build job) is provided
automatically by Actions — no setup needed for that one.

## 6. Rollback

Every image is tagged with its git SHA, so rolling back is:

```bash
ssh <user>@<prod-host>
cd /opt/karyantrix
export IMAGE_TAG=<previous-good-sha>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Or simply re-run the `cd.yml` workflow from a previous commit via
**Actions → CD → Run workflow**.

## 7. Notes / things to revisit as the app grows

- Mongo and Redis currently run as containers on the same host with a
  named volume. For real production traffic, consider managed services
  (MongoDB Atlas, a managed Redis) and pointing `MONGO_URI`/`REDIS_URL`
  at them instead — the compose files already isolate those as
  environment variables, so this is a config change, not a code change.
- `STORAGE_DRIVER=s3` in `backend/.env` moves uploaded files off the
  container's local disk (recommended once you're running multiple
  backend replicas, since local disk isn't shared between them).
- Put a reverse proxy (nginx/Caddy/Traefik) in front of ports `3000` and
  `5000` for TLS termination and a single public domain; not included
  here to keep this change scoped to Docker + CI/CD.
