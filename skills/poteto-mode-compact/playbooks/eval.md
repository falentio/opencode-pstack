### Eval

Own the experiment design. Plan, blind, run, and synthesize.

Use evals to test how a change affects agent behavior before promoting it. Test a new skill variant, a structural change, or a prompt tweak. Guard against the observer effect. An agent that knows it is being evaluated behaves differently, so every candidate must run blind.

#### Non-negotiables for blinding

- Put none of `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- Write the candidate prompt as an organic user request. State the goal, not the meta. Use "build me a small todo cli" rather than "show me how you follow the principles chain".
- Keep prompts free of chain-eliciting cues. Do not ask the candidate to list the skills, principles, or files it applied. Ask for design notes generally. Grade chain-following from code shape, not self-report. A meta-prompt inflates citation behavior.
- Sanitize directory and slug names. Use project-shaped names a user might pick, not labels such as `candidate-1` or `agent-a`.
- Keep candidates unaware that other candidates exist.
- The judge may know it is judging. Show outputs by sanitized label only. Never show the model name.
- When comparing two variants, use one judge to score both sets in one pass on one scale. Keep the judge blind to which set came from which variant. Two judge runs with different prompts do not compare because the calibration drifts.

#### Steps

1. **Frame.** State the variant under test and define the behavior that counts as success. Write a rubric for the judge only with 3-6 concrete criteria. Hold the rubric back from candidates.

   Completion criterion. The variant, success behavior, and judge-only rubric with 3-6 concrete criteria are recorded, and no candidate has received the rubric.

2. **Set up sanitized environments.** Create one working dir per candidate and put the variant in place. Plant the context an organic task would have, including a project skeleton and the skills the candidate would naturally read.

   Completion criterion. Each candidate has one separate working dir with the variant, project skeleton, and naturally read skills, and every directory and slug name is sanitized.

3. **Author one organic prompt.** Write the request a user would type. Keep the prompt free of clues about what behavior is measured.

   Completion criterion. One prompt exists, states only the user's goal, and contains no measurement clue or meta-prompt.

4. **Spawn N parallel candidates.** Use the inherited parent model and follow Phase B of the **arena** skill. Give every candidate the same prompt. Give each candidate its own sanitized dir.

   Completion criterion. N candidates have started in parallel with the inherited parent model, the same prompt, and distinct sanitized working dirs.

5. **Spawn one blinded judge.** After all candidates finish, use the inherited parent model and follow Phase C of the **arena** skill. Give the judge the rubric and outputs by sanitized label only.

   Completion criterion. One judge has scored all candidate outputs with the rubric, using sanitized labels and no model names.

6. **Verify the chain from transcripts, not self-report.** Read each candidate's local transcript under the active workspace's `agent-transcripts/` directory, which the system prompt names. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects. Inspect which files each candidate actually opened. Treat citing a principle without reading its leaf skill as not reading it. Treat reading a leaf skill without applying it as not applying it. Grade chain-following from the files each candidate really read and the shape of the code. Never grade it from a candidate's claims.

   Completion criterion. Every candidate transcript is read from `agent-transcripts/`, no cross-workspace glob was used, actual opened files are recorded, and each chain grade uses transcript evidence plus code shape rather than self-report.

7. **Read and synthesize.** Read every candidate output yourself end to end. Compare each output with the judge's verdict. If you disagree, classify the cause as model bias or rubric ambiguity. Synthesize the results.

   Completion criterion. Every output has been read end to end, every comparison is complete, every disagreement is classified as model bias or rubric ambiguity, and a synthesis is written.

#### Reply

Return these fields.

- Variant under test.
- Rubric.
- Per-candidate notes.
- Judge's verdict.
- Your synthesis.
- Recommendation for whether to promote the variant.

Completion criterion. The reply contains all six fields, and the recommendation states whether to promote the variant.
