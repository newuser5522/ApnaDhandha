const inputClassName =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";

function TextField({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="block min-w-0 space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        aria-label={label}
        placeholder={label}
        value={value ?? ""}
        onChange={(event) => onChange(name, event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

function DetailsSection({ title, children }) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-teal-900">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function DocumentDetailsEditor({ formData, onChange }) {
  return (
    <div className="space-y-4">
      <DetailsSection title="Your business">
        <TextField
          label="Business name"
          name="businessName"
          value={formData.businessName}
          onChange={onChange}
        />
        <TextField
          label="Business address"
          name="businessAddress"
          value={formData.businessAddress}
          onChange={onChange}
        />
        <TextField
          label="Business GSTIN"
          name="businessGstin"
          value={formData.businessGstin}
          onChange={onChange}
        />
        <TextField
          label="Business PAN"
          name="businessPan"
          value={formData.businessPan}
          onChange={onChange}
        />
        <TextField
          label="Business state"
          name="businessState"
          value={formData.businessState}
          onChange={onChange}
        />
        <TextField
          label="Business phone"
          name="businessPhone"
          value={formData.businessPhone}
          onChange={onChange}
          type="tel"
        />
        <TextField
          label="Business email"
          name="businessEmail"
          value={formData.businessEmail}
          onChange={onChange}
          type="email"
        />
      </DetailsSection>

      <DetailsSection title="Bill to">
        <TextField
          label="Customer name"
          name="customer"
          value={formData.customer}
          onChange={onChange}
        />
        <TextField
          label="Billing address"
          name="customerAddress"
          value={formData.customerAddress}
          onChange={onChange}
        />
        <TextField
          label="Customer GSTIN"
          name="customerGstin"
          value={formData.customerGstin}
          onChange={onChange}
        />
        <TextField
          label="Customer state"
          name="customerState"
          value={formData.customerState}
          onChange={onChange}
        />
        <TextField
          label="Customer phone"
          name="customerPhone"
          value={formData.customerPhone}
          onChange={onChange}
          type="tel"
        />
        <TextField
          label="Shipping address"
          name="shippingAddress"
          value={formData.shippingAddress}
          onChange={onChange}
        />
      </DetailsSection>

      <DetailsSection title="Supply and reference">
        <TextField
          label="Place of supply"
          name="placeOfSupply"
          value={formData.placeOfSupply}
          onChange={onChange}
        />
        <TextField
          label="Purchase order reference"
          name="purchaseOrderRef"
          value={formData.purchaseOrderRef}
          onChange={onChange}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Reverse charge</span>
          <select
            aria-label="Reverse charge"
            value={formData.reverseCharge ?? "No"}
            onChange={(event) => onChange("reverseCharge", event.target.value)}
            className={inputClassName}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
      </DetailsSection>

      <DetailsSection title="Payment and terms">
        <TextField
          label="Bank account name"
          name="bankAccountName"
          value={formData.bankAccountName}
          onChange={onChange}
        />
        <TextField
          label="Bank name and branch"
          name="bankName"
          value={formData.bankName}
          onChange={onChange}
        />
        <TextField
          label="Account number"
          name="bankAccountNumber"
          value={formData.bankAccountNumber}
          onChange={onChange}
        />
        <TextField
          label="IFSC"
          name="bankIfsc"
          value={formData.bankIfsc}
          onChange={onChange}
        />
        <TextField
          label="UPI ID"
          name="upiId"
          value={formData.upiId}
          onChange={onChange}
        />
        <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-3">
          <span className="font-medium text-slate-700">
            Terms and conditions
          </span>
          <textarea
            aria-label="Terms and conditions"
            placeholder="Terms and conditions"
            value={formData.termsConditions ?? ""}
            onChange={(event) =>
              onChange("termsConditions", event.target.value)
            }
            rows={3}
            className={inputClassName}
          />
        </label>
      </DetailsSection>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Additional notes</span>
        <textarea
          aria-label="Additional notes"
          placeholder="Additional notes"
          value={formData.notes ?? ""}
          onChange={(event) => onChange("notes", event.target.value)}
          rows={2}
          className={inputClassName}
        />
      </label>
    </div>
  );
}
