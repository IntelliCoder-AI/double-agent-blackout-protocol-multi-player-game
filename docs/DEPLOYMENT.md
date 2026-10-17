# Deployment guide

Return to the [project README](../README.md).

## Vercel + Neon (early hosted build)

The Vercel adapter uses real HTTPS snapshot synchronization, with a single PostgreSQL row lock serializing authoritative game mutations across function instances. Roles, clues, ballots, guest tokens, rate limits, controller leases and command receipts stay server-side. The browser receives only its filtered snapshot. No in-memory function affinity is required. The existing dedicated-server WebSocket transport remains available below.

1. Create a dedicated Neon database and run `npm run build`, then `npm run migrate:hosted` with its server-only `DATABASE_URL` supplied securely.
2. Import this repository into Vercel. `vercel.json` supplies the Vite build, Singapore function region and API routes.
3. Set production environment variables: `DATABASE_URL` (encrypted), `APP_ORIGIN` (exact public HTTPS origin), `VITE_TRANSPORT=https`, and `MAX_ACTIVE_ROOMS=5`. Never prefix database credentials with `VITE_`.
4. Deploy and verify `/health/ready`, then test room creation and joining in independent browser profiles before releasing the URL. Public judging requires deployment login protection to be disabled for this game project.

Click-to-walk destinations are planned and advanced on the authoritative server. The HTTPS client coalesces direct movement input. Idle investigation polls wait about 350 ms after a response; menus/lobbies wait 1 second. Queued commands send sooner, and actual frequency depends on network latency. This is an early deployment transport; actual Internet latency, frame pacing, mobile performance and quota consumption must be measured before calling it release-ready. Database transactions serialize a maximum of five rooms. It is not a high-concurrency architecture. Free-tier quota exhaustion may stop play; no paid upgrade is automatic.

Guest cookies are Secure/HttpOnly/SameSite=Strict. Connection ownership is tracked in the database; a second controller using the same cookie replaces the first. The lobby's New player action opens a separate seat namespace and HttpOnly cookie, allowing independent players in one browser. The client sends a forced-write heartbeat at least every five seconds while requests succeed. Missing polls expire presence after 45 seconds in idle lobbies/debriefs and 15 seconds in active rounds; existing host-migration and round-quorum rules then apply. Function restarts preserve stored rounds. Timers advance using database time when requests arrive, and movement catch-up is bounded. Idle rooms do not consume a continuously running timer.

### Dedicated Node + PostgreSQL

The supplied Dockerfile is a deployment configuration; a container build has not been executed in this restricted environment.

Use **one persistent Node service**, a dedicated PostgreSQL database, and an HTTPS reverse proxy that supports WebSocket upgrades. Serve the frontend and `/api/session` / `/ws` from the same origin. A static-only host cannot run this backend.

Required server environment:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Hosting service's assigned port, default 3000 |
| `APP_ORIGIN` | Exact public HTTPS origin, without path or trailing slash |
| `DATABASE_URL` | Private server PostgreSQL connection string; enable TLS as required by the database host |
| `MAX_ACTIVE_ROOMS` | 5 for the initial capacity limit |

Do not expose `DATABASE_URL` through frontend environment variables or commit credentials. Use a database identity limited to this game's database. The schema is private and grants no public table access; browsers never connect directly to PostgreSQL.

Build and initialize:

```sh
npm ci
npm run build
npm run migrate
npm start
```

`migrate` needs `DATABASE_URL`. Apply it as a deployment job before starting production; production startup checks the schema and does not modify it automatically.

Alternatively, `compose.yaml` provides the PostgreSQL, migration and game containers. Set `DB_PASSWORD` to a long URL-safe secret and `APP_ORIGIN` to your existing public HTTPS origin, then run `docker compose up --build -d`. The game port is bound to the host's loopback address for an existing HTTPS reverse proxy. The database is not published to the host network. Public DNS, TLS and hosting credentials are not included or provisioned.

Health endpoints: `/health/live` checks the process; `/health/ready` checks database availability and shutdown status. Initial frontend assets are cached by content hash. Production source maps are disabled.

### Simple maintenance deployment

Do not use rolling replacements or multiple replicas for B1. A PostgreSQL advisory lock permits only one authoritative process to own the database. The replacement fails fast if the old process still owns it.

1. Announce maintenance and let active missions end where possible.
2. Stop the existing game instance and wait for it to exit.
3. Apply migrations, build/start the replacement, and check readiness.
4. Test two independent guests through the public HTTPS origin before reopening judging access.

Rooms, guest identities and scores persist. A server restart ends an active round **without a score** and offers a rematch; it does not resume a live round seamlessly. Player reconnection within a running server preserves the active mission. This intentional B1 distinction avoids unreliable handoff engineering.

