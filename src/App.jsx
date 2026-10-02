import { useState } from "react";
import AuthGate, { useAuth } from "./auth/AuthGate.jsx";
import { useDatabaseCollection } from "./database.js";
import { getPaymentTermDays } from "./utils/invoices.js";
import DashboardComponent from "./components/Dashboard.jsx";
import InventoryComponent from "./components/Inventory.jsx";
import QuotationComponent from "./components/Quotation.jsx";
import InvoiceComponent from "./components/Invoice.jsx";
import TeamComponent from "./components/Team.jsx";
import {
  BarChart3,
  Package,
  FileText,
  DollarSign,
  Home,
  Users,
  LogOut,
} from "lucide-react";

export default function ApnaDhandha() {
  return (
    <AuthGate>
      <AuthenticatedApp />
    </AuthGate>
  );
}

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newQuoteData, setNewQuoteData] = useState(null);
  const [inventory, setInventory, inventoryLoaded, inventoryError] =
    useDatabaseCollection("inventory", []);
  const [invoices, setInvoices, invoicesLoaded, invoicesError] =
    useDatabaseCollection("invoices", []);
  const [quotations, setQuotations, quotationsLoaded, quotationsError] =
    useDatabaseCollection("quotations", []);

  if (!inventoryLoaded || !invoicesLoaded || !quotationsLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600">
        Loading your company workspace…
      </div>
    );
  }

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

    const { quoteNo, validTill, status, ...quotationDetails } = quote;
    const invoice = {
      ...quotationDetails,
      invoiceNo: `INV-${Date.now()}`,
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
    <div className="min-h-screen bg-transparent text-slate-800">
      <header className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#0f766e_100%)] text-white shadow-lg shadow-sky-900/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
              <BarChart3 size={18} /> Vendor Workspace
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BarChart3 size={28} /> Apna Dhandha
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-semibold">{user.name}</p>
              <p className="opacity-80">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
          {["Admin", "Manager"].includes(user.role) && (
            <button
              onClick={() => setActiveTab("team")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition ${activeTab === "team" ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Users size={18} /> Team
            </button>
          )}
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition ${activeTab === "inventory" ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Package size={18} /> Inventory
          </button>
          <button
            onClick={() => setActiveTab("quotations")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition ${activeTab === "quotations" ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <FileText size={18} /> Quotations
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition ${activeTab === "invoices" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <DollarSign size={18} /> Invoices
          </button>
        </div>

        {(inventoryError || invoicesError || quotationsError) && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {inventoryError || invoicesError || quotationsError}
          </p>
        )}

        {/* Content */}
        <div className="pb-6">
          {activeTab === "team" && ["Admin", "Manager"].includes(user.role) && (
            <TeamComponent currentUser={user} />
          )}
          {activeTab === "inventory" && (
            <InventoryComponent
              inventory={inventory}
              setInventory={setInventory}
              readOnly={!["Admin", "Manager", "Staff"].includes(user.role)}
              onConvertToReorder={(item) => {
                alert(`Create PO for ${item.productName}`);
              }}
            />
          )}
          {activeTab === "quotations" && (
            <QuotationComponent
              inventory={inventory}
              quotations={quotations}
              setQuotations={setQuotations}
              readOnly={false}
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
              readOnly={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
