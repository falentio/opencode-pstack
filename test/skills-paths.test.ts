import { test } from "node:test";
import assert from "node:assert/strict";
import type { Config } from "@opencode-ai/plugin";
import { skillsPaths } from "../src/index.ts";

test("skillsPaths creates the holder when skills is absent", () => {
  const config = {} as Config;
  assert.deepEqual(skillsPaths(config), []);
  assert.deepEqual((config as { skills?: unknown }).skills, { paths: [] });
});

test("skillsPaths creates paths when skills exists without paths", () => {
  const config = { skills: {} } as unknown as Config;
  assert.deepEqual(skillsPaths(config), []);
});

test("skillsPaths preserves existing entries and returns the live array", () => {
  const config = { skills: { paths: ["/a"] } } as unknown as Config;
  const paths = skillsPaths(config);
  paths.push("/b");
  assert.deepEqual(paths, ["/a", "/b"]);
  assert.deepEqual((config as { skills: { paths: string[] } }).skills.paths, ["/a", "/b"]);
});

test("skillsPaths replaces a malformed skills value instead of trusting it", () => {
  const asString = { skills: "foo" } as unknown as Config;
  assert.deepEqual(skillsPaths(asString), []);

  const badPaths = { skills: { paths: "x" } } as unknown as Config;
  assert.deepEqual(skillsPaths(badPaths), []);
});
