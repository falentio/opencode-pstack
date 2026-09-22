import type { Info } from "@opencode/plugin/promise/tool";

export type SessionDir = (sessionID: string) => Promise<string>;

export type V2Tool = Info<any, any>;

export function staticSessionDir(directory: string): SessionDir {
  return async () => directory;
}
