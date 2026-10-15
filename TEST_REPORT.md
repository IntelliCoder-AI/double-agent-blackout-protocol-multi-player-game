# Milestone B1 verification report

Recorded October 15, 2026. **B1 remains in progress; there is no public deployment yet.**

## Hosted adapter checkpoint - October 16, 2026 (India)

- Added Vercel HTTP API and HTTPS client synchronization backed by a dedicated Neon database.
- Production TypeScript/Vite/esbuild build: passed. Full automated suite: **23 passed, 0 failed, 0 skipped**.
- New SQL test uses two independent `HostedGame` instances sharing embedded PostgreSQL. It checks cross-instance joining, role filtering, private session filtering, command replay/mismatch, unauthorized sabotage, controller replacement and role-preserving reconnect.
- This test interleaves requests; it does not establish production concurrent-load capacity or Internet performance.
- Neon production schema created in dedicated project `curly-mode-17343293`; public access to the three game tables revoked explicitly.
- Vercel project created. Credential installation and removal of login protection were blocked by automatic approval review and await explicit approval. No public playable build is claimed at this checkpoint.
- Hosted browser tests, real-device testing, latency/throughput measurements and human balancing remain pending.

## Results actually obtained

| Check | Result | Scope / evidence |
| --- | --- | --- |
| TypeScript strict check | PASS | Included in the final production build, including server, client and test sources |
| Production client and server build | PASS | Vite 7.3.7 + esbuild; server and migration entry points generated |
| Automated rules / SQL tests | **22 passed, 0 failed, 0 skipped** | `npm test`; final run approximately 5.17 seconds |
| Case validity across roster sizes | PASS | 35 generated rounds for each 3-8-player roster; exactly one culprit in the group intersection |
| Mandatory clue separation | PASS | 100 distributions for each 2-8-player roster; identifying fragments never share an initial owner |
| Role and clue projection | PASS at engine boundary | Only the requesting role/private clues appear; unpublished case data and other guest session identities are absent |
| Rule validation | PASS at engine boundary | Unauthorized sabotage, stale rounds, remote interactions, invalid inputs, unsupported comparisons, duplicate effects and missing ballot evidence rejected |
| Sabotage and exfiltration | PASS at engine boundary | Charges/cooldown, immutable forgery receipt, second-verifier counterplay, abort, repair lockout and upload victory |
| Voting / reconnect / rematch | PASS at engine boundary | Correct/wrong indictment, ties, abstention, runoff, draw, quorum failure, host migration, frozen deadline, persistent score and new round |
| SQL persistence / atomic receipts | PASS | Actual embedded PostgreSQL schema, stored sessions/rooms, duplicate-command rollback and deletion |
| Server initialization | PASS in development | Real Node HTTP/WebSocket server reached its listening state using embedded PostgreSQL |
| Local desktop 3D render | PASS | Headless Chromium, local-file render of the actual client, 1440x1000; canvas present; no JavaScript page errors; no horizontal overflow |
| Local mobile-size 3D render | PASS | Same renderer at 390x844; canvas present; no JavaScript page errors; no horizontal overflow |
| Independent desktop browser multiplayer | **BLOCKED / not passed** | Browser launched, but navigation to the local server failed with `net::ERR_NETWORK_ACCESS_DENIED` |
| Mobile browser room flow | **BLOCKED / not passed** | Same network denial before application navigation; emulation only, not a real-device test |
| Native PostgreSQL service connection | **BLOCKED / not tested** | OS returned permission denied for loopback TCP; SQL tests used embedded PostgreSQL instead |
| Public HTTPS playtest | NOT RUN | No public hosting endpoint provisioned |
| Docker/Linux clean install | NOT RUN | Docker configuration and portable lockfile supplied; a fresh hosted install/build still needs verification |
| Human balance / enjoyment playtest | NOT RUN | No human multiplayer observations have been collected |
| Hardware FPS / load / latency targets | NOT MEASURED | No claim of 60 FPS desktop, 30 FPS mobile, or supported concurrency |

The 22 automated tests exercise game rules directly. They are not evidence of independent browsers playing a full round over the network. The added `test:network` suite uses real HTTP and WebSocket clients and is ready for an environment where local networking is permitted; it has not been run successfully here.

The two attempted Playwright end-to-end tests failed at the environment's network boundary. They are recorded as blocked, not converted into passes. The offline render check uses the genuine client and procedural 3D scene without fabricated players, roles, room responses or multiplayer state. Its screenshots intentionally show an unavailable connection and must not be submitted as proof of live gameplay.

## Build measurements

Final build output:

- HTML: 0.66 kB; gzip 0.42 kB.
- CSS: 24.27 kB; gzip 6.12 kB.
- Application JavaScript: 238.64 kB; gzip 75.52 kB.
- Three.js / renderer JavaScript: 902.67 kB; gzip 244.31 kB.
- Server entry: approximately 49.4 kB; migration entry: approximately 3.6 kB, excluding runtime dependencies.

Vite emitted a large-chunk warning for the 3D renderer. This is retained as a performance follow-up, not suppressed. Build size is not an FPS measurement. Shadows and pixel density have a lower graphics preset; actual phone performance remains unverified.

## Implemented checkpoint

Source includes a real authoritative WebSocket backend, guest sessions, private rooms/roles/clues, synchronized player positions, case distribution, server timers, shared Evidence Wall, verification and supported links, three repairs, four human sabotage actions, scripted NPC sabotage, discussion, private ballots, results/evidence audit, scores, reconnection, host migration, rematches, room expiry and persistent command receipts.

The interface includes create/join, lobby/readiness/accent choice, role reveal, clickable 3D consoles, keyboard/click/touch movement, facility navigation, private inventory, Evidence Wall, quick messages/chat, repairs, voting, debrief, settings and briefing. The five connected facility sectors are procedural 3D geometry with lighting, holographic elements and animated reactor details. This is first-pass B1 art, not final premium environment production.

## Remaining release gates

1. Install from the lockfile on the intended host; apply migrations; verify one-instance ownership and the maintenance restart procedure against native PostgreSQL.
2. Run the transport suite and independent-browser co-op/social rounds through the real HTTPS endpoint. Cover 3, 5 and 8 players, reconnects, host loss, vote ties and repeated rematches.
3. Complete keyboard and real-touch investigations through every console, all three repairs, evidence publication/verification/comparison, voting and results. Extend the browser suite to cover the full investigation rather than lobby/communication alone.
4. Inspect actual WebSocket traffic for private-information leaks; exercise invalid origins, stolen/reused command IDs, payload limits and reconnect abuse over the network.
5. Playtest traitor decision-making and agent counterplay. Measure repair duration, discovery/recovery times, upload interruption rates, votes, win rates and player comprehension. No balance claim is justified yet.
6. Measure frame time, draw calls, memory, loading and network throughput on desktop and real midrange phones; test context loss and weaker connections.
7. Expand to three polished mysteries after the first network loop is confirmed. Five remains the content target if time permits. Terminal placement randomization, richer minigames, draggable board layout, extensive audio, final art/animations and competition media remain outstanding.

## Blockers and cost status

- This workspace denies local TCP access, including Chromium navigation to the game server. Its separate browser automation runtime also failed to initialize. Permissions were not bypassed.
- No accessible public Node/WebSocket host and production PostgreSQL credentials were supplied or provisioned. A static frontend URL alone would not satisfy the game requirements.
- No services were purchased, no paid infrastructure was started, and the declined hosting plugin was not used.

The source bundle is the handoff for this checkpoint. It is not a substitute for the missing public URL or the required live multiplayer verification.
