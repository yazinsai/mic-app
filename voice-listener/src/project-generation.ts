import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const MAX_SLUG_LENGTH = 48;

/**
 * Convert a project title into a safe folder slug.
 */
export function slugifyProjectName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "project";
}

export interface AllocatedProjectDirectory {
  relativePath: string;
  absolutePath: string;
}

/**
 * Allocate a unique project directory under ~/ai/projects.
 * If the base slug already exists, appends a numeric suffix (-2, -3, ...).
 */
export function allocateProjectDirectory(
  projectsDir: string,
  title: string,
): AllocatedProjectDirectory {
  const base = slugifyProjectName(title);

  let candidate = base;
  let counter = 2;

  while (existsSync(join(projectsDir, candidate))) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  const absolutePath = join(projectsDir, candidate);
  mkdirSync(absolutePath, { recursive: true });

  return {
    relativePath: candidate,
    absolutePath,
  };
}
