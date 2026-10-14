import { getInvoiceOutstanding } from "./invoices.js";

const toPaise = (value) => Math.round((Number(value) || 0) * 100);
const fromPaise = (value) => value / 100;

export const getCustomerInvoices = (customerId, invoices) =>
  invoices.filter(
    (invoice) => String(invoice.customerId) === String(customerId),
  );

export const getCustomerOutstanding = (customerId, invoices) =>
  getCustomerInvoices(customerId, invoices).reduce(
    (total, invoice) => total + getInvoiceOutstanding(invoice),
    0,
  );

export const getCustomerAdvance = (customer) =>
  (customer.payments || []).reduce(
    (total, payment) => total + toPaise(payment.unappliedAmount),
    0,
  ) / 100;

export const getCustomerCreditExposure = (customer, invoices) =>
  Math.max(
    0,
    getCustomerOutstanding(customer.id, invoices) -
      getCustomerAdvance(customer),
  );

const compareInvoicesByDueDate = (left, right) =>
  String(left.dueDate || left.date || "").localeCompare(
    String(right.dueDate || right.date || ""),
  );

export const recordCustomerPayment = ({
  customer,
  invoices,
  amount,
  method,
  reference = "",
  date = new Date().toISOString().split("T")[0],
}) => {
  const amountPaise = toPaise(amount);
  if (amountPaise <= 0) {
    throw new Error("Enter a payment amount greater than zero.");
  }

  const receiptId = Date.now();
  let remainingPaise = amountPaise;
  const allocations = [];
  const eligibleInvoices = getCustomerInvoices(customer.id, invoices)
    .filter((invoice) => getInvoiceOutstanding(invoice) > 0)
    .sort(compareInvoicesByDueDate);
  const invoiceUpdates = new Map();

  for (const invoice of eligibleInvoices) {
    if (remainingPaise <= 0) break;
    const outstandingPaise = toPaise(getInvoiceOutstanding(invoice));
    const allocatedPaise = Math.min(outstandingPaise, remainingPaise);
    const amountPaidPaise = toPaise(invoice.amountPaid) + allocatedPaise;
    const payment = {
      id: `${receiptId}-${invoice.id}-${allocations.length}`,
      amount: fromPaise(allocatedPaise),
      date,
      method,
      reference: reference.trim(),
    };
    const updatedInvoice = {
      ...invoice,
      amountPaid: fromPaise(amountPaidPaise),
      paymentStatus:
        amountPaidPaise >= toPaise(invoice.total) ? "paid" : "partial",
      payments: [...(invoice.payments || []), payment],
    };

    invoiceUpdates.set(invoice.id, updatedInvoice);
    allocations.push({ invoiceId: invoice.id, amount: payment.amount });
    remainingPaise -= allocatedPaise;
  }

  const receipt = {
    id: receiptId,
    amount: fromPaise(amountPaise),
    date,
    method,
    reference: reference.trim(),
    allocations,
    unappliedAmount: fromPaise(remainingPaise),
  };
  const updatedCustomer = {
    ...customer,
    payments: [...(customer.payments || []), receipt],
  };

  return {
    customer: updatedCustomer,
    invoices: invoices.map((invoice) => invoiceUpdates.get(invoice.id) || invoice),
    receipt,
  };
};

export const applyCustomerAdvanceToInvoice = ({
  customer,
  invoices,
  invoiceId,
}) => {
  const invoice = invoices.find(
    (candidate) => String(candidate.id) === String(invoiceId),
  );
  if (
    !invoice ||
    String(invoice.customerId) !== String(customer.id) ||
    getInvoiceOutstanding(invoice) <= 0
  ) {
    return { customer, invoices, amountApplied: 0 };
  }

  let remainingPaise = toPaise(getInvoiceOutstanding(invoice));
  const invoicePayments = [];
  const updatedPayments = (customer.payments || []).map((receipt) => {
    const availablePaise = toPaise(receipt.unappliedAmount);
    const allocatedPaise = Math.min(availablePaise, remainingPaise);
    if (allocatedPaise <= 0) return receipt;

    remainingPaise -= allocatedPaise;
    const allocation = {
      invoiceId: invoice.id,
      amount: fromPaise(allocatedPaise),
    };
    invoicePayments.push({
      id: `advance-${receipt.id}-${invoice.id}-${(receipt.allocations || []).length}`,
      amount: allocation.amount,
      date: receipt.date,
      method: `Advance (${receipt.method})`,
      reference: receipt.reference || "Customer advance",
    });

    return {
      ...receipt,
      allocations: [...(receipt.allocations || []), allocation],
      unappliedAmount: fromPaise(availablePaise - allocatedPaise),
    };
  });

  const amountAppliedPaise = toPaise(getInvoiceOutstanding(invoice)) - remainingPaise;
  if (amountAppliedPaise <= 0) {
    return { customer, invoices, amountApplied: 0 };
  }

  const amountPaidPaise = toPaise(invoice.amountPaid) + amountAppliedPaise;
  const updatedInvoice = {
    ...invoice,
    amountPaid: fromPaise(amountPaidPaise),
    paymentStatus:
      amountPaidPaise >= toPaise(invoice.total) ? "paid" : "partial",
    payments: [...(invoice.payments || []), ...invoicePayments],
  };

  return {
    customer: { ...customer, payments: updatedPayments },
    invoices: invoices.map((candidate) =>
      String(candidate.id) === String(invoice.id) ? updatedInvoice : candidate,
    ),
    amountApplied: fromPaise(amountAppliedPaise),
  };
};

export const addInvoicePaymentToCustomer = (customer, invoice, payment) => {
  if (!customer) return null;
  const receipt = {
    id: payment.id,
    amount: payment.amount,
    date: payment.date,
    method: payment.method,
    reference: payment.reference,
    allocations: [{ invoiceId: invoice.id, amount: payment.amount }],
    unappliedAmount: 0,
  };
  return { ...customer, payments: [...(customer.payments || []), receipt] };
};

export const releaseInvoiceAllocations = (customer, invoiceId) => {
  if (!customer) return null;
  return {
    ...customer,
    payments: (customer.payments || []).map((receipt) => {
      const releasedPaise = (receipt.allocations || [])
        .filter(
          (allocation) =>
            String(allocation.invoiceId) === String(invoiceId),
        )
        .reduce((sum, allocation) => sum + toPaise(allocation.amount), 0);
      if (releasedPaise <= 0) return receipt;
      return {
        ...receipt,
        allocations: (receipt.allocations || []).filter(
          (allocation) =>
            String(allocation.invoiceId) !== String(invoiceId),
        ),
        unappliedAmount: fromPaise(
          toPaise(receipt.unappliedAmount) + releasedPaise,
        ),
      };
    }),
  };
};