import { useState } from "react";
import jsPDF from "jspdf";
import { useDatabaseCollection } from "../database.js";
import {
  calculateTaxTotals,
  getItemGstRate,
  hasValidLineItems,
} from "../utils/invoices.js";
import LineItemsEditor from "./LineItemsEditor.jsx";
import { Plus, Download, Trash, ArrowRight } from "lucide-react";

const QuotationComponent = ({ onConvertToInvoice, inventory = [] }) => {
  const [quotations, setQuotations] = useDatabaseCollection("quotations", []);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    quoteNo: "",
    customer: "",
    items: [{ name: "", qty: 0, price: 0, gstRate: 18 }],
    notes: "",
  });

  const handleAddQuotation = (e) => {
    e.preventDefault();
    if (!hasValidLineItems(formData.items)) {
      alert(
        "Add at least one item with a name and a quantity greater than zero.",
      );
      return;
    }
    const { subtotal, gstAmount, total } = calculateTaxTotals(formData.items);

    setQuotations([
      ...quotations,
      {
        ...formData,
        id: Date.now(),
        subtotal,
        gstAmount,
        total,
        date: new Date().toISOString().split("T")[0],
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "draft",
      },
    ]);
    setFormData({
      quoteNo: "",
      customer: "",
      items: [{ name: "", qty: 0, price: 0, gstRate: 18 }],
      notes: "",
    });
    setShowForm(false);
  };

  const generatePDF = (quotation) => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text("QUOTATION", 20, 20);
    pdf.setFontSize(10);
    pdf.text(`Quote #: ${quotation.quoteNo}`, 20, 30);
    pdf.text(`Customer: ${quotation.customer}`, 20, 40);
    pdf.text(`Date: ${quotation.date}`, 20, 50);
    pdf.text(`Valid Till: ${quotation.validTill}`, 20, 60);

    let yPos = 75;
    quotation.items.forEach((item) => {
      pdf.text(
        `${item.name} - Qty: ${item.qty} @ ₹${item.price} - GST ${getItemGstRate(item)}%`,
        20,
        yPos,
      );
      yPos += 10;
    });

    pdf.text(`Subtotal: ₹${quotation.subtotal}`, 20, yPos);
    pdf.text(`GST (per item slab): ₹${quotation.gstAmount}`, 20, yPos + 10);
    pdf.text(`TOTAL: ₹${quotation.total}`, 20, yPos + 20, {
      fontSize: 12,
      fontStyle: "bold",
    });

    pdf.save(`Quote-${quotation.quoteNo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          New Quotation
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold mb-4">Create Quotation</h3>
          <form onSubmit={handleAddQuotation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Quote No."
                value={formData.quoteNo}
                onChange={(e) =>
                  setFormData({ ...formData, quoteNo: e.target.value })
                }
                required
                className="px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Customer Name"
                value={formData.customer}
                onChange={(e) =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                required
                className="px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <textarea
              placeholder="Special Notes/Terms"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            ></textarea>
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
                Create Quote
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
                className={`px-3 py-1 rounded-full text-sm font-semibold ${quotation.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
              >
                {quotation.status.toUpperCase()}
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
                Subtotal: ₹{quotation.subtotal.toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">
                GST (per item slab): ₹{quotation.gstAmount.toLocaleString()}
              </p>
              <p className="text-lg font-bold text-blue-600">
                Total: ₹{quotation.total.toLocaleString()}
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
              <button
                onClick={() => onConvertToInvoice?.(quotation)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowRight size={16} />
                Convert to Invoice
              </button>
              <button
                onClick={() =>
                  setQuotations(quotations.filter((q) => q.id !== quotation.id))
                }
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuotationComponent;
