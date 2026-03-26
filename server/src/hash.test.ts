import assert from "node:assert/strict";
import { test } from "node:test";
import { sha256Hex } from "./hash.js";

test("sha256Hex is stable for same input", () => {
  const a = sha256Hex("hello");
  const b = sha256Hex("hello");
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("sha256Hex differs for different input", () => {
  assert.notEqual(sha256Hex("a"), sha256Hex("b"));
});
