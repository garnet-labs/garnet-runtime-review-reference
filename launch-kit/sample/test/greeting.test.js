import assert from "node:assert/strict";
import test from "node:test";
import { greet } from "../greeting.js";

test("greets the reader by name", () => {
  assert.equal(greet("Garnet"), "Hello, Garnet!");
});
