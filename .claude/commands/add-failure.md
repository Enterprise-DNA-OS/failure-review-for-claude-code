# add-failure

Record a failure chain and the operator-provided ratings. Never infer the priority.

Read the existing record first. Resolve ambiguous names before writing. Use a named operator from this session, never a made-up actor.

`npm run review -- add-failure --analysis=CODE --code=CODE --step="Process step" --function="Required function" --mode="Failure" --effect="Effect" --cause="Cause" [--prevention="Control"] [--detection="Control"] [--severity=1..10] [--occurrence=1..10] [--detection-rating=1..10] [--priority=H|M|L] [--priority-basis="Reviewed basis"] --actor="Name"`

Read back the result. Nothing sends or releases a process.
