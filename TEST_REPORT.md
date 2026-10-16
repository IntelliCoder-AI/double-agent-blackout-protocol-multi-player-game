# Milestone B1 verification report

Recorded October 16, 2026. Public development build, one mystery. This supersedes the pre-deployment October 15 checkpoint.

**Play:** https://double-agent-blackout-protocol-radhe12.vercel.app

**Hosting:** Vercel production functions with dedicated Neon PostgreSQL in Singapore. Guest cookies are HttpOnly/Secure; roles and canonical evidence remain server-side. Hosted transport uses real HTTPS polling. The dedicated Node/WebSocket implementation remains available separately.

## Results obtained

| Check | Result | Scope |
| --- | --- | --- |
| Rules, privacy, sabotage, voting, recovery, SQL persistence and receipts | PASS | 25 automated tests, including delayed navigation and room-capacity regressions |
| Production TypeScript/Vite/server build | PASS | Local build and clean Vercel build |
| Public readiness endpoint | PASS | HTTP 200 with database readiness |
| Two independent guests create/join, ready and receive co-op roles | PASS | Separate Chromium contexts against production |
| Three-player social lobby and private roles | PASS | Exactly one traitor; public players contain no role/session; public room contains no roles/culprit |
| Live invalid actions | PASS | Agent sabotage, remote scan, invalid movement and stale-round actions rejected |
| Origin and authentication | PASS | Invalid origin 403; missing session 401 |
| Private recovery and uplink repair | PASS | UI navigation, timed scanning and all three repair steps |
| Host migration and reconnect | PASS | Host page closed; host migrated; returning cookie retained identity and role |
| Mobile layout and touch movement | PASS, EMULATED | Chromium 390x844; touch changed position; no horizontal overflow |
| Shared Evidence Wall and supported connections | PASS | Four authenticated records synchronized; both evidence-backed connections validated through UI |
| Full co-op evidence-to-rematch run | INCOMPLETE | Live run reached discussion; test wait expired 17 seconds before ballot opening |
| Physical devices and human balance | NOT RUN | No hardware FPS or enjoyment claims |

No JavaScript page errors were recorded in the completed three-player security/mobile/reconnect run. This is not a formal security audit. Live social resolution with 5-8 players, adversarial concurrency, soak tests and human traitor play remain unverified.

## Defects found through live testing

- Short input expiry caused poor movement over Internet polling. Hosted input now expires after one second; dedicated WebSocket input retains its shorter timeout. Speed and collision validation remain authoritative.
- Small path segments caused overshoot and corridor stalls. Paths now retain turns and straight segments, add boundary clearance, and require closer turn arrival. A regression test simulates delayed updates across eight consoles.
- Completed disconnected missions exhausted creation slots. Their debriefs now remain reconnectable without consuming active creation slots; retained storage has a separate bound.
- An early browser script assumed fixed clue ownership and timed out at a correctly locked terminal. It now respects randomized grants and two-minute shared recovery.
- The full-round test allowed 240 seconds to reach voting after evidence collection, which was 17 seconds too short for that run's remaining investigation and discussion. The wait is now 360 seconds. The rerun could not launch Chromium in the current restricted runtime (Windows exit code 3221225506); live voting/results/rematch are therefore still unverified.

Failed runs are not counted as passes. Live scripts use UI actions, real server clocks and public HTTP responses; they do not inject game state or teleport players.

## Reproduce

```sh
npm ci
npm test
npm run build
npx playwright install chromium
node tests/live/security.cjs
node tests/live/coop.cjs
```

Live tests create their own guests on the public URL. Set BASE_URL to a staging deployment to avoid production testing. CHROME_EXECUTABLE optionally selects a local Chromium executable. The co-op test takes a normal-duration round. Screenshots and console output document observations. Separate browser profiles/devices represent independent guests; tabs sharing cookies share one identity.

## Performance and capacity

- Application JavaScript: 238.82 kB / 75.61 kB gzip.
- Three.js renderer: 902.67 kB / 244.31 kB gzip. The large-chunk warning remains open.
- CSS: 24.27 kB / 6.12 kB gzip.
- An initial two-client sample observed roughly 160-435 ms per synchronization request. This is test-machine latency, not a geographically representative benchmark or SLA.
- Touch emulation does not establish real-phone frame rate. Desktop 60 FPS and mobile 30 FPS remain unverified.
- Hosted state uses one transactional world row. It serializes commands reliably but is a throughput bottleneck. Five active creation slots are configured; reconnect concurrency and sustained load need measurement.

## Remaining release gates

1. Rerun the corrected complete-round browser test in a runtime that permits Chromium. Verify live voting, results and rematch, then social outcomes, ties, abstentions and exfiltration counterplay.
2. Test real devices, weak networks, context loss, frame time, memory and concurrent rooms.
3. Human playtests for comprehension, traitor choices, recovery and win-rate balance.
4. Refine the Evidence Wall, environment art, animation, sound, onboarding and accessibility.
5. Expand to three polished mysteries; five remains the target if time permits. Only one exists now.
6. Final cover, gameplay capture, submission description and demo recording.

No paid service or upgrade was purchased. This is an early playable milestone, not completion of all competition requirements.
