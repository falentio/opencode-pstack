import type { PluginInput } from "@opencode-ai/plugin";

export type PotetoMode = "full" | "compact";
export type PotetoEvidence = {
  kind: "slash-command" | "skill-call" | "agent-spawn";
  mode: PotetoMode;
  detail: string;
};

// @opencode-ai/plugin imports Message and Part for its own hooks but does not
// re-export them, so keep the narrow shape this hook actually reads.
type PotetoPart = {
  type: string;
  text?: unknown;
  tool?: unknown;
  state?: { input?: unknown };
};

type PotetoMessageInfo = { role: string };

export type PotetoSessionMessage = {
  info: PotetoMessageInfo;
  parts: PotetoPart[];
};

const MAX_MESSAGES = 300;
const SLASH_COMMAND_PATTERN = /(^|\s)\/(poteto-mode-compact|poteto-mode)(?![\w-])/;
const OPT_OUT_PATTERN = /\b(opt\s*-?\s*out|stop|disable|turn\s+off|exit|quit)\b/i;

type ResumePaths = Readonly<{
  skill: string;
  sessionPickup: string;
}>;

const RESUME_PATHS = {
  full: {
    skill: "skills/poteto-mode/SKILL.md",
    sessionPickup: "skills/poteto-mode/playbooks/session-pickup.md",
  },
  compact: {
    skill: "skills/poteto-mode-compact/SKILL.md",
    sessionPickup: "skills/poteto-mode-compact/playbooks/session-pickup.md",
  },
} as const satisfies Record<PotetoMode, ResumePaths>;

export function findPotetoEvidence(messages: readonly PotetoSessionMessage[]): PotetoEvidence | null {
  try {
    const limit = Math.min(messages.length, MAX_MESSAGES);
    for (let i = 0; i < limit; i++) {
      const message = messages[i];
      if (!message || !message.info || !Array.isArray(message.parts)) continue;
      const slash = matchSlashCommand(message);
      if (slash) return slash;
      const tool = matchToolPart(message);
      if (tool) return tool;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildResumeContext(evidence: PotetoEvidence): string {
  const paths = RESUME_PATHS[evidence.mode];
  return `Poteto mode was active via ${evidence.kind}. Re-read ${paths.skill} in full including the Principles index. Resume from the summary using ${paths.sessionPickup}. If the user opted out, ignore this note.`;
}

export async function handleCompacting(
  client: PluginInput["client"],
  sessionID: string,
  output: { context: string[]; prompt?: string },
): Promise<void> {
  try {
    const result = await client.session.messages({ path: { id: sessionID } });
    const data = (result as { data?: readonly PotetoSessionMessage[] }).data;
    if (!data) {
      const error = (result as { error?: unknown }).error;
      if (error) {
        await logError(client, "failed to list session messages for compaction", error);
      }
      return;
    }
    const evidence = findPotetoEvidence(data);
    if (!evidence) return;
    output.context.push(buildResumeContext(evidence));
  } catch (error) {
    await logError(client, "failed to list session messages for compaction", error);
  }
}

function matchSlashCommand(message: PotetoSessionMessage): PotetoEvidence | null {
  if (message.info.role !== "user") return null;
  const text = message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n");
  const match = SLASH_COMMAND_PATTERN.exec(text);
  if (!match) return null;
  if (OPT_OUT_PATTERN.test(text)) return null;
  return {
    kind: "slash-command",
    mode: match[2] === "poteto-mode-compact" ? "compact" : "full",
    detail: text.trim().slice(0, 200),
  };
}

function matchToolPart(message: PotetoSessionMessage): PotetoEvidence | null {
  for (const part of message.parts) {
    if (part.type !== "tool" || typeof part.tool !== "string") continue;
    const input = part.state?.input;
    if (part.tool === "skill") {
      const mode = matchSkillMode(input);
      if (mode) {
        const name = mode === "compact" ? "poteto-mode-compact" : "poteto-mode";
        return { kind: "skill-call", mode, detail: `skill tool invoked for ${name}` };
      }
    }
    if (part.tool === "task" && inputMentions(input, "poteto-agent")) {
      return { kind: "agent-spawn", mode: "full", detail: "task tool spawned poteto-agent" };
    }
  }
  return null;
}

function matchSkillMode(input: unknown): PotetoMode | null {
  const name = readStringField(input, "name");
  if (name === "poteto-mode") return "full";
  if (name === "poteto-mode-compact") return "compact";
  return null;
}

function readStringField(input: unknown, field: "name" | "subagent_type"): string | null {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object") return readStringField(parsed, field);
    } catch {
      return input;
    }
    return input;
  }
  if (!input || typeof input !== "object") return null;
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function inputMentions(input: unknown, needle: string): boolean {
  try {
    if (typeof input === "string") return input.toLowerCase().includes(needle);
    if (!input || typeof input !== "object") return false;
    return JSON.stringify(input).toLowerCase().includes(needle);
  } catch {
    return false;
  }
}

async function logError(client: PluginInput["client"], message: string, error: unknown): Promise<void> {
  try {
    await client.app.log({
      body: {
        service: "@falentio/opencode-pstack",
        level: "error",
        message,
        extra: { error: String(error) },
      },
    });
  } catch {
    return;
  }
}
