import { useState } from "react";
import { useDatabaseCollection } from "./database.js";
import { getPaymentTermDays } from "./utils/invoices.js";
import DashboardComponent from "./components/Dashboard.jsx";
import InventoryComponent from "./components/Inventory.jsx";
import QuotationComponent from "./components/Quotation.jsx";
import InvoiceComponent from "./components/Invoice.jsx";
import { BarChart3, Package, FileText, DollarSign, Home } from "lucide-react";

export default function ApnaDhandha() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newQuoteData, setNewQuoteData] = useState(null);
  const [inventory, setInventory] = useDatabaseCollection("inventory", []);
  const [invoices, setInvoices] = useDatabaseCollection("invoices", []);

  const handleConvertQuoteToInvoice = (quote) => {
    if (
      !quote ||
      invoices.some((invoice) => invoice.sourceQuotationId === quote.id)
    ) {
      return;
    }

    const dueDate = new Date();
    const termDays = getPaymentTermDays("NET 30");
    dueDate.setDate(dueDate.getDate() + termDays);

    const invoice = {
      invoiceNo: `INV-${Date.now()}`,
      customer: quote.customer,
      items: quote.items,
      subtotal: quote.subtotal,
      gstAmount: quote.gstAmount,
      total: quote.total,
      date: new Date().toISOString().split("T")[0],
      paymentStatus: "pending",
      amountPaid: 0,
      paymentTerms: "NET 30",
      dueDate: dueDate.toISOString().split("T")[0],
      notes: quote.notes || "Converted from quotation",
      sourceQuotationId: quote.id,
      id: Date.now(),
    };

    setInvoices((currentInvoices) => [...currentInvoices, invoice]);
    setNewQuoteData(invoice);
    setActiveTab("invoices");
  };

  const appData = {
    invoices,
    inventory,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-linear-to-r from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={32} /> Apna Dhandha
          </h1>
          <p className="text-sm opacity-75">
            Smart Business Management for Indian Small Businesses
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mt-6 px-4">
        <div className="flex gap-2 mb-6 border-b border-slate-300 flex-wrap">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === "dashboard" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600"}`}
          >
            <Home size={18} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === "inventory" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600"}`}
          >
            <Package size={18} /> Inventory
          </button>
          <button
            onClick={() => setActiveTab("quotations")}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === "quotations" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600"}`}
          >
            <FileText size={18} /> Quotations
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === "invoices" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-600"}`}
          >
            <DollarSign size={18} /> Invoices
          </button>
        </div>

        {/* Content */}
        <div className="pb-6">
          {activeTab === "dashboard" && <DashboardComponent data={appData} />}
          {activeTab === "inventory" && (
            <InventoryComponent
              inventory={inventory}
              setInventory={setInventory}
              onConvertToReorder={(item) => {
                alert(`Create PO for ${item.productName}`);
              }}
            />
          )}
          {activeTab === "quotations" && (
            <QuotationComponent
              inventory={inventory}
              onConvertToInvoice={(quote) => {
                handleConvertQuoteToInvoice(quote);
                alert("Quote converted to invoice! Switched to invoices tab.");
              }}
            />
          )}
          {activeTab === "invoices" && (
            <InvoiceComponent
              invoices={invoices}
              setInvoices={setInvoices}
              newQuoteData={newQuoteData}
              inventory={inventory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
