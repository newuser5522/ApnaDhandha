import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeCsvRows } from "../src/utils/csv.js";

test("CSV export escapes delimiters and preserves UTF-8 spreadsheet content", () => {
  assert.equal(
    encodeCsvRows([
      ["SKU", "Product"],
      ["A,1", 'Cotton "Poplin"'],
    ]),
    '\uFEFF"SKU","Product"\r\n"A,1","Cotton ""Poplin"""',
  );
});

test("CSV export neutralizes formula-like strings without changing numeric values", () => {
  assert.equal(
    encodeCsvRows([['=HYPERLINK("https://example.test")', "-10", -10]]),
    '\uFEFF"\'=HYPERLINK(""https://example.test"")","\'-10","-10"',
  );
});
