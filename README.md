# DOUBLE AGENT: BLACKOUT PROTOCOL

Milestone B1 development source - October 15, 2026.

A browser-native multiplayer investigation game built with React, Three.js / React Three Fiber, an authoritative Node WebSocket server, and PostgreSQL. One implemented mystery: **The Ninety-Second Ghost**. Supports two-player cooperative play against an NPC and a 3-8-player mode with one hidden human traitor.

**Status:** the production bundle and 23 automated rules/database tests have passed. The local 3D landing scene was rendered at desktop and mobile sizes. A Vercel/Neon hosting adapter is implemented and tested at the shared-database boundary. Public multiplayer verification is still pending. This is an implementation checkpoint, not a completed public release.

## Run locally

Requires Node 22.12 or newer and npm. On a machine with normal package/network access:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The development server uses an embedded PostgreSQL database under `.data/local-postgres`; no separate database installation is needed. That storage mode is rejected in production.

Use separate browser profiles, different browsers, or different devices for different guests. Tabs in the same profile share one guest identity; opening a second controlling tab deliberately closes the first connection.

Development binds to loopback. Device and public testing should use the HTTPS production deployment described below. Do not publish the Vite development server.

Configuration may be supplied as environment variables. To load an environment file explicitly, use Node's `--env-file` option, for example `node --env-file=.env --import tsx server/index.ts`. The application does not silently read `.env`.

## Controls and first round

1. Create a mission. Co-op is selected initially so two judges can start quickly. Share the six-character code or invitation link.
2. Every player marks ready; the host starts the mission. Each client receives only its own private role.
3. Move with WASD/arrows, click the floor, or use touch direction buttons. Facility lists every console and marks your private decryption keys.
4. Approach an evidence terminal and recover a record. Return to the central Evidence Wall to publish it. The two identifying records are always assigned to different operatives.
5. Authenticate discovered/shared records at either verification terminal. Compare the clock with the camera and the core event with the access log at the wall. Incorrect relationships and unsupported values are rejected by the server.
6. The culprit is the person in **both** authenticated access groups. Discuss this with your partner/team, then attach a published clue to your private indictment.
7. Repair systems and stop any announced upload at an emergency console. Rematch from the results screen; the room and cumulative score remain.

See [GAME_RULES.md](GAME_RULES.md) for exact timing, sabotage, ties, abstentions, recovery and disconnection rules.

## Validate

```sh
npm test
npm run build
npm run test:network
```

`npm test` runs deterministic game-rule tests, randomized case checks, path reachability checks and real SQL transactions in embedded PostgreSQL. `test:network` starts a separate ephemeral server on port 3057 and uses actual HTTP/WebSocket connections with independent guest cookies.

For browser checks, start `npm run dev` in another terminal, then:

```sh
npx playwright install chromium
npm run test:browser
```

Set `TEST_URL` to test an existing HTTPS deployment. The suite creates independent desktop contexts and an emulated touch/mobile context. Emulation is **not** a substitute for real phones or human balance testing. The browser suite currently covers room creation/join, roles, chat and reconnection; it does not yet automate the entire investigation/voting path.

## Production deployment

### Vercel + Neon (early hosted build)

The Vercel adapter uses real HTTPS snapshot synchronization, with a single PostgreSQL row lock serializing authoritative game mutations across function instances. Roles, clues, ballots, guest tokens, rate limits, controller leases and command receipts stay server-side. The browser receives only its filtered snapshot. No in-memory function affinity is required. The existing dedicated-server WebSocket transport remains available below.

1. Create a dedicated Neon database and run `npm run build`, then `npm run migrate:hosted` with its server-only `DATABASE_URL` supplied securely.
2. Import this repository into Vercel. `vercel.json` supplies the Vite build, Singapore function region and API routes.
3. Set production environment variables: `DATABASE_URL` (encrypted), `APP_ORIGIN` (exact public HTTPS origin), `VITE_TRANSPORT=https`, and `MAX_ACTIVE_ROOMS=5`. Never prefix database credentials with `VITE_`.
4. Deploy and verify `/health/ready`, then test room creation and joining in independent browser profiles before releasing the URL. Public judging requires deployment login protection to be disabled for this game project.

The HTTPS client coalesces movement updates and polls while connected, approximately 5-10 updates/second depending on request latency. This is an early deployment transport; actual Internet latency, frame pacing, mobile performance and quota consumption must be measured before calling it release-ready. Database transactions serialize a maximum of five rooms. It is not a high-concurrency architecture. Free-tier quota exhaustion may stop play; no paid upgrade is automatic.

Guest cookies are Secure/HttpOnly/SameSite=Strict. Connection ownership is tracked in the database; a second tab using the same cookie replaces the first. Missing polls expire presence after 15 seconds; existing host-migration and round-quorum rules then apply. Function restarts preserve stored rounds. Timers advance using database time when requests arrive, and movement catch-up is bounded. Idle rooms do not consume a continuously running timer.

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

## Source map

- `server/engine.ts`: authoritative rules, timers, private projection and outcomes.
- `server/case.ts`: first handcrafted mystery, ambiguity groups and canonical/forged evidence.
- `server/index.ts`: guest cookies, authenticated WebSockets, validation, limits, persistence and synchronization.
- `server/store.ts`, `server/migrations/`: PostgreSQL storage and transactional command receipts.
- `shared/world.ts`: facility geometry, interactions and authoritative movement collision.
- `src/World.tsx`: original procedural 3D headquarters and avatars.
- `src/App.tsx`: complete first-case interface, repairs, Evidence Wall, voting and debrief.
- `tests/`: rules, SQL, transport and browser checks.
- `artifacts/`: clearly labeled offline render captures and verification output.

See [TEST_REPORT.md](TEST_REPORT.md) for actual results and outstanding release gates. Third-party license notices are in `THIRD_PARTY_NOTICES.txt`. All environment geometry and synthesized interface tones are original code; no external models, texture downloads or background-image substitutes are required.
