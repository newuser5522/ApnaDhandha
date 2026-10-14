import { useMemo, useState } from "react";
import { Check, Pencil, Plus, ReceiptText, Search, X } from "lucide-react";
import {
  applyCustomerAdvanceToInvoice,
  getCustomerAdvance,
  getCustomerCreditExposure,
  getCustomerInvoices,
  getCustomerOutstanding,
  recordCustomerPayment,
} from "../utils/customerLedger.js";
import { isValidPhoneNumber } from "../utils/phone.js";
import { getInvoiceOutstanding } from "../utils/invoices.js";

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  address: "",
  gstin: "",
  state: "",
  creditLimit: "",
};

const EMPTY_PAYMENT = {
  amount: "",
  method: "UPI",
  reference: "",
};

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Customers({
  customers,
  setCustomers,
  invoices,
  setInvoices,
}) {
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_CUSTOMER);
  const [formError, setFormError] = useState("");
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentError, setPaymentError] = useState("");

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === String(selectedCustomerId),
  );
  const customerInvoices = selectedCustomer
    ? getCustomerInvoices(selectedCustomer.id, invoices).sort((left, right) =>
        String(right.date || "").localeCompare(String(left.date || "")),
      )
    : [];
  const customerAdvance = selectedCustomer
    ? getCustomerAdvance(selectedCustomer)
    : 0;
  const customerOutstanding = selectedCustomer
    ? getCustomerOutstanding(selectedCustomer.id, invoices)
    : 0;
  const customerExposure = selectedCustomer
    ? getCustomerCreditExposure(selectedCustomer, invoices)
    : 0;

  const visibleCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return customers
      .filter((customer) =>
        [customer.name, customer.phone].some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch),
        ),
      )
      .sort((left, right) =>
        String(left.name).localeCompare(String(right.name)),
      );
  }, [customers, search]);

  const closeForm = () => {
    setShowForm(false);
    setEditingCustomerId(null);
    setFormData(EMPTY_CUSTOMER);
    setFormError("");
  };

  const openNewCustomerForm = () => {
    setEditingCustomerId(null);
    setFormData(EMPTY_CUSTOMER);
    setFormError("");
    setShowForm(true);
  };

  const openEditCustomerForm = (customer) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      gstin: customer.gstin || "",
      state: customer.state || "",
      creditLimit:
        customer.creditLimit == null ? "" : String(customer.creditLimit),
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSaveCustomer = (event) => {
    event.preventDefault();
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const creditLimit =
      formData.creditLimit.trim() === ""
        ? null
        : Number(formData.creditLimit);

    if (!name) {
      setFormError("Enter the customer's name.");
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setFormError("Enter a valid mobile number with 7 to 15 digits.");
      return;
    }
    if (
      creditLimit !== null &&
      (!Number.isFinite(creditLimit) || creditLimit < 0)
    ) {
      setFormError("Credit limit must be zero or greater.");
      return;
    }

    const existingCustomer = customers.find(
      (customer) => String(customer.id) === String(editingCustomerId),
    );
    const savedCustomer = {
      ...existingCustomer,
      id: existingCustomer?.id ?? Date.now(),
      name,
      phone,
      address: formData.address.trim(),
      gstin: formData.gstin.trim(),
      state: formData.state.trim(),
      creditLimit,
      payments: existingCustomer?.payments || [],
    };

    setCustomers((currentCustomers) =>
      existingCustomer
        ? currentCustomers.map((customer) =>
            String(customer.id) === String(existingCustomer.id)
              ? savedCustomer
              : customer,
          )
        : [...currentCustomers, savedCustomer],
    );
    setSelectedCustomerId(savedCustomer.id);
    closeForm();
  };

  const handleRecordPayment = (event) => {
    event.preventDefault();
    if (!selectedCustomer) return;

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a payment amount greater than zero.");
      return;
    }

    try {
      const result = recordCustomerPayment({
        customer: selectedCustomer,
        invoices,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference,
      });
      setInvoices(result.invoices);
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          String(customer.id) === String(selectedCustomer.id)
            ? result.customer
            : customer,
        ),
      );
      setPaymentForm(EMPTY_PAYMENT);
      setPaymentError("");
    } catch (error) {
      setPaymentError(error.message);
    }
  };

  const handleApplyAdvance = (invoice) => {
    if (!selectedCustomer) return;
    const result = applyCustomerAdvanceToInvoice({
      customer: selectedCustomer,
      invoices,
      invoiceId: invoice.id,
    });
    if (result.amountApplied <= 0) return;
    setInvoices(result.invoices);
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        String(customer.id) === String(selectedCustomer.id)
          ? result.customer
          : customer,
      ),
    );
  };

  const handlePaymentMethodChange = (method) =>
    setPaymentForm((current) => ({ ...current, method }));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Customers</h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep mobile numbers, credit limits, invoices, and payments in one
              account.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewCustomerForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} /> Add customer
          </button>
        </div>
      </section>

      {showForm && (
        <form
          onSubmit={handleSaveCustomer}
          className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {editingCustomerId ? "Edit customer" : "New customer"}
            </h3>
            <button
              type="button"
              aria-label="Close customer form"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Customer name</span>
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Mobile number</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={formData.phone}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Credit limit (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={formData.creditLimit}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    creditLimit: event.target.value,
                  }))
                }
                className={inputClassName}
              />
              <span className="block text-xs text-slate-500">
                Leave blank for no limit. Invoices over the limit show a warning.
              </span>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">Billing address (optional)</span>
              <input
                value={formData.address}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">GSTIN (optional)</span>
              <input
                value={formData.gstin}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    gstin: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">State (optional)</span>
              <input
                value={formData.state}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              <Check size={16} /> Save customer
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="relative block">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Search customers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or mobile"
              className={`${inputClassName} pl-9`}
            />
          </label>
          <div className="mt-3 space-y-2">
            {visibleCustomers.map((customer) => {
              const selected =
                String(customer.id) === String(selectedCustomerId);
              const outstanding = getCustomerOutstanding(
                customer.id,
                invoices,
              );
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-semibold text-slate-900">
                    {customer.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {customer.phone}
                  </span>
                  <span className="mt-2 flex justify-between gap-2 text-xs text-slate-600">
                    <span>Outstanding</span>
                    <strong>{money(outstanding)}</strong>
                  </span>
                </button>
              );
            })}
            {visibleCustomers.length === 0 && (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                {customers.length
                  ? "No customers match your search."
                  : "No customer accounts yet. Add one to start a quotation or invoice."}
              </p>
            )}
          </div>
        </section>

        {selectedCustomer ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedCustomer.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedCustomer.phone}
                  {selectedCustomer.address
                    ? ` · ${selectedCustomer.address}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditCustomerForm(selectedCustomer)}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Pencil size={15} /> Edit account
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Outstanding", money(customerOutstanding)],
                ["Advance balance", money(customerAdvance)],
                [
                  "Credit limit",
                  selectedCustomer.creditLimit == null
                    ? "No limit"
                    : money(selectedCustomer.creditLimit),
                ],
                ["Credit used", money(customerExposure)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleRecordPayment}
              className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"
            >
              <div>
                <h4 className="font-semibold text-emerald-950">
                  Record customer payment
                </h4>
                <p className="text-xs text-slate-600">
                  Payment applies to the oldest unpaid invoices first. Any extra
                  stays as customer advance.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span>Amount (₹)</span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) => {
                      setPaymentForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }));
                      setPaymentError("");
                    }}
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Payment method</span>
                  <select
                    value={paymentForm.method}
                    onChange={(event) =>
                      handlePaymentMethodChange(event.target.value)
                    }
                    className={inputClassName}
                  >
                    <option>UPI</option>
                    <option>Bank transfer</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Card</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span>Reference (optional)</span>
                  <input
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        reference: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </label>
              </div>
              {paymentError && (
                <p role="alert" className="text-sm text-red-700">
                  {paymentError}
                </p>
              )}
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Save customer payment
              </button>
            </form>

            <div>
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <ReceiptText size={17} /> Invoices and balances
              </h4>
              {customerInvoices.length ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Invoice</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerInvoices.map((invoice) => {
                        const outstanding = getInvoiceOutstanding(invoice);
                        return (
                          <tr key={invoice.id}>
                            <td className="px-3 py-2 font-medium">
                              {invoice.invoiceNo || "Invoice"}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {invoice.date || "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {money(invoice.total)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {money(outstanding)}
                            </td>
                            <td className="px-3 py-2">
                              {outstanding > 0 && customerAdvance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyAdvance(invoice)}
                                  className="whitespace-nowrap rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-200"
                                >
                                  Apply advance
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  No invoices are linked to this customer yet. To include an
                  older invoice, edit it in Invoices and select this customer
                  account.
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-slate-900">
                Customer payment history
              </h4>
              {selectedCustomer.payments?.length ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {[...selectedCustomer.payments]
                    .sort((left, right) =>
                      String(right.date).localeCompare(String(left.date)),
                    )
                    .map((payment) => {
                      const allocations = payment.allocations || [];
                      const allocationText = allocations
                        .map((allocation) => {
                          const invoice = invoices.find(
                            (candidate) =>
                              String(candidate.id) ===
                              String(allocation.invoiceId),
                          );
                          return `${invoice?.invoiceNo || "Invoice"} ${money(allocation.amount)}`;
                        })
                        .join(", ");
                      return (
                        <li
                          key={payment.id}
                          className="flex flex-wrap justify-between gap-2 p-3 text-sm"
                        >
                          <span>
                            <strong>{payment.date}</strong> · {payment.method}
                            {payment.reference
                              ? ` · ${payment.reference}`
                              : ""}
                            {allocationText && (
                              <span className="mt-1 block text-xs text-slate-500">
                                Applied to {allocationText}
                              </span>
                            )}
                            {Number(payment.unappliedAmount) > 0 && (
                              <span className="mt-1 block text-xs text-indigo-700">
                                Advance remaining:{" "}
                                {money(payment.unappliedAmount)}
                              </span>
                            )}
                          </span>
                          <strong>{money(payment.amount)}</strong>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  No customer payments recorded yet.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Select a customer to review invoices and record payments.
          </section>
        )}
      </div>
    </div>
  );
}