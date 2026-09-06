### Investigation

**You own the answer. Plan, route, write.**

Use this playbook for a read-only request such as "how does X work?", "why was Y built this way?", "are we sure about Z?", or "should we do X or Y?". Produce a cited explanation or a recommendation. Keep the run read-only.

1. Route the question through the right mode.
   - Send a narrow question through the `how` skill in Explain mode.
   - Send an "are we sure?" question through the `how` skill in Critique mode.
   - Also send a motivation question through the `why` skill.
   - **Completion check.** The route names the selected `how` mode and includes `why` when the question asks for motivation.
2. Record the throughput checkpoint on one line. Write exactly

   `throughput checkpoint: n/a, read-only investigation`

   Use the four-item version only for code-shaped work.
   - **Completion check.** The checkpoint is exactly one line with the required text, and the four-item checkpoint is absent.
3. Produce the investigation output.
   - Use the `how` shape `Overview / Key Concepts / How It Works / Where Things Live / Gotchas` for an explanation.
   - Give a recommendation with a tradeoffs table when the request compares alternatives.
   - Cite the evidence for every material claim.
   - **Completion check.** The output has the required explanation shape or the required recommendation shape, and every material claim has a citation.
4. Apply the `unslop` skill to the reply.
   - **Completion check.** The final reply passes `unslop` and keeps the selected output shape, its citations, and any required judgment.

**Safety boundary.** No PR, no babysit, and no `architect` unless the investigation precedes a code change. If it does, hand the work back to the user and re-route to Bug fix or Feature. Stop before implementation.

**Reply.** Return the investigation output. For an "are we sure?" answer, include your real judgment with reasons. Push back when the premise is wrong. Follow Autonomy.
