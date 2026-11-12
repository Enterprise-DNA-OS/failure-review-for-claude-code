# CLI reference

Use Node 22.13 or later. All options use --key=value. Quote values containing spaces. Add --json for lossless machine output. Human output truncates long cells to 55 characters.

Reads: analyses, worksheet, risk-review, actions-due, high-severity, unreviewed, control-gaps, stale-analyses, owner-workload, recurring-causes, rating-gaps, compliance, attention, notes, audit, imports, controls, reviews, analysis, failure. Analysis and failure take one positional reference. References support exact codes, case-insensitive names and unique ID/code prefixes. Ambiguity lists candidates and exits 1.

## Writes

Every write needs --actor="Name". Names record attribution but do not authenticate a person. Errors roll the whole transaction back.

### add-analysis

Register an analysis. Use an actual rating catalogue reference.

`npm run review -- add-analysis --code=CODE --name="Name" --owner="Name" --rating-basis="Catalogue and version" --review-due=YYYY-MM-DD [--method=PFMEA|DFMEA] --actor="Name"`

### add-failure

Record a failure chain and the operator-provided ratings. Never infer the priority.

`npm run review -- add-failure --analysis=CODE --code=CODE --step="Process step" --function="Required function" --mode="Failure" --effect="Effect" --cause="Cause" [--prevention="Control"] [--detection="Control"] [--severity=1..10] [--occurrence=1..10] [--detection-rating=1..10] [--priority=H|M|L] [--priority-basis="Reviewed basis"] --actor="Name"`

### revise-failure

Revise known facts with a reason. The old review and control links become stale. Rating edits clear the priority basis unless supplied again.

`npm run review -- revise-failure --failure=CODE --reason="Correction reason" <one or more add-failure fields> --actor="Name"`

### add-action

Assign one improvement with a named owner and due date.

`npm run review -- add-action --failure=CODE --code=CODE --description="Action" --owner="Name" --due=YYYY-MM-DD --actor="Name"`

### complete-action

Record actual completion evidence. Completion is not verification.

`npm run review -- complete-action --action=CODE --evidence="Document or test reference" --actor="Name"`

### verify-action

Record verification by a different named reviewer. Re-complete an action if its failure revision changed.

`npm run review -- verify-action --action=CODE --evidence="Independent check reference" --actor="Name"`

### add-control

Link a control to the current failure revision. Retain previous records when adding a corrected control.

`npm run review -- add-control --failure=CODE --code=CODE --characteristic="Characteristic" --method="Check" --frequency="Frequency" --reaction="Reaction plan" --owner="Name" --actor="Name"`

### review-failure

Record a real engineering review. Requires ratings, their basis, priority basis and prevention/detection evidence. High priority requires an action or explicit rationale.

`npm run review -- review-failure --failure=CODE --evidence="Workshop record" [--rationale="Why current controls are accepted"] --actor="Name"`

### log

Append a factual follow-up note.

`npm run review -- log --analysis=CODE --body="Note" --actor="Name"`

### set-review-date

Record the next review date chosen by the team.

`npm run review -- set-review-date --analysis=CODE --due=YYYY-MM-DD --actor="Name"`

### import

Read docs/replace-pq-fmea.md first. Inspect the workbook and set exact column mapping and row bounds. Dry-run, reconcile, then import. Imported ratings and priorities are unreviewed.

`npm run review -- import pq-fmea --analysis=CODE --file=export.xlsx --mapping=map.json [--dry-run] --actor="Name"`

## Working papers

weekly-review combines three live reads. draft-fmea and draft-action-register take an analysis code. All write branded HTML under drafts. npm run docs renders all analysis papers and control plans. npm run view renders the weekly reports. OUTPUT_DIR overrides output root.

## Export

`npm run review -- export --out=/new/private/folder` exports eight JSON collections, including source workbook bytes in import_batches.json. The directory must not exist. Export is a portable record archive, not a restore implementation. Back up the whole database separately.
