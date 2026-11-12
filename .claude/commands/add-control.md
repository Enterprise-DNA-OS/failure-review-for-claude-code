# add-control

Link a control to the current failure revision. Retain previous records when adding a corrected control.

Read the existing record first. Resolve ambiguous names before writing. Use a named operator from this session, never a made-up actor.

`npm run review -- add-control --failure=CODE --code=CODE --characteristic="Characteristic" --method="Check" --frequency="Frequency" --reaction="Reaction plan" --owner="Name" --actor="Name"`

Read back the result. Nothing sends or releases a process.
