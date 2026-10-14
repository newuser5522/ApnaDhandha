import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCustomerAdvanceToInvoice,
  getCustomerAdvance,
  getCustomerCreditExposure,
  getCustomerOutstanding,
  recordCustomerPayment,
  releaseInvoiceAllocations,
} from "../src/utils/customerLedger.js";

const customer = { id: "customer-1", name: "Customer", payments: [] };

test("customer receipts allocate across unpaid invoices in due-date order", () => {
  const invoices = [
    {
      id: "later",
      customerId: customer.id,
      dueDate: "2026-03-01",
      total: 50,
      amountPaid: 0,
    },
    {
      id: "earlier",
      customerId: customer.id,
      dueDate: "2026-02-01",
      total: 100,
      amountPaid: 0,
    },
  ];

  const result = recordCustomerPayment({
    customer,
    invoices,
    amount: 120,
    method: "UPI",
    reference: "UPI-123",
    date: "2026-02-10",
  });

  assert.deepEqual(
    result.receipt.allocations.map(({ invoiceId, amount }) => [
      invoiceId,
      amount,
    ]),
    [
      ["earlier", 100],
      ["later", 20],
    ],
  );
  assert.equal(getCustomerOutstanding(customer.id, result.invoices), 30);
  assert.equal(result.receipt.unappliedAmount, 0);
});

test("unallocated receipts remain as advances and can pay a later invoice", () => {
  const firstInvoice = {
    id: "first",
    customerId: customer.id,
    dueDate: "2026-02-01",
    total: 100,
    amountPaid: 0,
  };
  const receipt = recordCustomerPayment({
    customer,
    invoices: [firstInvoice],
    amount: 120,
    method: "Cash",
    date: "2026-02-10",
  });

  assert.equal(getCustomerAdvance(receipt.customer), 20);
  const nextInvoice = {
    id: "next",
    customerId: customer.id,
    dueDate: "2026-03-01",
    total: 50,
    amountPaid: 0,
  };
  const applied = applyCustomerAdvanceToInvoice({
    customer: receipt.customer,
    invoices: [...receipt.invoices, nextInvoice],
    invoiceId: nextInvoice.id,
  });

  assert.equal(applied.amountApplied, 20);
  assert.equal(applied.invoices.find((invoice) => invoice.id === "next").amountPaid, 20);
  assert.equal(getCustomerAdvance(applied.customer), 0);
});

test("credit exposure subtracts advances and deleting an invoice releases its allocations", () => {
  const payments = [
    {
      id: "receipt-1",
      amount: 100,
      unappliedAmount: 25,
      allocations: [{ invoiceId: "invoice-1", amount: 75 }],
    },
  ];
  const account = { ...customer, payments };
  const invoices = [
    {
      id: "invoice-1",
      customerId: customer.id,
      total: 75,
      amountPaid: 75,
    },
    {
      id: "invoice-2",
      customerId: customer.id,
      total: 100,
      amountPaid: 0,
    },
  ];

  assert.equal(getCustomerCreditExposure(account, invoices), 75);
  const released = releaseInvoiceAllocations(account, "invoice-1");
  assert.equal(getCustomerAdvance(released), 100);
  assert.equal(
    released.payments[0].allocations.some(
      (allocation) => allocation.invoiceId === "invoice-1",
    ),
    false,
  );
});