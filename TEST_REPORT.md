# B2 verification report

Updated October 17, 2026. The successful public browser run completed October 16 at 17:08 UTC.

**Play:** https://double-agent-blackout-protocol-radhe12.vercel.app

**Evidence:** [GitHub Actions run 38936066317](https://github.com/IntelliCoder-AI/double-agent-blackout-protocol-multi-player-game/actions/runs/38936066317), job 117091758836, conclusion **success**. Tested source: verification head 357da28b5fc472c8da8a676e3456161fe1e5aeea; deployed game commit 973ee5173586af98c8e3dd6b90e67900b731454a. PR #1 merges that verified workflow and test source into main.

## Verified results

| Check | Actual result and scope |
| --- | --- |
| Automated rules, privacy, five-case validity, sabotage, recovery, voting, SQL and idempotency | **35 passed, 0 failed, 0 skipped** in Linux CI |
| PostgreSQL contention | Passed with real PostgreSQL 16: responsive snapshots, serialized privileged actions |
| Production build and public readiness | Passed: TypeScript, Vite, server bundles and HTTP 200 database readiness |
| Social room, three independent guests | Passed: create/join, ready/start, exactly one private traitor |
| Private-state projection | Passed: other roles, guest sessions and culprit absent from public room/player fields |
| Invalid live actions | Passed: agent sabotage, remote recovery, out-of-bounds input and stale-round requests rejected |
| Touch and layout | **Passed in emulation only:** 390x844 Chromium touch input changed server position; no horizontal page overflow |
| Host migration and reconnect | Passed: closed host page, authority moved; returning guest retained identity and role |
| Full hosted co-op investigation | Passed: two separate guest contexts, private grants, real walking, four timed recoveries and authentications, uplink repair |
| Living Evidence Wall | Passed: four shared records synchronized and both supported links accepted; culprit derived from their published candidate intersection |
| Co-op reload recovery | Passed: returning client retained its identity during the investigation |
| Live ballot and results | Passed: both evidence-backed ballots recorded; server produced agents' victory |
| Rematch | Passed: both clients returned to the lobby with the same room code, then left normally |
| Browser JavaScript errors | **Zero page errors** in both successful live scripts |

These were independent Chromium browser contexts with separate guest cookies connecting over the Internet to the actual Vercel/Neon backend. They were not separate physical devices. Tests used UI actions, real server clocks and ordinary movement; they did not inject game state, teleport players or shorten production timers.

All five cases also passed randomized solvability and command-driven solution/ballot/rematch checks. Only the first case has the complete public-browser evidence-to-rematch verification described above. Live social resolution, larger rosters and all-case browser runs remain broader verification work.

## Fixes established through testing

- Handled pre-parsed request bodies before reading an already-consumed stream; preserved byte limits and split UTF-8 decoding.
- Reduced world-row contention for transient snapshots/input while keeping sensitive mutations and stop packets serialized.
- Prevented disconnected lobbies/completed rounds from exhausting active creation slots; retained records keep a separate storage bound.
- Made initialization status nonblocking and cleared held controls on blur without cancelling an intentional route.
- Waited for rendered panels in browser scripts and fixed clear routes stopping one grid cell short.
- Replaced delayed client feedback steering with server-planned click-to-walk routes. The server enforces speed, collision, destination bounds, cancellation and interaction range. This removed the observed console drift.
- Batched static environment surfaces while preserving interactive targets and textured labels; added geometry/cleanup regression coverage.
- Corrected a shared module's ESM import extension after readiness caught a function startup failure. That failed deployment and earlier failed test runs are not counted as passes.

## Performance and limits

The successful two-guest hosted run sampled 1,040 synchronization responses: median **267.237 ms**, p95 **321.592 ms** from that CI location. This is one test-machine observation, not a global latency guarantee or load test.

The passing build measured application JavaScript **256.40 kB / 81.27 kB gzip**, renderer **902.70 kB / 244.32 kB gzip**, CSS **28.15 kB / 7.05 kB gzip**. The renderer chunk warning remains.

An earlier offline Windows headless Chromium/SwiftShader menu-renderer diagnostic recorded 139 draw calls, 14,434 triangles and 6.6 FPS over 10.11 seconds at 1200x800, without JavaScript page errors. It is a software-GPU diagnostic, not a physical desktop/mobile benchmark, and does not satisfy the hardware frame-rate targets. Performance graphics reduce resolution, shadows, glass compositing and obscured/background rendering; phone FPS and sustained thermals still need measurement.

The hosted backend serializes a shared world row and limits initial capacity to five active rooms. It is suitable for this early judging build; sustained multi-room throughput and free-tier quota consumption are not established. The separate dedicated Node/WebSocket transport remains available in source.

## Remaining release gates

1. Real Android/Chrome and iPhone/Safari sessions: touch every primary action, portrait/landscape, lock/unlock, network changes, loading, frame time and sustained heat.
2. Human onboarding, fairness and enjoyment tests at 3, 5 and 8 players, including meaningful forgery, jam, repair delay, exfiltration and shared-recovery counterplay. No human win-rate or comprehension data has been collected.
3. Broader live social outcomes, ties, abstentions, upload aborts, 5–8-player rooms, additional-case browser playthroughs and weak-network/soak tests. The automated checks are not a formal security audit.
4. Final hardware-aware visual/accessibility polish, genuine promotional gameplay captures, cover artwork and demo recording.

Settings exports actual device diagnostics. Debriefs export anonymized server metrics and optional participant feedback. See PLAYTEST_GUIDE.md. These tools are implemented; physical-device and human observations have not been fabricated.

Screenshots were generated during the browser run on the ephemeral runner; they are not delivered promotional assets. Local cached Chromium can launch, but this runtime blocked its public DNS/localhost access during the previous session, so public tests ran in GitHub Actions.

No paid service or upgrade was purchased. This is a verified development milestone, not completion of the competition release.
