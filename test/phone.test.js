import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidPhoneNumber } from "../src/utils/phone.js";

test("mobile numbers accept common international formatting", () => {
  assert.equal(isValidPhoneNumber("+91 98765-43210"), true);
  assert.equal(isValidPhoneNumber("(555) 010-1234"), true);
});

test("mobile numbers reject missing, too-short, too-long, and malformed values", () => {
  assert.equal(isValidPhoneNumber(""), false);
  assert.equal(isValidPhoneNumber("12345"), false);
  assert.equal(isValidPhoneNumber("1234567890123456"), false);
  assert.equal(isValidPhoneNumber("++91 9876543210"), false);
});