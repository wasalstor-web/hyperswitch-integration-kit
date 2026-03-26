import assert from "node:assert/strict";
import test from "node:test";
import { edfapayOperationHash } from "./edfapay.js";

test("edfapayOperationHash is deterministic", () => {
  const h1 = edfapayOperationHash("user@test.com", "5123456789012346", "pw");
  const h2 = edfapayOperationHash("user@test.com", "5123456789012346", "pw");
  assert.equal(h1, h2);
  assert.equal(h1.length, 32);
});

test("edfapayOperationHash changes when password changes", () => {
  const a = edfapayOperationHash("user@test.com", "5123456789012346", "a");
  const b = edfapayOperationHash("user@test.com", "5123456789012346", "b");
  assert.notEqual(a, b);
});

test("edfapayOperationHash strips non-digits from PAN", () => {
  const a = edfapayOperationHash("u@t.c", "5123-4567-8901-2346", "x");
  const b = edfapayOperationHash("u@t.c", "5123456789012346", "x");
  assert.equal(a, b);
});
