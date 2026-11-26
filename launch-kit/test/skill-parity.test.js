import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const clients = ["devin", "claude-code", "cursor"];
const skills = ["garnet-runtime-review", "garnet-runtime-review-before-ready", "garnet-runtime-review-install"];

test("all three Runtime Review plugins ship byte-identical copies of every canonical skill", async () => {
  for (const client of clients) {
    const directory = new URL(`../plugins/${client}/garnet-runtime-review/skills/`, import.meta.url);
    assert.deepEqual((await readdir(directory)).sort(), skills, client);
    for (const skill of skills) {
      const canonical = await readFile(new URL(`../skills/${skill}/SKILL.md`, import.meta.url));
      const copy = await readFile(new URL(`${skill}/SKILL.md`, directory));
      assert.deepEqual(copy, canonical, `${client}: ${skill}`);
    }
  }
});
