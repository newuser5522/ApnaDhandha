const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export default function CustomerAccountSelect({
  customers = [],
  value,
  onChange,
  onManageCustomers,
  disabled = false,
}) {
  const sortedCustomers = [...customers].sort((left, right) =>
    String(left.name).localeCompare(String(right.name)),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <label className="block max-w-xl space-y-1 text-sm">
        <span className="font-semibold text-slate-800">Customer account</span>
        <select
          aria-label="Customer account"
          required
          disabled={disabled || sortedCustomers.length === 0}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        >
          <option value="">
            {sortedCustomers.length
              ? "Select a customer"
              : "No customer accounts yet"}
          </option>
          {sortedCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} · {customer.phone}
            </option>
          ))}
        </select>
      </label>
      {sortedCustomers.length === 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Add a customer with a mobile number before creating this document.</span>
          {onManageCustomers && (
            <button
              type="button"
              onClick={onManageCustomers}
              className="font-semibold text-blue-700 underline underline-offset-2"
            >
              Go to Customers
            </button>
          )}
        </div>
      )}
    </div>
  );
}