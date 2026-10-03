import { useState } from "react";
import { Plus, Trash2, Download, Search, ShoppingCart } from "lucide-react";
import { getLocalDateString } from "../utils/invoices.js";
import { encodeCsvRows } from "../utils/csv.js";

const InventoryComponent = ({
  inventory,
  setInventory,
  onConvertToReorder,
  readOnly = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    productName: "",
    quantity: 0,
    reorderLevel: 0,
    unitPrice: 0,
    warehouse: "Main",
    category: "Electronics",
    supplier: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.reorderLevel,
  );

  const handleAddItem = (e) => {
    e.preventDefault();
    setInventory([
      ...inventory,
      {
        ...formData,
        id: Date.now(),
        quantity: parseInt(formData.quantity),
        reorderLevel: parseInt(formData.reorderLevel),
        unitPrice: parseInt(formData.unitPrice),
        lastRestocked: getLocalDateString(),
      },
    ]);
    setFormData({
      sku: "",
      productName: "",
      quantity: 0,
      reorderLevel: 0,
      unitPrice: 0,
      warehouse: "Main",
      category: "Electronics",
      supplier: "",
    });
    setShowForm(false);
  };

  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const exportInventory = () => {
    const rows = [
      [
        "SKU",
        "Product",
        "Qty",
        "Reorder Level",
        "Unit Price",
        "Total Value",
        "Status",
        "Supplier",
      ],
      ...filteredInventory.map((item) => [
        item.sku,
        item.productName,
        item.quantity,
        item.reorderLevel,
        item.unitPrice,
        item.quantity * item.unitPrice,
        item.quantity <= item.reorderLevel ? "LOW STOCK" : "OK",
        item.supplier,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([encodeCsvRows(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `Inventory-${getLocalDateString()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-slate-600 text-sm">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{inventory.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-slate-600 text-sm">Total Value</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{(totalInventoryValue / 100000).toFixed(1)}L
          </p>
        </div>
        <div
          className={`bg-white p-4 rounded-lg border ${lowStockItems.length > 0 ? "border-red-300 bg-red-50" : "border-slate-200"}`}
        >
          <p className="text-slate-600 text-sm">Low Stock</p>
          <p
            className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-red-600" : "text-green-600"}`}
          >
            {lowStockItems.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-slate-600 text-sm">Avg Unit Price</p>
          <p className="text-2xl font-bold text-purple-600">
            ₹
            {(inventory.length
              ? Math.round(totalInventoryValue / inventory.length)
              : 0
            ).toLocaleString()}
          </p>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-3">
            ⚠️ Auto Reorder Suggestions
          </h3>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-3 rounded border border-red-200"
              >
                <span className="text-sm">
                  {item.productName} - Only {item.quantity} left
                </span>
                <button
                  onClick={() => onConvertToReorder?.(item)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  <ShoppingCart size={14} /> Create PO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by SKU or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
        />
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Item
          </button>
        )}
        <button
          onClick={exportInventory}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-xl font-bold mb-4">Add Inventory Item</h3>
          <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              onChange={(event) =>
                setFormData({ ...formData, sku: event.target.value })
              }
              required
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Product Name"
              value={formData.productName}
              onChange={(e) =>
                setFormData({ ...formData, productName: e.target.value })
              }
              required
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              required
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Reorder Level"
              value={formData.reorderLevel}
              onChange={(e) =>
                setFormData({ ...formData, reorderLevel: e.target.value })
              }
              required
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Unit Price (₹)"
              value={formData.unitPrice}
              onChange={(e) =>
                setFormData({ ...formData, unitPrice: e.target.value })
              }
              required
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Supplier Name"
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <select
              value={formData.warehouse}
              onChange={(e) =>
                setFormData({ ...formData, warehouse: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="Main">Main Warehouse</option>
              <option value="Branch">Branch Warehouse</option>
              <option value="Store">Store</option>
            </select>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="Electronics">Electronics</option>
              <option value="Services">Services</option>
              <option value="Products">Products</option>
              <option value="Other">Other</option>
            </select>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                <th className="px-4 py-3 text-right font-semibold">Price</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                {!readOnly && (
                  <th className="px-4 py-3 text-center font-semibold">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t ${item.quantity <= item.reorderLevel ? "bg-red-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                  <td className="px-4 py-3">{item.productName}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3">{item.supplier}</td>
                  <td className="px-4 py-3 text-right">
                    ₹{item.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${item.quantity <= item.reorderLevel ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {item.quantity <= item.reorderLevel ? "🔴 LOW" : "✅ OK"}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          setInventory(
                            inventory.filter((i) => i.id !== item.id),
                          )
                        }
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                        aria-label={`Delete ${item.productName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryComponent;
