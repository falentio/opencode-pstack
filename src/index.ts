import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";
import { loadCatalog, loadSkillDefs, toSkillInfo } from "./catalog.ts";
import {
  findPotetoEvidenceV2,
  resumeSystemPart,
  takePendingResume,
  type PotetoEvidence,
} from "./poteto-compaction.ts";
import { buildPotetoTools } from "./poteto-tools/index.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

type SetupContext = Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0];

async function sessionDirectory(ctx: SetupContext, sessionID: string): Promise<string> {
  try {
    const session = (await ctx.session.get({ sessionID })) as unknown as {
      location?: { directory?: unknown };
    };
    const directory = session?.location?.directory;
    if (typeof directory === "string" && directory.length > 0) return directory;
  } catch {
    return process.cwd();
  }
  return process.cwd();
}

export default Plugin.define({
  id: "pstack",
  async setup(ctx) {
    const pendingResume = new Map<string, PotetoEvidence>();

    // NOTE (v2): the agent editor exposes update/remove/default but no add(),
    // so a plugin cannot inject agents. poteto-agent and comment-sicko ship as
    // agents/*.md for file-based install (.opencode/agents/); src/catalog.ts
    // still parses and validates them, but setup() deliberately registers no agents.
    const catalog = loadCatalog(packageRoot);
    if (!existsSync(catalog.skillsDir)) {
      console.error(`[@falentio/opencode-pstack] skills directory not found: ${catalog.skillsDir}`);
    } else {
      const skills = loadSkillDefs(catalog.skillsDir).map(toSkillInfo);
      const captured = skills;
      await ctx.skill.transform((editor) => {
        for (const skill of captured) {
          try {
            editor.add(skill);
          } catch (error) {
            console.error(`[@falentio/opencode-pstack] failed to register skill: ${String(error)}`);
          }
        }
      });
    }

    const tools = buildPotetoTools({ sessionDir: (sessionID) => sessionDirectory(ctx, sessionID) });
    const capturedTools = tools;
    await ctx.tool.transform((editor) => {
      for (const tool of capturedTools) {
        editor.add(tool);
      }
    });

    await ctx.session.hook("compaction", (event) => {
      const evidence = findPotetoEvidenceV2(event.messages as unknown as readonly unknown[]);
      if (!evidence) return;
      event.system.push(resumeSystemPart(evidence));
      pendingResume.set(event.sessionID, evidence);
    });

    await ctx.session.hook("context", (event) => {
      const evidence = takePendingResume(pendingResume, event.sessionID);
      if (!evidence) return;
      event.system.push(resumeSystemPart(evidence));
    });

    const controller = new AbortController();
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type === "session.deleted") {
            const sessionID = (event as unknown as { data?: { sessionID?: unknown } }).data?.sessionID;
            if (typeof sessionID === "string") pendingResume.delete(sessionID);
          }
        }
      } catch {
        return;
      }
    })();

    return () => controller.abort();
  },
});
