import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTaxTotals } from "../src/utils/invoices.js";

test("percentage discounts reduce the taxable value before GST", () => {
  const totals = calculateTaxTotals(
    [{ name: "Goods", qty: 2, price: 100, gstRate: 18 }],
    { discountType: "percentage", discountValue: 10 },
  );

  assert.equal(totals.subtotal, 200);
  assert.equal(totals.discountAmount, 20);
  assert.equal(totals.taxableSubtotal, 180);
  assert.equal(totals.gstAmount, 32.4);
  assert.equal(totals.total, 212);
});

test("fixed discounts are shared proportionally across tax rates", () => {
  const totals = calculateTaxTotals(
    [
      { name: "Low tax", qty: 1, price: 100, gstRate: 5 },
      { name: "Standard tax", qty: 1, price: 100, gstRate: 18 },
    ],
    { discountType: "fixed", discountValue: 30 },
  );

  assert.equal(totals.discountAmount, 30);
  assert.deepEqual(
    totals.lineTotals.map(({ taxableValue, gstAmount }) => [
      taxableValue,
      gstAmount,
    ]),
    [
      [85, 4.25],
      [85, 15.3],
    ],
  );
  assert.equal(totals.total, 190);
});

test("discounts cannot reduce the taxable amount below zero", () => {
  const totals = calculateTaxTotals(
    [{ name: "Goods", qty: 1, price: 50, gstRate: 18 }],
    { discountType: "fixed", discountValue: 500 },
  );

  assert.equal(totals.discountAmount, 50);
  assert.equal(totals.taxableSubtotal, 0);
  assert.equal(totals.gstAmount, 0);
  assert.equal(totals.total, 0);
});