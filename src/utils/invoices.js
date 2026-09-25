export const getPaymentTermDays = (paymentTerms) =>
  paymentTerms === "Cash" ? 0 : parseInt(paymentTerms?.split(" ")[1], 10) || 30;

export const DEFAULT_GST_RATE = 18;

export const getItemGstRate = (item) => {
  const rate = Number(item.gstRate);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100
    ? rate
    : DEFAULT_GST_RATE;
};

export const calculateTaxTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const gstAmount = Math.round(
    items.reduce(
      (sum, item) => sum + (item.qty * item.price * getItemGstRate(item)) / 100,
      0,
    ),
  );

  return { subtotal, gstAmount, total: subtotal + gstAmount };
};

export const getInvoiceOutstanding = (invoice) =>
  Math.max(0, Number(invoice.total) - Number(invoice.amountPaid || 0));

export const hasValidLineItems = (items) =>
  items.some((item) => item.name.trim() && item.qty > 0 && item.price >= 0);
