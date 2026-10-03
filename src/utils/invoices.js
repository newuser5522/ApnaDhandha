export const getPaymentTermDays = (paymentTerms) =>
  paymentTerms === "Cash" ? 0 : parseInt(paymentTerms?.split(" ")[1], 10) || 30;

export const getLocalDateString = (date = new Date()) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().split("T")[0];
};

export const DEFAULT_GST_RATE = 18;

export const getItemGstRate = (item) => {
  if (
    item.gstRate == null ||
    (typeof item.gstRate === "string" && item.gstRate.trim() === "")
  ) {
    return DEFAULT_GST_RATE;
  }
  const rate = Number(item.gstRate);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100
    ? rate
    : DEFAULT_GST_RATE;
};

export const calculateTaxTotals = (items) => {
  const totalsInPaise = items.reduce(
    (totals, item) => {
      const taxableValue = (Number(item.qty) || 0) * (Number(item.price) || 0);
      totals.subtotal += Math.round(taxableValue * 100);
      totals.gst += Math.round(taxableValue * getItemGstRate(item));
      return totals;
    },
    { subtotal: 0, gst: 0 },
  );
  const subtotal = totalsInPaise.subtotal / 100;
  const gstAmount = totalsInPaise.gst / 100;

  return {
    subtotal,
    gstAmount,
    total: Math.round((totalsInPaise.subtotal + totalsInPaise.gst) / 100),
  };
};

export const getInvoiceOutstanding = (invoice) =>
  Math.max(0, Number(invoice.total) - Number(invoice.amountPaid || 0));

export const hasValidLineItems = (items) =>
  items.some((item) => item.name.trim() && item.qty > 0 && item.price >= 0);
