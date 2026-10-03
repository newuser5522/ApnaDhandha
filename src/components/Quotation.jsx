import { useState } from "react";
import {
  calculateTaxTotals,
  getLocalDateString,
  getItemGstRate,
  hasValidLineItems,
} from "../utils/invoices.js";
import LineItemsEditor from "./LineItemsEditor.jsx";
import DocumentDetailsEditor from "./DocumentDetailsEditor.jsx";
import { downloadDocumentPdf } from "../utils/documentPdf.js";
import { ArrowRight, Download, Plus, Trash, Pencil } from "lucide-react";

const getDateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
};

const createEmptyQuotationForm = () => ({
  quoteNo: "",
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
  notes: "",
  date: getLocalDateString(),
  validTill: getDateAfterDays(30),
});

const QuotationComponent = ({
  onConvertToInvoice,
  inventory = [],
  quotations = [],
  setQuotations,
  readOnly = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyQuotationForm);
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  const handleAddQuotation = (e) => {
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
    const savedDocument = {
      ...formData,
      items,
      subtotal,
      gstAmount,
      total,
      date: formData.date || getLocalDateString(),
      validTill: formData.validTill || getDateAfterDays(30),
    };

    if (editingQuotationId !== null) {
      setQuotations((currentQuotations) =>
        currentQuotations.map((quotation) =>
          quotation.id === editingQuotationId
            ? { ...quotation, ...savedDocument }
            : quotation,
        ),
      );
    } else {
      setQuotations((currentQuotations) => [
        ...currentQuotations,
        { ...savedDocument, id: Date.now(), status: "draft" },
      ]);
    }

    setFormData(createEmptyQuotationForm());
    setEditingQuotationId(null);
    setShowForm(false);
  };

  const generatePDF = async (quotation) => {
    try {
      await downloadDocumentPdf(quotation, "quotation");
    } catch (error) {
      console.error("Quotation PDF export failed.", error);
      alert("Unable to create the quotation PDF. Please try again.");
    }
  };

  const startEditingQuotation = (quotation) => {
    setEditingQuotationId(quotation.id);
    setFormData({
      ...createEmptyQuotationForm(),
      ...quotation,
      items: (quotation.items || []).map((item) => ({
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

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {!readOnly && (
          <button
            onClick={() => {
              setEditingQuotationId(null);
              setFormData(createEmptyQuotationForm());
              setShowForm((current) => !current);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            New Quotation
          </button>
        )}
      </div>

      {!readOnly && showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold mb-4">
            {editingQuotationId === null
              ? "Create Quotation"
              : "Edit Quotation"}
          </h3>
          <form onSubmit={handleAddQuotation} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Quotation number</span>
                <input
                  type="text"
                  aria-label="Quotation number"
                  placeholder="Quotation number"
                  value={formData.quoteNo}
                  onChange={(event) =>
                    updateFormField("quoteNo", event.target.value)
                  }
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Quotation date</span>
                <input
                  type="date"
                  aria-label="Quotation date"
                  value={formData.date || ""}
                  onChange={(event) =>
                    updateFormField("date", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Valid until</span>
                <input
                  type="date"
                  aria-label="Valid until"
                  value={formData.validTill || ""}
                  onChange={(event) =>
                    updateFormField("validTill", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
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
              listId="quotation-inventory-skus"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                {editingQuotationId === null
                  ? "Create Quote"
                  : "Save Quotation"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingQuotationId(null);
                  setFormData(createEmptyQuotationForm());
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
        {quotations.map((quotation) => (
          <div
            key={quotation.id}
            className="bg-white p-5 rounded-lg border border-slate-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold">
                  {quotation.quoteNo} - {quotation.customer}
                </h3>
                <p className="text-sm text-slate-500">
                  {quotation.date} → Valid Till {quotation.validTill}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  quotation.status === "sent"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {(quotation.status || "draft").toUpperCase()}
              </span>
            </div>

            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-2">Items:</h4>
              {quotation.items.map((item, idx) => (
                <p key={idx} className="text-sm text-slate-600">
                  {item.name} x{item.qty} @ ₹{item.price} · GST{" "}
                  {getItemGstRate(item)}%
                </p>
              ))}
            </div>

            <div className="border-t pt-3 mb-3">
              <p className="text-sm text-slate-600">
                Subtotal: ₹
                {Number(quotation.subtotal || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-slate-600">
                GST: ₹
                {Number(quotation.gstAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-lg font-bold text-blue-600">
                Total: ₹
                {Number(quotation.total || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => generatePDF(quotation)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                PDF
              </button>

              {!readOnly && (
                <>
                  <button
                    disabled={quotation.status === "converted"}
                    onClick={() => startEditingQuotation(quotation)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                  <button
                    disabled={quotation.status === "converted"}
                    onClick={() => onConvertToInvoice?.(quotation)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowRight size={16} />
                    {quotation.status === "converted"
                      ? "Converted"
                      : "Convert to Invoice"}
                  </button>
                  <button
                    onClick={() =>
                      setQuotations(
                        quotations.filter((quote) => quote.id !== quotation.id),
                      )
                    }
                    aria-label={`Delete quotation ${quotation.quoteNo}`}
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

export default QuotationComponent;
