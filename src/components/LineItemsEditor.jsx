import { getItemGstRate } from "../utils/invoices.js";
import { Plus, Trash } from "lucide-react";

const normalizeSku = (sku) =>
  String(sku || "")
    .trim()
    .toLowerCase();

export default function LineItemsEditor({
  items,
  setItems,
  inventory = [],
  listId,
}) {
  const updateItem = (index, updates) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    );
  };

  const handleSkuChange = (index, sku) => {
    const normalizedSku = normalizeSku(sku);
    const matchedProduct = inventory.find(
      (product) => normalizeSku(product.sku) === normalizedSku,
    );
    const previousSkuMatched = inventory.some(
      (product) =>
        normalizeSku(product.sku) === normalizeSku(items[index]?.sku),
    );

    if (matchedProduct) {
      updateItem(index, {
        sku: matchedProduct.sku,
        name: matchedProduct.productName,
        price: Number(matchedProduct.unitPrice) || 0,
      });
      return;
    }

    updateItem(index, {
      sku,
      ...(previousSkuMatched ? { name: "", price: 0 } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Items</h4>
      {items.map((item, index) => {
        const matchedProduct = inventory.find(
          (product) => normalizeSku(product.sku) === normalizeSku(item.sku),
        );

        return (
          <div key={index} className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className="min-w-0 space-y-1">
              <input
                type="text"
                placeholder="SKU (optional)"
                aria-label={`SKU for item ${index + 1}`}
                list={listId}
                value={item.sku || ""}
                onChange={(event) => handleSkuChange(index, event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p role="status" className="text-xs leading-tight text-slate-500">
                {matchedProduct
                  ? `${matchedProduct.productName} · ${matchedProduct.quantity} in stock`
                  : item.sku
                    ? "SKU not found. Enter item details manually."
                    : "Enter a SKU to look up inventory."}
              </p>
            </div>
            <input
              type="text"
              placeholder="Item Name"
              aria-label={`Item name ${index + 1}`}
              value={item.name}
              onChange={(event) =>
                updateItem(index, { name: event.target.value })
              }
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Qty"
              aria-label={`Quantity for item ${index + 1}`}
              min="0"
              value={item.qty}
              onChange={(event) =>
                updateItem(index, {
                  qty: parseFloat(event.target.value) || 0,
                })
              }
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Price"
              aria-label={`Unit price for item ${index + 1}`}
              min="0"
              step="0.01"
              value={item.price}
              onChange={(event) =>
                updateItem(index, {
                  price: parseFloat(event.target.value) || 0,
                })
              }
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              placeholder="GST %"
              aria-label={`GST rate for item ${index + 1} (%)`}
              list={`${listId}-gst`}
              min="0"
              max="100"
              step="0.01"
              required
              value={getItemGstRate(item)}
              onChange={(event) =>
                updateItem(index, {
                  gstRate: parseFloat(event.target.value) || 0,
                })
              }
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="button"
              aria-label={`Remove item ${index + 1}`}
              onClick={() =>
                setItems((currentItems) =>
                  currentItems.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              className="rounded-lg bg-red-100 px-3 py-2 text-red-600"
            >
              <Trash size={16} />
            </button>
          </div>
        );
      })}
      <datalist id={listId}>
        {inventory.map((product) => (
          <option
            key={product.id}
            value={product.sku}
            label={`${product.productName} · ₹${product.unitPrice}`}
          />
        ))}
      </datalist>
      <datalist id={`${listId}-gst`}>
        <option value="0" />
        <option value="5" />
        <option value="12" />
        <option value="18" />
        <option value="28" />
      </datalist>
      <button
        type="button"
        onClick={() =>
          setItems((currentItems) => [
            ...currentItems,
            { name: "", qty: 0, price: 0, gstRate: 18 },
          ])
        }
        className="flex items-center gap-1 text-sm text-blue-600"
      >
        <Plus size={16} /> Add Item
      </button>
    </div>
  );
}
