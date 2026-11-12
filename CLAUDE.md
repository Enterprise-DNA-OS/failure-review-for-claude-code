# Failure Review for Claude Code

For a quality team maintaining failure analyses, corrective actions and review evidence. Ask the operator for their business and role when needed.

Read docs/cli.md and the matching .claude/commands recipe. Every answer about records starts with the CLI. Read the full record before writing. Use named actors and real evidence. Never invent ratings, priorities, due dates, reviews or completion.

## Rules

- No sending, process release, safety certification or deletion. Draft locally.
- Review records against the team's licensed methodology and customer requirements. Compliance checks are record checks only.
- Source imports and notes are immutable. Correct by adding evidence or revising a failure with a reason.
- Any failure edit invalidates its review and control links.
- A different named reviewer verifies a completed action. Names are audit labels, not authenticated identity.
- Never seed a live database. Back up and test recovery before shared use.
- Put private workbooks, exports and credentials outside Git.
- DATABASE_URL uses Postgres; otherwise .data/db uses PGlite. One database, one trusted operator connection.

## Routing

| Job | Recipe |
|---|---|
| analyses | /analyses |
| worksheet | /worksheet |
| risk-review | /risk-review |
| actions-due | /actions-due |
| high-severity | /high-severity |
| unreviewed | /unreviewed |
| control-gaps | /control-gaps |
| stale-analyses | /stale-analyses |
| owner-workload | /owner-workload |
| recurring-causes | /recurring-causes |
| rating-gaps | /rating-gaps |
| compliance | /compliance |
| attention | /attention |
| notes | /notes |
| audit | /audit |
| imports | /imports |
| controls | /controls |
| reviews | /reviews |
| analysis | /analysis |
| failure | /failure |
| add-analysis | /add-analysis |
| add-failure | /add-failure |
| revise-failure | /revise-failure |
| add-action | /add-action |
| complete-action | /complete-action |
| verify-action | /verify-action |
| add-control | /add-control |
| review-failure | /review-failure |
| log | /log |
| set-review-date | /set-review-date |
| import | /import |
| weekly-review | /weekly-review |
| draft-fmea | /draft-fmea |
| draft-action-register | /draft-action-register |
| export | /export |
| customise | /customise |
| new-view | /new-view |

Run npm run review -- help for the command list. The one CLI is scripts/review.mjs. Schema lives in supabase/migrations, documents in documents.json, views in views.json, brand in brand.json.
