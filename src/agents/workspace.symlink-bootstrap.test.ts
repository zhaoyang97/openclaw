import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTempWorkspace } from "../test-helpers/workspace.js";
import { DEFAULT_MEMORY_FILENAME, loadWorkspaceBootstrapFiles } from "./workspace.js";

describe("workspace bootstrap symlink escape hatch", () => {
  let workspaceDir: string;
  let sharedDir: string;
  let sharedMemoryPath: string;
  let workspaceMemoryPath: string;

  const envKey = "OPENCLAW_ALLOW_EXTERNAL_BOOTSTRAP_SYMLINKS";
  const prevEnv = process.env[envKey];

  beforeEach(async () => {
    workspaceDir = await makeTempWorkspace("openclaw-symlink-bootstrap-test-");
    sharedDir = path.join(os.homedir(), ".openclaw", "shared-bootstrap-test");
    await fs.mkdir(sharedDir, { recursive: true });

    sharedMemoryPath = path.join(sharedDir, DEFAULT_MEMORY_FILENAME);
    workspaceMemoryPath = path.join(workspaceDir, DEFAULT_MEMORY_FILENAME);
  });

  afterEach(async () => {
    process.env[envKey] = prevEnv;
    // best effort cleanup
    await fs.unlink(workspaceMemoryPath).catch(() => {});
    await fs.unlink(sharedMemoryPath).catch(() => {});
    await fs.rmdir(sharedDir).catch(() => {});
  });

  it("loads MEMORY.md via symlink to ~/.openclaw when explicitly enabled", async () => {
    if (process.platform === "win32") {
      // symlink permissions are inconsistent on windows in CI
      return;
    }

    const content = "# Shared memory\n\nHello\n";
    await fs.writeFile(sharedMemoryPath, content, "utf-8");

    await fs.symlink(sharedMemoryPath, workspaceMemoryPath);
    process.env[envKey] = "1";

    const files = await loadWorkspaceBootstrapFiles(workspaceDir);
    const memory = files.find((f) => f.name === DEFAULT_MEMORY_FILENAME);

    expect(memory?.missing).toBe(false);
    expect(memory?.content).toBe(content);
  });
});
