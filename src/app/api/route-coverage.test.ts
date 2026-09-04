import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "src/app/api");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("data route coverage", () => {
  it("wraps every data handler with withUser", () => {
    const routes = walk(API_ROOT).filter(
      (file) => !file.includes(`${path.sep}auth${path.sep}`),
    );
    expect(routes.length).toBeGreaterThanOrEqual(9);
    for (const file of routes) {
      const src = fs.readFileSync(file, "utf8");
      expect(src, file).toMatch(/withUser/);
    }
  });
});
