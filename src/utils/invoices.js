export const getPaymentTermDays = (paymentTerms) =>
  paymentTerms === "Cash" ? 0 : parseInt(paymentTerms?.split(" ")[1], 10) || 30;

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

const toPaise = (value) => Math.round((Number(value) || 0) * 100);

export const calculateTaxTotals = (
  items,
  { discountType = "percentage", discountValue = 0 } = {},
) => {
  const lines = items.map((item) => ({
    item,
    subtotalPaise: Math.max(
      0,
      toPaise((Number(item.qty) || 0) * (Number(item.price) || 0)),
    ),
    rate: getItemGstRate(item),
  }));
  const subtotalPaise = lines.reduce(
    (sum, line) => sum + line.subtotalPaise,
    0,
  );
  const value = Math.max(0, Number(discountValue) || 0);
  const requestedDiscountPaise =
    discountType === "percentage"
      ? Math.round((subtotalPaise * Math.min(value, 100)) / 100)
      : discountType === "fixed"
        ? toPaise(value)
        : 0;
  const discountPaise = Math.min(subtotalPaise, requestedDiscountPaise);

  let remainingDiscountPaise = discountPaise;
  const lineTotals = lines.map((line, index) => {
    const proportionalDiscount =
      index === lines.length - 1 || subtotalPaise === 0
        ? remainingDiscountPaise
        : Math.round((discountPaise * line.subtotalPaise) / subtotalPaise);
    const lineDiscountPaise = Math.min(
      line.subtotalPaise,
      remainingDiscountPaise,
      proportionalDiscount,
    );
    remainingDiscountPaise -= lineDiscountPaise;
    const taxablePaise = line.subtotalPaise - lineDiscountPaise;
    const gstPaise = Math.round((taxablePaise * line.rate) / 100);

    return {
      subtotal: line.subtotalPaise / 100,
      discountAmount: lineDiscountPaise / 100,
      taxableValue: taxablePaise / 100,
      gstAmount: gstPaise / 100,
      rate: line.rate,
      total: (taxablePaise + gstPaise) / 100,
    };
  });

  const gstPaise = lineTotals.reduce(
    (sum, line) => sum + toPaise(line.gstAmount),
    0,
  );
  const taxablePaise = subtotalPaise - discountPaise;
  const unroundedTotalPaise = taxablePaise + gstPaise;

  return {
    subtotal: subtotalPaise / 100,
    discountAmount: discountPaise / 100,
    taxableSubtotal: taxablePaise / 100,
    gstAmount: gstPaise / 100,
    total: Math.round(unroundedTotalPaise / 100),
    lineTotals,
  };
};

export const getInvoiceOutstanding = (invoice) =>
  Math.max(0, Number(invoice.total) - Number(invoice.amountPaid || 0));

export const hasValidLineItems = (items) =>
  items.some((item) => item.name.trim() && item.qty > 0 && item.price >= 0);
