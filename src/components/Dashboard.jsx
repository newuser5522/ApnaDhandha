import {
  BarChart3,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  getInvoiceOutstanding,
  getPaymentTermDays,
} from "../utils/invoices.js";

const DashboardComponent = ({ data }) => {
  const totalRevenue = data.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidInvoices = data.invoices.filter(
    (invoice) => getInvoiceOutstanding(invoice) > 0,
  );
  const totalPending = unpaidInvoices.reduce(
    (sum, invoice) => sum + getInvoiceOutstanding(invoice),
    0,
  );
  const lowStockItems = data.inventory.filter(
    (item) => item.quantity <= item.reorderLevel,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueInvoices = unpaidInvoices.filter((invoice) => {
    const dueDate = new Date(
      `${invoice.dueDate || invoice.date || ""}T00:00:00`,
    );
    if (!invoice.dueDate && !Number.isNaN(dueDate.getTime())) {
      dueDate.setDate(
        dueDate.getDate() + getPaymentTermDays(invoice.paymentTerms),
      );
    }
    return !Number.isNaN(dueDate.getTime()) && dueDate < today;
  });

  // Calculate profit (assuming 30% margin for demo)
  const totalCost = data.invoices.reduce(
    (sum, inv) => sum + inv.subtotal * 0.65,
    0,
  );
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue
    ? ((totalProfit / totalRevenue) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">
                ₹{(totalRevenue / 100000).toFixed(1)}L
              </p>
            </div>
            <BarChart3 size={32} className="opacity-50" />
          </div>
        </div>

        <div className="bg-linear-to-br from-amber-500 to-amber-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Amount</p>
              <p className="text-2xl font-bold">
                ₹{(totalPending / 1000).toFixed(0)}K
              </p>
            </div>
            <AlertTriangle size={32} className="opacity-50" />
          </div>
        </div>

        <div className="bg-linear-to-br from-green-500 to-green-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Profit Margin</p>
              <p className="text-2xl font-bold">{profitMargin}%</p>
            </div>
            <TrendingUp size={32} className="opacity-50" />
          </div>
        </div>

        <div
          className={`bg-linear-to-br ${lowStockItems.length > 0 ? "from-red-500 to-red-600" : "from-green-500 to-green-600"} text-white p-5 rounded-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Low Stock Items</p>
              <p className="text-2xl font-bold">{lowStockItems.length}</p>
            </div>
            <Package size={32} className="opacity-50" />
          </div>
        </div>

        <div
          className={`bg-linear-to-br ${overdueInvoices.length > 0 ? "from-red-500 to-red-600" : "from-green-500 to-green-600"} text-white p-5 rounded-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Overdue Invoices</p>
              <p className="text-2xl font-bold">{overdueInvoices.length}</p>
            </div>
            <Clock size={32} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} /> Stock Alert
            </h3>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item) => (
                <p key={item.id} className="text-sm text-red-800">
                  {item.productName}: {item.quantity} units (Reorder:{" "}
                  {item.reorderLevel})
                </p>
              ))}
            </div>
          </div>
        )}

        {overdueInvoices.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <Clock size={18} /> Overdue Payments
            </h3>
            <div className="space-y-2">
              {overdueInvoices.slice(0, 3).map((inv) => (
                <p key={inv.id} className="text-sm text-amber-800">
                  {inv.customer}: ₹{getInvoiceOutstanding(inv).toLocaleString()}{" "}
                  outstanding
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardComponent;
