### Runtime forensics

**Own the diagnosis. Instrument the live process. Do not theorize from source.** Use this playbook for "why is X leaking / spinning / slow at runtime", heap snapshots, idle-but-busy processes, and intermittent glitches. The deliverable is a cited diagnosis, not a fix.

1. Capture the live signal on the matching surface via the control skill. Use a CPU profile for a spinning process, a heap snapshot for a leak, and a CDP trace for a visual glitch. Capture a real artifact, not a guess. **Complete when the matching artifact exists at a recorded path and its surface and symptom are recorded.**
2. Reduce the artifact to the smoking gun. Identify the function on the hot path, the retainer chain from the leaked object to a GC root, or the loop firing without input. Parse large artifacts in a subagent with the [guard-the-context-window principle skill](../../principle-guard-the-context-window/SKILL.md). Keep the reduced finding in the main thread. **Complete when the main thread records one reduced finding that identifies the hot-path function, the leaked-object retainer chain, or the input-free loop.**
3. Prove the mechanism before believing it. Inject instrumentation via CDP eval on the running process, or hotfix the live code without reloading, to confirm the hypothesis cheaply. A plausible but unconfirmed cause can be wrong while the real cause sits one layer over. **Complete when the live check confirms the mechanism and the result is recorded.**
4. Map the finding back to source. Record the file, symbol, and line that allocates or schedules. **Complete when the diagnosis names the source file, symbol, and allocation or scheduling line.**
5. Keep the throughput checkpoint to one line. Record exactly `throughput checkpoint: n/a, read-only forensics`. **Complete when the checkpoint contains exactly that one line.**

**Reply.** Include the signal captured, the reduced finding, how you proved the mechanism, the source location, and the artifact paths. Do not include a fix unless asked. Hand the work back to Bug fix or Perf once the cause is known.
