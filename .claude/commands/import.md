# import

Read docs/replace-pq-fmea.md first. Inspect the workbook and set exact column mapping and row bounds. Dry-run, reconcile, then import. Imported ratings and priorities are unreviewed.

Read the existing record first. Resolve ambiguous names before writing. Use a named operator from this session, never a made-up actor.

`npm run review -- import pq-fmea --analysis=CODE --file=export.xlsx --mapping=map.json [--dry-run] --actor="Name"`

Read back the result. Nothing sends or releases a process.
