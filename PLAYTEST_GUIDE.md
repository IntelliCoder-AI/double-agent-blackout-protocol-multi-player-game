# Real-device and human playtest session

The game now supplies measurements and reports. These instructions are a test protocol, not claims that anyone has completed it.

## Phone checks

Use the public HTTPS game on at least one midrange Android/Chrome phone and one iPhone/Safari. A second person joins from another device. Do not use two tabs sharing a guest cookie.

1. Start with Cooperative and Ghost. Create/join by code, ready up, reveal roles and walk to all five sectors using touch controls and the Facility directory.
2. In Settings, select Performance graphics. Click **Measure 10 seconds**, close Settings, and walk through Operations and Reactor. Reopen Settings and **Export device report**. Repeat at High graphics. The export includes the measured frame statistics, resolution and browser; identify the phone model separately.
3. Recover clues, authenticate, publish, drag an evidence node, establish both connections, repair each system and vote. Check that text remains readable and every control is reachable in portrait and landscape.
4. Complete results/rematch twice. Lock the phone for ten seconds and return; repeat with a Wi-Fi/mobile-data change. Confirm the same role and score return. Note pauses and failures.
5. Record load time, heat, battery impact and any visible stutter. A ten-second frame sample does not prove sustained performance. Repeat during a full 6–8-player session.

Targets: playable 30 FPS on supported phones, readable controls without horizontal page overflow, no unrecoverable connection loss. Report actual results, including failures.

## Human balancing

Keep the current rules as a baseline. Automated solvability tests do not establish fun or balanced win rates.

- Run each case cooperatively once with first-time players. After 90 seconds, ask each player to explain recovering, verifying, pinning, and voting without coaching. Record where the briefing failed.
- Run social sessions at 3, 5 and 8 players. Start with six rounds per group and rotate cases. Record player experience levels, network conditions and which players received traitor roles; random assignment does not guarantee equal traitor turns in a small sample.
- Try forgery before verification, a jam against an active verifier, delayed repairs, and early versus late exfiltration. Agents should notice an anomaly and have time to verify, reach a second terminal, abort, or isolate the uplink.
- Export the **playtest report** at each debrief. Add the observations fields for comprehension, fairness, enjoyment and notes. Exports omit player names, chat and guest credentials. Keep them outside the public source repository unless participants agree to publish their observations.
- Compare evidence recovery time, authenticated records, supported links, repairs, upload attempts/aborts, forged evidence exposed and outcomes by case/player count. Record suspected frustration and successful deception separately from wins.
- With at least 30 social rounds, investigate large sustained differences in side win rates. A 40–60% split is a provisional design target, not a promise or a statistically conclusive threshold for a small sample.

Change one parameter at a time: cooldown, charges, upload duration, repair timing, or shared-recovery delay. Replay the same cases/player counts after each change. Do not hide failures or tune on aggregate wins while one player-count group consistently loses.

## Release evidence

Keep device exports, anonymized round exports and consented gameplay recordings. Record the deployed commit, date, phone/browser versions and observer. Human feedback remains uncollected until people actually play.
