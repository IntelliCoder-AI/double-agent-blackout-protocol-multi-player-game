# Case 01 — The Ninety-Second Ghost

These are the implemented B1 rules. Balance is provisional until human multiplayer playtests are completed.

## The provable truth

A memory core was physically taken during event E-401 at 02:14 UTC. Surveillance local time runs 90 seconds ahead, so its frame shows 02:15:30. The camera silhouette identifies one ambiguous group; a separate authenticated credential identifies another. Their intersection contains exactly one suspect, the culprit. The two credential factors cannot be transferred during the recorded interval.

The six sources are the camera export, access log, clock receipt, personnel custody rule, immutable frame signature and core-bay recorder. Sources are divided without using the player's role. The camera and access-log keys always go to different players. A traitor can change the camera's claimed UTC timestamp, but never the signed source or candidate sets. Verification restores canonical content and retains a visible discrepancy receipt.

Evidence terminals currently occupy fixed positions. Assignments, suspect groups and roles are randomized. Randomized terminal placement and additional cases are not implemented in this checkpoint.

## Round timing

| Phase / action | Rule |
| --- | --- |
| Secret reveal | 8 seconds |
| Investigation | 270 seconds; reactor repair adds 20 seconds once |
| Discussion | 45 seconds; both supported wall comparisons add 15 seconds |
| Vote | 30 seconds |
| Runoff | One additional 15-second ballot if needed |
| Evidence scan | 2.5-second proximity channel |
| Verification | 6 seconds; surveillance repair reduces this to 4 seconds |
| Emergency abort | 6-second proximity channel |
| Shared recovery | Unlocks at 120 investigation seconds |

Shared recovery allows any operative to recover an unshared clue and automatically publish a recovery copy. This prevents permanent withholding or disconnection deadlocks. Before that point, only the assigned operative can scan the source. A player must reach the Operations console to publish a normal private record or establish a verified comparison.

## Living Evidence Wall

Published evidence is synchronized to the team. Authentication requires a physical verification terminal. A supported link requires both records to be shared and verified, the correct pair, a matching relationship, and the actual supporting value:

- Clock receipt + camera export: corrected UTC must be `02:14:00`.
- Core-bay event + access log: signed event identifier must be `E-401`.

Other pairs, unsupported values, repeated links and overly frequent attempts are rejected. The wall never accepts arbitrary connections as proof. Every non-abstaining ballot must attach a source published on this wall. Comparison bonuses help deliberation; a correct indictment does not require completing every repair or comparison.

## Repairs

Each shared repair advances through three server-checked steps, with a minimum 0.9 seconds between accepted steps. The client presents distinct interactions: match a surveillance waveform frequency, route an uplink symbol circuit, and match the reactor pressure setting. Completed repairs cannot be undone, repeated for time, or exploited for score.

- Surveillance: faster verification.
- Uplink: permanently blocks exfiltration, including an upload already in progress.
- Reactor: adds 20 investigation seconds.
- Any two completed repairs also permanently block exfiltration and preserve a draw if no indictment is reached.

## Sabotage and counterplay

Social mode has one traitor for all supported 3–8-player rosters. The traitor has 4 charges for 3–5 players and 5 for 6–8. Every committed sabotage starts a 35-second shared cooldown. Moving away cancels the interaction; failed/cancelled actions do not spend charges.

| Ability | Cost / limit | Counterplay |
| --- | --- | --- |
| Forge camera UTC | 2 charges; once; only before verification | Compare clock and frame, then authenticate either verifier |
| Jam verifier | 1 charge; 10 seconds; each verifier once, two total | Use the other verifier or wait |
| Stall repair | 1 charge; 4 seconds; once | Wait; completed repairs stay complete |
| Exfiltrate | 2 charges; once; 40-second announced upload | Emergency abort, uplink isolation, or any two repairs |

Forgery/jam/delay need a two-second channel at their physical console; exfiltration needs three seconds at the external uplink. Exfiltration unlocks at 90 seconds and requires at least 45 investigation seconds remaining, fewer than two completed repairs and an unrepaired uplink.

Co-op assigns both humans loyal roles. One of three NPC suspects is the culprit. At 45 seconds the NPC forges the camera export if possible, otherwise briefly jams a verifier. At 180 seconds it attempts an announced upload unless repairs already blocked exfiltration. These scripted NPC interventions are independent of human-role assignment.

## Voting, outcomes and interruption

- The server validates suspects, sources, phase and deadline. Votes remain private until the outcome; the player can revise a ballot until voting closes.
- A valid indictment needs a unique leading suspect, at least two nominations, and participation from `max(2, ceil(roster / 2))` players. Abstentions count as participation, not nominations. Co-op therefore requires both players to agree.
- A correct indictment wins for the agents even without repairs. A wrong indictment wins for the traitor. An unopposed completed upload wins immediately for the traitor.
- A tie or insufficient support triggers one runoff. Tied leaders are the runoff choices; otherwise the original roster remains eligible. If still inconclusive, two repairs produce a draw; otherwise the traitor wins.
- Cast ballots remain valid if their author disconnects. Missing players are not silently removed from the denominator. If connected quorum is missing at vote closure, one 20-second reconnect grace is allowed, then no score is awarded if quorum remains missing.
- Missing investigation quorum pauses progression for a cumulative maximum of 45 seconds. A failure to restore quorum ends without score. A host disconnected for 15 seconds transfers host control to a connected member.
- Winning humans receive 100 cumulative points, a draw gives 25, and a no-contest gives zero. In co-op an NPC victory awards neither human a win. The host can reopen the same room for a rematch.

Human balance testing, adversarial latency testing and practical repair-duration tuning remain release gates; mathematical case validity alone does not establish that the game is balanced or fun.
