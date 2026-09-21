import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BarChart3, Package, FileText, DollarSign, Home, Settings, LogOut, Menu, X, Plus, Trash2, Edit2, AlertCircle, Download, Search, CheckCircle, Clock, Users, TrendingUp, Eye, Trash, Repeat2, Tag, Bell, Smartphone, Lock, BarChart2, PieChart, LineChart, ShoppingCart, Printer, File, ArrowRight, Target, Zap, AlertTriangle, CreditCard, Calendar } from 'lucide-react';

// ============ SMART DASHBOARD ============
const DashboardComponent = ({ data }) => {
  const totalRevenue = data.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingInvoices = data.invoices.filter(inv => inv.paymentStatus === 'pending');
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const lowStockItems = data.inventory.filter(item => item.quantity <= item.reorderLevel);
  const overdueDays = 30;
  const overdueInvoices = pendingInvoices.filter(inv => {
    const invoiceDate = new Date(inv.date);
    const today = new Date();
    return (today - invoiceDate) / (1000 * 60 * 60 * 24) > overdueDays;
  });

  // Calculate profit (assuming 30% margin for demo)
  const totalCost = data.invoices.reduce((sum, inv) => sum + (inv.subtotal * 0.65), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(1)}L</p>
            </div>
            <BarChart3 size={32} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Amount</p>
              <p className="text-2xl font-bold">₹{(totalPending / 1000).toFixed(0)}K</p>
            </div>
            <AlertTriangle size={32} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Profit Margin</p>
              <p className="text-2xl font-bold">{profitMargin}%</p>
            </div>
            <TrendingUp size={32} className="opacity-50" />
          </div>
        </div>

        <div className={`bg-gradient-to-br ${lowStockItems.length > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white p-5 rounded-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Low Stock Items</p>
              <p className="text-2xl font-bold">{lowStockItems.length}</p>
            </div>
            <Package size={32} className="opacity-50" />
          </div>
        </div>

        <div className={`bg-gradient-to-br ${overdueInvoices.length > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white p-5 rounded-lg`}>
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
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} /> Stock Alert</h3>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map(item => (
                <p key={item.id} className="text-sm text-red-800">{item.productName}: {item.quantity} units (Reorder: {item.reorderLevel})</p>
              ))}
            </div>
          </div>
        )}

        {overdueInvoices.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2"><Clock size={18} /> Overdue Payments</h3>
            <div className="space-y-2">
              {overdueInvoices.slice(0, 3).map(inv => (
                <p key={inv.id} className="text-sm text-amber-800">{inv.customer}: ₹{inv.total.toLocaleString()}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ INVENTORY MANAGEMENT WITH AUTO-REORDER ============
const InventoryComponent = ({ onConvertToReorder }) => {
  const [inventory, setInventory] = useState([
    { id: 1, sku: 'SKU001', productName: 'Widget A', quantity: 150, reorderLevel: 50, unitPrice: 500, warehouse: 'Main', category: 'Electronics', lastRestocked: '2024-01-15', supplier: 'Tech Supplies Inc' },
    { id: 2, sku: 'SKU002', productName: 'Widget B', quantity: 30, reorderLevel: 100, unitPrice: 750, warehouse: 'Branch', category: 'Electronics', lastRestocked: '2024-01-10', supplier: 'Global Imports' },
    { id: 3, sku: 'SKU003', productName: 'Service Pack', quantity: 250, reorderLevel: 50, unitPrice: 1500, warehouse: 'Main', category: 'Services', lastRestocked: '2024-01-18', supplier: 'Premium Services' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ sku: '', productName: '', quantity: 0, reorderLevel: 0, unitPrice: 0, warehouse: 'Main', category: 'Electronics', supplier: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);

  const handleAddItem = (e) => {
    e.preventDefault();
    setInventory([...inventory, { ...formData, id: Date.now(), quantity: parseInt(formData.quantity), reorderLevel: parseInt(formData.reorderLevel), unitPrice: parseInt(formData.unitPrice), lastRestocked: new Date().toISOString().split('T')[0] }]);
    setFormData({ sku: '', productName: '', quantity: 0, reorderLevel: 0, unitPrice: 0, warehouse: 'Main', category: 'Electronics', supplier: '' });
    setShowForm(false);
  };

  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const exportInventory = () => {
    const data = filteredInventory.map(item => ({
      'SKU': item.sku,
      'Product': item.productName,
      'Qty': item.quantity,
      'Reorder Level': item.reorderLevel,
      'Unit Price': item.unitPrice,
      'Total Value': item.quantity * item.unitPrice,
      'Status': item.quantity <= item.reorderLevel ? '🔴 LOW STOCK' : '✅ OK',
      'Supplier': item.supplier
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `Inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Items</p><p className="text-2xl font-bold text-blue-600">{inventory.length}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Value</p><p className="text-2xl font-bold text-green-600">₹{(totalInventoryValue / 100000).toFixed(1)}L</p></div>
        <div className={`bg-white p-4 rounded-lg border ${lowStockItems.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}><p className="text-slate-600 text-sm">Low Stock</p><p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockItems.length}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Avg Unit Price</p><p className="text-2xl font-bold text-purple-600">₹{Math.round(totalInventoryValue / inventory.length).toLocaleString()}</p></div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-3">⚠️ Auto Reorder Suggestions</h3>
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                <span className="text-sm">{item.productName} - Only {item.quantity} left</span>
                <button onClick={() => onConvertToReorder?.(item)} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                  <ShoppingCart size={14} /> Create PO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4"><input type="text" placeholder="Search by SKU or product name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg" /><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Add Item</button><button onClick={exportInventory} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download size={18} />Export</button></div>

      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Add Inventory Item</h3><form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4"><input type="text" placeholder="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Product Name" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Reorder Level" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Unit Price (₹)" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Supplier Name" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="Main">Main Warehouse</option><option value="Branch">Branch Warehouse</option><option value="Store">Store</option></select><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="Electronics">Electronics</option><option value="Services">Services</option><option value="Products">Products</option><option value="Other">Other</option></select><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold">SKU</th><th className="px-4 py-3 text-left font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">Qty</th><th className="px-4 py-3 text-left font-semibold">Supplier</th><th className="px-4 py-3 text-right font-semibold">Price</th><th className="px-4 py-3 text-center font-semibold">Status</th><th className="px-4 py-3 text-center font-semibold">Action</th></tr></thead><tbody>{filteredInventory.map((item) => (<tr key={item.id} className={`border-t ${item.quantity <= item.reorderLevel ? 'bg-red-50' : ''}`}><td className="px-4 py-3 font-mono text-sm">{item.sku}</td><td className="px-4 py-3">{item.productName}</td><td className="px-4 py-3 text-right font-semibold">{item.quantity}</td><td className="px-4 py-3">{item.supplier}</td><td className="px-4 py-3 text-right">₹{item.unitPrice.toLocaleString()}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.quantity <= item.reorderLevel ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.quantity <= item.reorderLevel ? '🔴 LOW' : '✅ OK'}</span></td><td className="px-4 py-3 text-center"><button onClick={() => setInventory(inventory.filter(i => i.id !== item.id))} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div></div>
    </div>
  );
};

// ============ QUOTATIONS WITH SMART CONVERSION ============
const QuotationComponent = ({ onConvertToInvoice }) => {
  const [quotations, setQuotations] = useState([
    { id: 1, quoteNo: 'QT-2024-001', customer: 'Acme Corp', items: [{ name: 'Widget A', qty: 10, price: 500, gst: 900 }], subtotal: 5000, gstAmount: 900, total: 5900, date: '2024-01-15', validTill: '2024-02-15', status: 'sent', notes: 'Valid for 30 days' },
    { id: 2, quoteNo: 'QT-2024-002', customer: 'TechStart Inc', items: [{ name: 'Service Pack', qty: 2, price: 1500, gst: 540 }], subtotal: 3000, gstAmount: 540, total: 3540, date: '2024-01-17', validTill: '2024-02-17', status: 'draft', notes: 'Discount available for bulk orders' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ quoteNo: '', customer: '', items: [{ name: '', qty: 0, price: 0 }], notes: '' });

  const handleAddQuotation = (e) => {
    e.preventDefault();
    const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const total = subtotal + gstAmount;

    setQuotations([...quotations, { 
      ...formData, 
      id: Date.now(), 
      subtotal, 
      gstAmount, 
      total, 
      date: new Date().toISOString().split('T')[0],
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft'
    }]);
    setFormData({ quoteNo: '', customer: '', items: [{ name: '', qty: 0, price: 0 }], notes: '' });
    setShowForm(false);
  };

  const generatePDF = (quotation) => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('QUOTATION', 20, 20);
    pdf.setFontSize(10);
    pdf.text(`Quote #: ${quotation.quoteNo}`, 20, 30);
    pdf.text(`Customer: ${quotation.customer}`, 20, 40);
    pdf.text(`Date: ${quotation.date}`, 20, 50);
    pdf.text(`Valid Till: ${quotation.validTill}`, 20, 60);
    
    let yPos = 75;
    quotation.items.forEach(item => {
      pdf.text(`${item.name} - Qty: ${item.qty} @ ₹${item.price} = ₹${item.qty * item.price}`, 20, yPos);
      yPos += 10;
    });

    pdf.text(`Subtotal: ₹${quotation.subtotal}`, 20, yPos);
    pdf.text(`GST (18%): ₹${quotation.gstAmount}`, 20, yPos + 10);
    pdf.text(`TOTAL: ₹${quotation.total}`, 20, yPos + 20, { fontSize: 12, fontStyle: 'bold' });

    pdf.save(`Quote-${quotation.quoteNo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4"><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />New Quotation</button></div>

      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Create Quotation</h3><form onSubmit={handleAddQuotation} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Quote No." value={formData.quoteNo} onChange={(e) => setFormData({ ...formData, quoteNo: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Customer Name" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /></div><textarea placeholder="Special Notes/Terms" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea><div className="space-y-3"><h4 className="font-semibold">Items</h4>{formData.items.map((item, idx) => (<div key={idx} className="grid grid-cols-4 gap-2"><input type="text" placeholder="Item Name" value={item.name} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].name = e.target.value; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Qty" value={item.qty} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].qty = parseFloat(e.target.value) || 0; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Price" value={item.price} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].price = parseFloat(e.target.value) || 0; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><button type="button" onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><Trash size={16} /></button></div>))}</div><button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { name: '', qty: 0, price: 0 }] })} className="text-sm text-blue-600">+ Add Item</button><div className="flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create Quote</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}

      <div className="grid gap-4">{quotations.map((quotation) => (<div key={quotation.id} className="bg-white p-5 rounded-lg border border-slate-200"><div className="flex items-center justify-between mb-3"><div><h3 className="font-bold">{quotation.quoteNo} - {quotation.customer}</h3><p className="text-sm text-slate-500">{quotation.date} → Valid Till {quotation.validTill}</p></div><span className={`px-3 py-1 rounded-full text-sm font-semibold ${quotation.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{quotation.status.toUpperCase()}</span></div><div className="mb-3"><h4 className="text-sm font-semibold mb-2">Items:</h4>{quotation.items.map((item, idx) => (<p key={idx} className="text-sm text-slate-600">{item.name} x{item.qty} @ ₹{item.price}</p>))}</div><div className="border-t pt-3 mb-3"><p className="text-sm text-slate-600">Subtotal: ₹{quotation.subtotal.toLocaleString()}</p><p className="text-sm text-slate-600">GST (18%): ₹{quotation.gstAmount.toLocaleString()}</p><p className="text-lg font-bold text-blue-600">Total: ₹{quotation.total.toLocaleString()}</p></div><div className="flex gap-2"><button onClick={() => generatePDF(quotation)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download size={16} />PDF</button><button onClick={() => onConvertToInvoice?.(quotation)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><ArrowRight size={16} />Convert to Invoice</button><button onClick={() => setQuotations(quotations.filter(q => q.id !== quotation.id))} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg"><Trash size={16} /></button></div></div>))}</div>
    </div>
  );
};

// ============ INVOICES WITH CREDIT TRACKING ============
const InvoiceComponent = ({ newQuoteData }) => {
  const [invoices, setInvoices] = useState([
    { id: 1, invoiceNo: 'INV-2024-001', customer: 'Acme Corp', items: [{ name: 'Widget A', qty: 10, price: 500, gst: 900 }], subtotal: 5000, gstAmount: 900, total: 5900, date: '2024-01-15', paymentStatus: 'pending', amountPaid: 0, paymentTerms: 'NET 30', dueDate: '2024-02-15', notes: 'Payment due within 30 days' },
    { id: 2, invoiceNo: 'INV-2024-002', customer: 'TechStart Inc', items: [{ name: 'Service Pack', qty: 2, price: 1500, gst: 540 }], subtotal: 3000, gstAmount: 540, total: 3540, date: '2024-01-17', paymentStatus: 'partial', amountPaid: 1500, paymentTerms: 'NET 15', dueDate: '2024-02-01', notes: 'First partial payment received' },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ invoiceNo: '', customer: '', items: [{ name: '', qty: 0, price: 0 }], paymentTerms: 'NET 30', notes: '' });

  // Auto-populate from quote
  React.useEffect(() => {
    if (newQuoteData) {
      const dueDate = new Date();
      const termDays = parseInt(formData.paymentTerms.split(' ')[1]) || 30;
      dueDate.setDate(dueDate.getDate() + termDays);

      setInvoices([...invoices, {
        invoiceNo: `INV-${Date.now()}`,
        customer: newQuoteData.customer,
        items: newQuoteData.items,
        subtotal: newQuoteData.subtotal,
        gstAmount: newQuoteData.gstAmount,
        total: newQuoteData.total,
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'pending',
        amountPaid: 0,
        paymentTerms: 'NET 30',
        dueDate: dueDate.toISOString().split('T')[0],
        notes: newQuoteData.notes || 'Converted from quotation',
        id: Date.now()
      }]);
    }
  }, [newQuoteData]);

  const handleAddInvoice = (e) => {
    e.preventDefault();
    const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const total = subtotal + gstAmount;

    const dueDate = new Date();
    const termDays = parseInt(formData.paymentTerms.split(' ')[1]) || 30;
    dueDate.setDate(dueDate.getDate() + termDays);

    setInvoices([...invoices, { 
      ...formData, 
      id: Date.now(), 
      subtotal, 
      gstAmount, 
      total, 
      date: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      paymentStatus: 'pending',
      amountPaid: 0
    }]);
    setFormData({ invoiceNo: '', customer: '', items: [{ name: '', qty: 0, price: 0 }], paymentTerms: 'NET 30', notes: '' });
    setShowForm(false);
  };

  const generatePDF = (invoice) => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('INVOICE', 20, 20);
    pdf.setFontSize(10);
    pdf.text(`Invoice #: ${invoice.invoiceNo}`, 20, 30);
    pdf.text(`Customer: ${invoice.customer}`, 20, 40);
    pdf.text(`Date: ${invoice.date} | Due: ${invoice.dueDate}`, 20, 50);
    pdf.text(`Terms: ${invoice.paymentTerms}`, 20, 60);
    
    let yPos = 75;
    invoice.items.forEach(item => {
      pdf.text(`${item.name} - Qty: ${item.qty} @ ₹${item.price} = ₹${item.qty * item.price}`, 20, yPos);
      yPos += 10;
    });

    pdf.text(`Subtotal: ₹${invoice.subtotal}`, 20, yPos);
    pdf.text(`GST (18%): ₹${invoice.gstAmount}`, 20, yPos + 10);
    pdf.text(`TOTAL: ₹${invoice.total}`, 20, yPos + 20, { fontSize: 12, fontStyle: 'bold' });
    pdf.text(`Paid: ₹${invoice.amountPaid} | Outstanding: ₹${invoice.total - invoice.amountPaid}`, 20, yPos + 30);

    pdf.save(`Invoice-${invoice.invoiceNo}.pdf`);
  };

  // Customer credit tracking
  const customerCreditMap = {};
  invoices.forEach(inv => {
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
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><CreditCard size={18} /> Customer Credit Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(customerCreditMap).map(([customer, credit]) => (
            <div key={customer} className="bg-white p-3 rounded border border-blue-100">
              <p className="font-semibold text-sm">{customer}</p>
              <p className="text-xs text-slate-600 mt-1">Total Due: ₹{credit.total.toLocaleString()}</p>
              <p className="text-xs text-slate-600">Paid: ₹{credit.paid.toLocaleString()}</p>
              <p className="text-xs font-semibold text-blue-600">Outstanding: ₹{(credit.total - credit.paid).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4"><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />New Invoice</button></div>

      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Create Invoice</h3><form onSubmit={handleAddInvoice} className="space-y-4"><div className="grid grid-cols-3 gap-4"><input type="text" placeholder="Invoice No." value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Customer Name" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="Cash">Cash on Delivery</option><option value="NET 15">NET 15</option><option value="NET 30">NET 30</option><option value="NET 45">NET 45</option></select></div><textarea placeholder="Notes/Terms" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea><div className="space-y-3"><h4 className="font-semibold">Items</h4>{formData.items.map((item, idx) => (<div key={idx} className="grid grid-cols-4 gap-2"><input type="text" placeholder="Item Name" value={item.name} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].name = e.target.value; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Qty" value={item.qty} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].qty = parseFloat(e.target.value) || 0; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Price" value={item.price} onChange={(e) => { const newItems = [...formData.items]; newItems[idx].price = parseFloat(e.target.value) || 0; setFormData({ ...formData, items: newItems }); }} className="px-3 py-2 border border-slate-300 rounded-lg" /><button type="button" onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><Trash size={16} /></button></div>))}</div><button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { name: '', qty: 0, price: 0 }] })} className="text-sm text-blue-600">+ Add Item</button><div className="flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create Invoice</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}

      <div className="grid gap-4">{invoices.map((invoice) => (<div key={invoice.id} className="bg-white p-5 rounded-lg border border-slate-200"><div className="flex items-center justify-between mb-3"><div><h3 className="font-bold">{invoice.invoiceNo} - {invoice.customer}</h3><p className="text-sm text-slate-500">Issued: {invoice.date} | Due: {invoice.dueDate} ({invoice.paymentTerms})</p></div><span className={`px-3 py-1 rounded-full text-sm font-semibold ${invoice.paymentStatus === 'pending' ? 'bg-red-100 text-red-700' : invoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{invoice.paymentStatus.toUpperCase()}</span></div><div className="grid grid-cols-2 gap-4 mb-3"><div><p className="text-sm text-slate-600">Subtotal: ₹{invoice.subtotal.toLocaleString()}</p><p className="text-sm text-slate-600">GST (18%): ₹{invoice.gstAmount.toLocaleString()}</p><p className="text-lg font-bold text-blue-600">Total: ₹{invoice.total.toLocaleString()}</p></div><div><p className="text-sm text-slate-600">Amount Paid: ₹{invoice.amountPaid.toLocaleString()}</p><p className="text-lg font-bold text-red-600">Outstanding: ₹{(invoice.total - invoice.amountPaid).toLocaleString()}</p></div></div><div className="flex gap-2"><button onClick={() => generatePDF(invoice)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download size={16} />PDF</button><button onClick={() => { const updatedInvoices = invoices.map(inv => inv.id === invoice.id ? { ...inv, paymentStatus: 'paid', amountPaid: inv.total } : inv); setInvoices(updatedInvoices); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><CheckCircle size={16} />Mark Paid</button><button onClick={() => setInvoices(invoices.filter(i => i.id !== invoice.id))} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg"><Trash size={16} /></button></div></div>))}</div>
    </div>
  );
};

// ============ MAIN APP ============
export default function KhataBookPRO() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newQuoteData, setNewQuoteData] = useState(null);
  const [inventory, setInventory] = useState([]);

  const appData = {
    invoices: [
      { id: 1, invoiceNo: 'INV-2024-001', customer: 'Acme Corp', items: [{ name: 'Widget A', qty: 10, price: 500 }], subtotal: 5000, gstAmount: 900, total: 5900, date: '2024-01-15', paymentStatus: 'pending', amountPaid: 0 },
      { id: 2, invoiceNo: 'INV-2024-002', customer: 'TechStart Inc', items: [{ name: 'Service Pack', qty: 2, price: 1500 }], subtotal: 3000, gstAmount: 540, total: 3540, date: '2024-01-17', paymentStatus: 'partial', amountPaid: 1500 },
    ],
    inventory: [
      { id: 1, sku: 'SKU001', productName: 'Widget A', quantity: 150, reorderLevel: 50, unitPrice: 500, warehouse: 'Main', category: 'Electronics', lastRestocked: '2024-01-15' },
      { id: 2, sku: 'SKU002', productName: 'Widget B', quantity: 30, reorderLevel: 100, unitPrice: 750, warehouse: 'Branch', category: 'Electronics', lastRestocked: '2024-01-10' },
      { id: 3, sku: 'SKU003', productName: 'Service Pack', quantity: 250, reorderLevel: 50, unitPrice: 1500, warehouse: 'Main', category: 'Services', lastRestocked: '2024-01-18' },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={32} /> KhataBook PRO</h1>
          <p className="text-sm opacity-75">Smart Business Management for Indian Small Businesses</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mt-6 px-4">
        <div className="flex gap-2 mb-6 border-b border-slate-300 flex-wrap">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}><Home size={18} /> Dashboard</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'inventory' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}><Package size={18} /> Inventory</button>
          <button onClick={() => setActiveTab('quotations')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'quotations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}><FileText size={18} /> Quotations</button>
          <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'invoices' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'}`}><DollarSign size={18} /> Invoices</button>
        </div>

        {/* Content */}
        <div className="pb-6">
          {activeTab === 'dashboard' && <DashboardComponent data={appData} />}
          {activeTab === 'inventory' && <InventoryComponent onConvertToReorder={(item) => { alert(`Create PO for ${item.productName}`); }} />}
          {activeTab === 'quotations' && <QuotationComponent onConvertToInvoice={(quote) => { setNewQuoteData(quote); setActiveTab('invoices'); alert('Quote converted to invoice! Switched to invoices tab.'); }} />}
          {activeTab === 'invoices' && <InvoiceComponent newQuoteData={newQuoteData} />}
        </div>
      </div>
    </div>
  );
}
