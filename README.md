# ShiftWeave

An explainable same-day volunteer roster planner. Built for LaunchPad Hacks by Aditya Mittal with OpenAI Codex,22October2026.

## Run and test

No package installation or API key. With Python3, run from this directory:
```
python -m http.server 4177 --bind 127.0.0.1
```
Open http://127.0.0.1:4177/ . Node18+ tests:
```
node --test tests/*.test.js
```
Alternatively extract ShiftWeave-demo.zip and open ShiftWeave.html. That bundled build has all CSS/JavaScript inline and needs no server or internet. The multi-file source index.html uses ES modules and requires HTTP.

## Core behavior

Edit duties and volunteer roles, availability, duty/minute limits and rest gap. Build a roster; review coverage and workloads; approve; download a JSON review or print. Changing any input invalidates approval. Inputs and exports are local and include names/availability: use pseudonyms, store responsibly, confirm actual arrangements yourself.

Limits:16people,12same-dayduties,24places,50,000searchstates;100KBinputJSON. No multi-day/calendar import, routing, maximum-coverage solver or fairness optimization. A complete result is first feasible, not best balanced. Infeasible means no complete roster under the stated constraints within an exhausted search. Search-limit means unresolved. Partial results are not guaranteed maximum coverage. Input correctness and real availability are the organizer's responsibility. No staffing law or fatigue-compliance claim.

Algorithm: minimum-remaining-values slot selection, lower assigned-count preference and lower flexibility tie-break, deterministic bounded backtracking. Independent audit of returned assignments. Tests include an independent exhaustive small-instance oracle, not only production-function comparisons. No runtime AI. No backend, analytics, network calls or browser persistence. UI renders untrusted strings using textContent.

## Provenance

New code created22October2026, inside LaunchPad's published16October–20Novemberbuildwindow. No earlier entry source reused. Aditya authorized scope and workflow; Codex researched, proposed, generated code/tests and performed development verification. No manual authorship, volunteer interviews, real event usage, time savings or personal learning are claimed. Third-party application dependencies/assets: none; system fonts only. MIT license. See submission materials outside source package for verification and event details.
