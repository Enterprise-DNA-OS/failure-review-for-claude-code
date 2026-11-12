# Failure Review for Claude Code

Failure analyses, corrective actions and review evidence in a database you own. MIT-licensed software from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free source code. Install, import and operate it. | Your fields, scoring references, control plans and PQ-FMEA+ exports mapped across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=pq-fmea). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=pq-fmea). |

## What this replaces

The weekly desk work around a failure analysis: bringing source records together, assigning improvements, following up due dates, checking review evidence and producing working papers. PQ-FMEA+ is desktop software with subscription and perpetual licences. Its [current price list](https://pq-fmea.com/price-list/), checked 12 November 2026, lists EUR 837 net per month on a twelve-month subscription, EUR 10,044 net for the year. Annual payment is lower at EUR 7,536 net. Those are tariffs, not a verified customer invoice. Compare the actual licence and payment terms before switching.

The free base stores process and design failure chains, recorded ratings, operator-assigned priorities, actions, control-plan links, reviews, source workbooks and change history. It calculates the product of severity, occurrence and detection ratings as RPN for reference. It does not calculate AIAG-VDA Action Priority, supply a licensed rating catalogue, certify compliance or release a process for production. Engineering owns those decisions. This is an independent implementation and is not affiliated with PQ-FMEA+.

## Quick start

Node 22.13 or later. The demo needs no server or account.

```bash
git clone https://github.com/Enterprise-DNA-OS/failure-review-for-claude-code.git
cd failure-review-for-claude-code
npm install
npm test
npm run demo
npm run review -- risk-review
npm run view
npm run docs
```

The seed is fictional and idempotent. It includes a past review date, overdue actions, missing ratings, a high-severity record and a stale analysis. Never seed a production database. A shared Postgres demo requires the explicit --demo-database argument to seed.mjs.

Without DATABASE_URL, PGlite persists under .data/db or DATA_DIR. With DATABASE_URL, the same migrations run on Postgres. Use npm run migrate for a new shared database. Access is intended for a trusted database operator. Row security is enabled and public access is revoked; this is not a multi-user authentication service. Named actors are audit labels, not verified identities.

## The weekly rituals

- `/risk-review` puts recorded priority, high severity, review state, actions and control coverage together.
- `/actions-due` finds late actions and completion evidence awaiting a second reviewer.
- `/control-gaps` shows controls that have not been linked to the current failure revision.
- `/rating-gaps` finds incomplete scores and missing methodology references.
- `/weekly-review` combines the engineering round, all record checks and due actions in one branded draft.

Every failure edit increments its revision. Earlier reviews and controls remain visible but no longer count as current. Rating edits clear the priority basis unless a new basis is supplied. A completed action needs a different named verifier and evidence from the current failure revision. A later edit flags previously verified evidence as stale too.

## Commands

There are 37 recipes in .claude/commands. The single CLI is `npm run review -- <command>`. Add --json for full machine-readable values. The human table trims long cells, so use --json or the generated papers for full text. [Complete syntax](docs/cli.md).

Reads: analyses, worksheet, risk-review, actions-due, high-severity, unreviewed, control-gaps, stale-analyses, owner-workload, recurring-causes, rating-gaps, compliance, attention, notes, audit, imports, controls, reviews, analysis and failure.

Writes: add-analysis, add-failure, revise-failure, add-action, complete-action, verify-action, add-control, review-failure, log, set-review-date and import. Every write needs --actor="Name". Exact codes, unique ID/code prefixes and case-insensitive names resolve records. Ambiguity lists candidates and exits 1.

Working papers: weekly-review, draft-fmea and draft-action-register write to drafts. Export writes all eight record collections, including original workbook bytes and change history, to a new private directory. /customise and /new-view are recipes for extending the schema and read-only reports.

## Ten questions to ask

Each question is answered by the current CLI. These are useful joins and local review rules, not an unsupported claim that PQ-FMEA+ cannot produce similar reports.

1. Which high-severity failures still have no current engineering review? `high-severity`
2. Which actions are late, and who owns them? `actions-due`
3. Which control-plan records no longer cover the current failure revision? `controls` and `control-gaps`
4. Which failure ratings are missing their methodology reference? `rating-gaps`
5. Which engineer has the largest overdue action list? `owner-workload`
6. Which causes recur across separate analyses? `recurring-causes`
7. Which analyses have had no edit or note in thirty days? `stale-analyses`
8. Which completions rely on an older failure revision? `actions-due` and `compliance`
9. Who changed this record, and what were its old values? `audit` and `export`
10. Which imported workbook supplied these failure rows? `imports` and `failure <reference>`

## Your first hour: ten things to ask for

1. Put our name, colours and logo in brand.json.
2. Run the fictional engineering round.
3. Read the missing-rating and late-action reports.
4. Create an analysis with our actual rating catalogue reference.
5. Inspect one PQ-FMEA+ export and map its columns.
6. Dry-run the import and reconcile every failure row.
7. Record the real prevention and detection evidence.
8. Assign one improvement with its owner and agreed date.
9. Review a failure and produce its working paper.
10. Set up controlled shared access, backups and a tested recovery process.

## Import and ownership

[Switching guide](docs/replace-pq-fmea.md). PQ-FMEA+ exports its FMEA sheet as XLSX. After an explicit column mapping, one command imports it with a dry-run option. The original bytes, hash, row numbers, mapped fields and unmapped source values remain in the database. Imported priorities are unreviewed. A malformed row aborts the whole import; identical bytes and mapping skip safely. A revised workbook goes into a new empty analysis for comparison.

The tests use a synthetic workbook, not a vendor-generated export. Validate the mapping against an actual export before a live switch. Diagrams, embedded media, custom rating definitions, action assignments, account permissions and historical approvals need separate work. An imported action column is retained as source evidence, not silently treated as an approved current action.

## Documents and read-only views

npm run docs generates a FMEA working paper and a control-plan/action register for every analysis. npm run view generates the weekly review and control revision report. Change brand.json once to set the business name, logo and colours. HTML is escaped and files are private local outputs. They are snapshots for review, not a live application. [Why no front end](docs/why-no-front-end.md).

## Record checks and recovery

[Compliance checks and sources](docs/compliance.md) describes R01-R08. A clean report means those record checks passed, not that a product is safe or certified. RPN is never an acceptance threshold. The operator supplies licensed methods and applicable customer requirements.

Reviews, notes, import batches and audit history are append-only through the application. Database owners can still change database controls. Do not describe this as tamper-proof. Keep private imports, exports and credentials out of Git. Export is a portable record archive, not a restoration command. Back up the complete database and test recovery separately.

## Validation

npm test uses a temporary embedded database and clears inherited DATABASE_URL. It exercises all commands, rating arithmetic, real calendar dates, stale review/control links, independent verification, import rollback and repeatability, original bytes, merged cells, missing values, formula rejection, HTML escaping, audit preservation and ambiguous names. CI runs Node 22 and 24 on Windows and Linux, plus PostgreSQL 16. FAILURE_TEST_POSTGRES_URL is only for a disposable test database.

## Installed for you

Enterprise DNA can map your PQ-FMEA+ export, adapt the review workflow and control-plan documents, and operate your version. Omni by Enterprise DNA is one setup fee, then a retainer. [Book Sam's 30-minute call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=pq-fmea).

MIT. Copyright 2026 Enterprise DNA.
