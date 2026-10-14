import { calculateTaxTotals } from "../utils/invoices.js";

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function DiscountEditor({
  items,
  discountType,
  discountValue,
  onChange,
}) {
  const totals = calculateTaxTotals(items, { discountType, discountValue });
  const isPercentage = discountType === "percentage";

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-indigo-950">Discount</h4>
          <p className="text-xs text-slate-600">
            GST is calculated on the value after discount.
          </p>
        </div>
        <div
          aria-label="Discount type"
          className="inline-flex rounded-lg border border-indigo-200 bg-white p-1"
        >
          {[
            ["percentage", "Percent"],
            ["fixed", "Fixed amount"],
          ].map(([type, label]) => (
            <button
              key={type}
              type="button"
              aria-pressed={discountType === type}
              onClick={() => onChange("discountType", type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                discountType === type
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-indigo-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-slate-700">
          {isPercentage ? "Discount percentage" : "Discount amount (₹)"}
        </span>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max={isPercentage ? 100 : totals.subtotal}
            step="0.01"
            aria-label={isPercentage ? "Discount percentage" : "Discount amount"}
            value={discountValue ?? ""}
            onChange={(event) => onChange("discountValue", event.target.value)}
            className={`${inputClassName} pr-9`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
            {isPercentage ? "%" : "₹"}
          </span>
        </div>
      </label>

      <div className="mt-4 grid gap-2 border-t border-indigo-200 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <p>
          Subtotal: <strong>{formatCurrency(totals.subtotal)}</strong>
        </p>
        <p>
          Discount: <strong>-{formatCurrency(totals.discountAmount)}</strong>
        </p>
        <p>
          GST after discount: <strong>{formatCurrency(totals.gstAmount)}</strong>
        </p>
        <p className="font-bold text-indigo-950">
          Total: {formatCurrency(totals.total)}
        </p>
      </div>
    </section>
  );
}