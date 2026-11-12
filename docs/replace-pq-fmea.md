# Bring PQ-FMEA+ records across

PQ-FMEA+ documents XLSX exports for its FMEA sheet, control plan and process flow in its [export help](https://pq-fmea.com/about-program/printout-and-export/). Its [documentation guide](https://pq-fmea.com/step-7-in-fmea-documentation/) names Files > Export AIAG-VDA to XLSX. Its [2.12.0 release notes](https://pq-fmea.com/pq-fmea-update-2-12-0/) allow filtered-row exports, so clear filters or record that the extract is partial. Sources checked 12 November 2026.

## Switch procedure

1. Export the FMEA worksheet as XLSX. Retain the original. Clear filters for a complete transfer.
2. Inspect the sheet, including merged cells and multi-row headings. Create a mapping with the exact sheet name, first and last data row and 1-based column numbers. examples/pq-mapping.json is a synthetic example, not a claim that every vendor workbook uses these positions.
3. Create an empty analysis with add-analysis, its real owner and the rating catalogue reference.
4. Run one import command first with --dry-run, reconcile every failure, then rerun without it.

`npm run review -- import pq-fmea --analysis=LINE-A --file=imports/export.xlsx --mapping=imports/map.json --actor="Name" --dry-run`

The same command without --dry-run commits the import. Repeat identical bytes and mapping in the same analysis safely: the import skips. A changed workbook requires a new empty analysis for reconciliation. It never silently replaces an existing reviewed analysis.

## Mapping and preservation

Required columns: process_step, function_text, mode, effect, cause. Optional columns: prevention, detection, severity, occurrence, detection_rating, action_priority, priority_basis. Missing optional ratings stay unknown. Ratings must be integer 1..10; priority H/M/L remains an unreviewed source value. Fill priority_basis from the actual methodology before review.

The mapping selects exact data bounds, avoiding titles and repeated footer rows. Excel merged cells resolve to their master value. Nonempty rows missing a required field fail the entire import. Completely blank rows are counted separately. Formula cells are rejected; export their displayed values into a separate workbook and retain the original outside the tool if necessary. Legacy XLS, macros, encrypted workbooks and images are not imported. Limits: 20 MiB file and 20,000 data rows.

The original XLSX bytes, SHA-256 digest, mapping, actor, source row numbers and all cell values within the mapped rows are stored. Unmapped action columns are preserved as source values but do not become live actions. Review and add owners, deadlines, actions and control-plan records explicitly. Attachments, process diagrams, historical approvals, custom rating definitions and account permissions are not reconstructed. The export contains the source bytes so they can be recovered and re-hashed.

## Proof and acceptance

Tests use an honestly labelled synthetic XLSX with multi-row headings, merged cells, missing ratings, formula rejection and malformed rows. No customer or vendor-generated sample workbook was available in this run. Validate a representative actual export before a live switch. Compare the mapped range, nonblank row count, every failure chain, ratings and priority with PQ-FMEA+. Keep both systems until engineering accepts the mapping and records.

The import is one command after mapping. Mapping and acceptance are real work, not a promise of zero-effort compatibility. Enterprise DNA can perform them as part of your version.
