import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { allocateProjectDirectory, slugifyProjectName } from "./project-generation";

describe("slugifyProjectName", () => {
  test("creates a lowercase dash slug", () => {
    expect(slugifyProjectName("Build a Habit Tracker App!")).toBe("build-a-habit-tracker-app");
  });

  test("falls back to 'project' when title has no usable chars", () => {
    expect(slugifyProjectName("!!! ###")).toBe("project");
  });
});

describe("allocateProjectDirectory", () => {
  test("creates base directory from title", () => {
    const root = mkdtempSync(join(tmpdir(), "exec-project-gen-"));
    try {
      const out = allocateProjectDirectory(root, "Landing Page Generator");
      expect(out.relativePath).toBe("landing-page-generator");
      expect(out.absolutePath).toBe(join(root, "landing-page-generator"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("adds numeric suffix on collisions", () => {
    const root = mkdtempSync(join(tmpdir(), "exec-project-gen-"));
    try {
      mkdirSync(join(root, "landing-page-generator"), { recursive: true });
      const out = allocateProjectDirectory(root, "Landing Page Generator");
      expect(out.relativePath).toBe("landing-page-generator-2");
      expect(out.absolutePath).toBe(join(root, "landing-page-generator-2"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
