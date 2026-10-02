import { useState } from "react";
import React from "react";
import {
  calculateTaxTotals,
  getInvoiceOutstanding,
  getItemGstRate,
  getPaymentTermDays,
  hasValidLineItems,
} from "../utils/invoices.js";
import LineItemsEditor from "./LineItemsEditor.jsx";
import DocumentDetailsEditor from "./DocumentDetailsEditor.jsx";
import { downloadDocumentPdf } from "../utils/documentPdf.js";
import { Plus, Download, Trash, CreditCard, Pencil } from "lucide-react";

const getDateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const createEmptyInvoiceForm = () => ({
  invoiceNo: "",
  customer: "",
  customerAddress: "",
  customerGstin: "",
  customerState: "",
  customerPhone: "",
  shippingAddress: "",
  businessName: "",
  businessAddress: "",
  businessGstin: "",
  businessPan: "",
  businessState: "",
  businessPhone: "",
  businessEmail: "",
  placeOfSupply: "",
  purchaseOrderRef: "",
  reverseCharge: "No",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  upiId: "",
  termsConditions: "",
  items: [{ name: "", hsnSac: "", unit: "", qty: "", price: "", gstRate: "" }],
  paymentTerms: "NET 30",
  notes: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: getDateAfterDays(30),
});

const InvoiceComponent = ({
  invoices,
  setInvoices,
  newQuoteData,
  inventory = [],
  readOnly = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyInvoiceForm);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(null);

  React.useEffect(() => {
    if (
      newQuoteData &&
      !invoices.some((invoice) => invoice.id === newQuoteData.id)
    ) {
      const dueDate = new Date();
      const termDays = getPaymentTermDays(
        newQuoteData.paymentTerms || "NET 30",
      );
      dueDate.setDate(dueDate.getDate() + termDays);

      const convertedInvoice = {
        ...newQuoteData,
        invoiceNo: `INV-${Date.now()}`,
        paymentStatus: "pending",
        amountPaid: 0,
        paymentTerms: "NET 30",
        dueDate: newQuoteData.dueDate || dueDate.toISOString().split("T")[0],
        notes: newQuoteData.notes || "Converted from quotation",
        id: Date.now(),
      };

      setInvoices((currentInvoices) => [...currentInvoices, convertedInvoice]);
    }
  }, [newQuoteData, invoices, setInvoices]);

  const handleAddInvoice = (e) => {
    e.preventDefault();
    if (!hasValidLineItems(formData.items)) {
      alert(
        "Add at least one item with a name and a quantity greater than zero.",
      );
      return;
    }
    const items = formData.items.map((item) => ({
      ...item,
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      gstRate: getItemGstRate(item),
    }));
    const { subtotal, gstAmount, total } = calculateTaxTotals(items);

    const dueDate =
      formData.dueDate ||
      getDateAfterDays(getPaymentTermDays(formData.paymentTerms));
    const date = formData.date || new Date().toISOString().split("T")[0];
    const savedDocument = {
      ...formData,
      items,
      subtotal,
      gstAmount,
      total,
      date,
      dueDate,
    };

    if (editingInvoiceId !== null) {
      const existingInvoice = invoices.find(
        (invoice) => invoice.id === editingInvoiceId,
      );
      if (Number(existingInvoice?.amountPaid || 0) > total) {
        alert("The invoice total cannot be less than the amount already paid.");
        return;
      }
      setInvoices((currentInvoices) =>
        currentInvoices.map((invoice) => {
          if (invoice.id !== editingInvoiceId) return invoice;
          const amountPaid = Number(invoice.amountPaid || 0);
          return {
            ...invoice,
            ...savedDocument,
            amountPaid,
            paymentStatus:
              amountPaid === 0
                ? "pending"
                : amountPaid >= total
                  ? "paid"
                  : "partial",
          };
        }),
      );
    } else {
      setInvoices((currentInvoices) => [
        ...currentInvoices,
        {
          ...savedDocument,
          id: Date.now(),
          paymentStatus: "pending",
          amountPaid: 0,
        },
      ]);
    }
    setFormData(createEmptyInvoiceForm());
    setEditingInvoiceId(null);
    setShowForm(false);
  };

  const generatePDF = (invoice) => {
    downloadDocumentPdf(invoice, "invoice");
  };

  const startEditingInvoice = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setFormData({
      ...createEmptyInvoiceForm(),
      ...invoice,
      items: (invoice.items || []).map((item) => ({
        ...item,
        qty: item.qty ?? "",
        price: item.price ?? "",
        gstRate: item.gstRate ?? "",
      })),
    });
    setShowForm(true);
  };

  const updateFormField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const openPaymentForm = (invoice) => {
    setPaymentForm({
      invoiceId: invoice.id,
      amount: getInvoiceOutstanding(invoice).toFixed(2),
      method: "UPI",
      reference: "",
      error: "",
    });
  };

  const handleRecordPayment = (event, invoice) => {
    event.preventDefault();
    const amountInPaise = Math.round(Number(paymentForm.amount) * 100);
    const outstandingInPaise = Math.round(getInvoiceOutstanding(invoice) * 100);

    if (
      !Number.isFinite(amountInPaise) ||
      amountInPaise < 1 ||
      amountInPaise > outstandingInPaise
    ) {
      setPaymentForm((current) => ({
        ...current,
        error:
          "Enter an amount greater than zero and no more than the balance.",
      }));
      return;
    }

    const payment = {
      id: Date.now(),
      amount: amountInPaise / 100,
      date: new Date().toISOString().split("T")[0],
      method: paymentForm.method,
      reference: paymentForm.reference.trim(),
    };

    setInvoices((currentInvoices) =>
      currentInvoices.map((currentInvoice) => {
        if (currentInvoice.id !== invoice.id) return currentInvoice;

        const amountPaid = Math.min(
          Number(currentInvoice.total),
          (Math.round(Number(currentInvoice.amountPaid || 0) * 100) +
            amountInPaise) /
            100,
        );

        return {
          ...currentInvoice,
          amountPaid,
          paymentStatus:
            amountPaid >= Number(currentInvoice.total) ? "paid" : "partial",
          payments: [...(currentInvoice.payments || []), payment],
        };
      }),
    );
    setPaymentForm(null);
  };

  // Customer credit tracking
  const customerCreditMap = {};
  invoices.forEach((inv) => {
    if (!customerCreditMap[inv.customer]) {
      customerCreditMap[inv.customer] = { total: 0, paid: 0 };
    }
    customerCreditMap[inv.customer].total += inv.total;
    customerCreditMap[inv.customer].paid += inv.amountPaid;
  });

  return (
    <div className="space-y-6">
      {/* Customer Credit Summary */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <CreditCard size={18} /> Customer Credit Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(customerCreditMap).map(([customer, credit]) => (
            <div
              key={customer}
              className="bg-white p-3 rounded border border-blue-100"
            >
              <p className="font-semibold text-sm">{customer}</p>
              <p className="text-xs text-slate-600 mt-1">
                Total Due: ₹{credit.total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">
                Paid: ₹{credit.paid.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-blue-600">
                Outstanding: ₹{(credit.total - credit.paid).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="flex gap-4">
          <button
            onClick={() => {
              setEditingInvoiceId(null);
              setFormData(createEmptyInvoiceForm());
              setShowForm((current) => !current);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            New Invoice
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold mb-4">
            {editingInvoiceId === null ? "Create Invoice" : "Edit Invoice"}
          </h3>
          <form onSubmit={handleAddInvoice} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span>Invoice number</span>
                <input
                  type="text"
                  aria-label="Invoice number"
                  placeholder="Invoice number"
                  value={formData.invoiceNo}
                  onChange={(event) =>
                    updateFormField("invoiceNo", event.target.value)
                  }
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Invoice date</span>
                <input
                  type="date"
                  aria-label="Invoice date"
                  value={formData.date || ""}
                  onChange={(event) =>
                    updateFormField("date", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Due date</span>
                <input
                  type="date"
                  aria-label="Due date"
                  value={formData.dueDate || ""}
                  onChange={(event) =>
                    updateFormField("dueDate", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Payment terms</span>
                <select
                  aria-label="Payment terms"
                  value={formData.paymentTerms}
                  onChange={(event) =>
                    updateFormField("paymentTerms", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="Cash">Cash on Delivery</option>
                  <option value="NET 15">NET 15</option>
                  <option value="NET 30">NET 30</option>
                  <option value="NET 45">NET 45</option>
                </select>
              </label>
            </div>
            <DocumentDetailsEditor
              formData={formData}
              onChange={updateFormField}
            />
            <LineItemsEditor
              items={formData.items}
              setItems={(nextItems) =>
                setFormData((currentFormData) => ({
                  ...currentFormData,
                  items:
                    typeof nextItems === "function"
                      ? nextItems(currentFormData.items)
                      : nextItems,
                }))
              }
              inventory={inventory}
              listId="invoice-inventory-skus"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                {editingInvoiceId === null ? "Create Invoice" : "Save Invoice"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingInvoiceId(null);
                  setFormData(createEmptyInvoiceForm());
                }}
                className="flex-1 px-4 py-2 bg-slate-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white p-5 rounded-lg border border-slate-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold">
                  {invoice.invoiceNo} - {invoice.customer}
                </h3>
                <p className="text-sm text-slate-500">
                  Issued: {invoice.date} | Due: {invoice.dueDate} (
                  {invoice.paymentTerms})
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${invoice.paymentStatus === "pending" ? "bg-red-100 text-red-700" : invoice.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}
              >
                {invoice.paymentStatus.toUpperCase()}
              </span>
            </div>
            <div className="mb-3 space-y-1 text-sm text-slate-600">
              {invoice.items.map((item, index) => (
                <p key={`${item.name}-${index}`}>
                  {item.name} x{item.qty} @ ₹{item.price} · GST{" "}
                  {getItemGstRate(item)}%
                </p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-slate-600">
                  Subtotal: ₹
                  {Number(invoice.subtotal || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-slate-600">
                  GST: ₹
                  {Number(invoice.gstAmount || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  Total: ₹
                  {Number(invoice.total || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">
                  Amount Paid: ₹
                  {Number(invoice.amountPaid || 0).toLocaleString()}
                </p>
                <p className="text-lg font-bold text-red-600">
                  Outstanding: ₹
                  {getInvoiceOutstanding(invoice).toLocaleString()}
                </p>
              </div>
            </div>
            {invoice.payments?.length > 0 && (
              <div className="mb-3 border-t pt-3">
                <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                <ul className="space-y-1 text-sm text-slate-600">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id} className="flex justify-between gap-3">
                      <span>
                        {payment.date} · {payment.method}
                        {payment.reference && ` · Ref: ${payment.reference}`}
                      </span>
                      <span className="font-medium text-slate-900">
                        ₹{Number(payment.amount).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!readOnly && paymentForm?.invoiceId === invoice.id && (
              <form
                onSubmit={(event) => handleRecordPayment(event, invoice)}
                className="mb-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-semibold text-blue-950">
                    Record Payment
                  </h4>
                  <p className="text-sm text-slate-600">
                    Balance: ₹{getInvoiceOutstanding(invoice).toLocaleString()}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span>Amount (₹)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max={getInvoiceOutstanding(invoice)}
                      step="0.01"
                      required
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: event.target.value,
                          error: "",
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Method</span>
                    <select
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          method: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
                      type="text"
                      value={paymentForm.reference}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          reference: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    />
                  </label>
                </div>
                {paymentForm.error && (
                  <p role="alert" className="text-sm text-red-700">
                    {paymentForm.error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(null)}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => generatePDF(invoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                PDF
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => startEditingInvoice(invoice)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 hover:bg-slate-200"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                  <button
                    onClick={() => openPaymentForm(invoice)}
                    disabled={getInvoiceOutstanding(invoice) === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CreditCard size={16} />
                    Record Payment
                  </button>
                  <button
                    onClick={() =>
                      setInvoices(
                        invoices.filter((item) => item.id !== invoice.id),
                      )
                    }
                    aria-label={`Delete invoice ${invoice.invoiceNo}`}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg"
                  >
                    <Trash size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceComponent;
