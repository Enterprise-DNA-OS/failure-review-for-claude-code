# Engineering review checks

Checked 12 November 2026. These are local record-quality controls. They do not implement a complete standard, approve a product, certify safety or replace engineering judgment. No protected rating catalogue is included.

[IEC 60812:2018](https://webstore.iec.ch/en/publication/26359) describes planning, documenting and maintaining failure analyses. Its public abstract gives the scope, not the licensed requirements. The operator supplies the applicable edition, rating catalogue and customer requirements.

[PQ-FMEA documentation guidance](https://pq-fmea.com/step-7-in-fmea-documentation/) describes revision history and action lists. [PQ-FMEA 2.12.0](https://pq-fmea.com/pq-fmea-update-2-12-0/) describes requiring a rating before confirming an effect. [Relyence's AP explanation](https://relyence.com/help/user-guide/fmea-ap.html) distinguishes Action Priority from severity times occurrence times detection.

| Rule | Local check | Basis and limit |
|---|---|---|
| R01 | All three integer ratings 1 through 10 and an analysis rating-basis reference | Explicit input validation for the chosen local model; no universal rating definitions supplied |
| R02 | Recorded H/M/L priority and a reference explaining it | An engineer supplies this; the software does not compute AIAG-VDA Action Priority |
| R03 | A named review for the current failure revision | Local implementation of revision traceability |
| R04 | A control record linked to the current failure revision | Local link check; does not prove that the control works |
| R05 | Prevention and detection descriptions present | Evidence completeness, not an assessment of adequacy |
| R06 | Outstanding action is past its operator-selected due date | Local workflow rule; no statutory deadline inferred |
| R07 | Completion evidence refers to an older failure revision | Re-completion required before verification; previously verified evidence is flagged too |
| R08 | Analysis review date missing or past | Local review cadence set by the team |

RPN is the product of the three recorded ratings. It is not an acceptance threshold and never replaces Action Priority. Severity 9 and 10 records have their own report. A high-priority review needs an action or an explicit rationale. Completion and verification are separate, and the reviewer must use a different name. This is a workflow rule, not identity authentication.

Failure edits leave earlier reviews intact and change their validity through revision comparison. Controls and action evidence remain visible when stale. Before relying on an analysis, qualified staff check the source records, scoring, control effectiveness and applicable requirements.
