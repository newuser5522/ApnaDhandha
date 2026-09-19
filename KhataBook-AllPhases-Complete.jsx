import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BarChart3, Package, FileText, DollarSign, Home, Settings, LogOut, Menu, X, Plus, Trash2, Edit2, AlertCircle, Download, Search, CheckCircle, Clock, Users, TrendingUp, Eye, Trash, Repeat2, Tag, Bell, Smartphone, Lock, BarChart2, PieChart, LineChart } from 'lucide-react';

// ============ PHASE 1: LEDGER ============
const LedgerComponent = () => {
  const [ledgerEntries, setLedgerEntries] = useState([
    { id: 1, date: '2024-01-15', customer: 'Acme Corp', type: 'invoice', description: 'Invoice INV-001', debit: 50000, credit: 0, balance: 50000, status: 'pending' },
    { id: 2, date: '2024-01-16', customer: 'Acme Corp', type: 'payment', description: 'Payment received', debit: 0, credit: 30000, balance: 20000, status: 'completed' },
    { id: 3, date: '2024-01-17', customer: 'TechStart Inc', type: 'invoice', description: 'Invoice INV-002', debit: 25000, credit: 0, balance: 25000, status: 'pending' },
    { id: 4, date: '2024-01-18', customer: 'Global Retail', type: 'expense', description: 'Office supplies', debit: 0, credit: 5000, balance: 45000, status: 'completed' },
  ]);

  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredEntries = ledgerEntries.filter(entry =>
    (filterCustomer === '' || entry.customer.toLowerCase().includes(filterCustomer.toLowerCase())) &&
    (filterType === 'all' || entry.type === filterType)
  );

  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);

  const exportLedger = () => {
    const data = filteredEntries.map(entry => ({
      'Date': entry.date,
      'Customer': entry.customer,
      'Type': entry.type.toUpperCase(),
      'Description': entry.description,
      'Debit': entry.debit,
      'Credit': entry.credit,
      'Balance': entry.balance,
      'Status': entry.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `Ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Debit</p><p className="text-2xl font-bold text-green-600">₹{totalDebit.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Credit</p><p className="text-2xl font-bold text-red-600">₹{totalCredit.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Net Balance</p><p className="text-2xl font-bold text-blue-600">₹{(totalDebit - totalCredit).toLocaleString()}</p></div>
      </div>
      <div className="flex gap-4"><input type="text" placeholder="Filter by customer..." value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg" /><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg"><option value="all">All Types</option><option value="invoice">Invoices</option><option value="payment">Payments</option><option value="expense">Expenses</option></select><button onClick={exportLedger} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download size={18} />Export</button></div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold">Date</th><th className="px-4 py-3 text-left font-semibold">Customer</th><th className="px-4 py-3 text-left font-semibold">Type</th><th className="px-4 py-3 text-left font-semibold">Description</th><th className="px-4 py-3 text-right font-semibold">Debit</th><th className="px-4 py-3 text-right font-semibold">Credit</th><th className="px-4 py-3 text-right font-semibold">Balance</th><th className="px-4 py-3 text-center font-semibold">Status</th></tr></thead><tbody>{filteredEntries.map((entry) => (<tr key={entry.id} className="border-t"><td className="px-4 py-3">{entry.date}</td><td className="px-4 py-3">{entry.customer}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${entry.type === 'invoice' ? 'bg-blue-100 text-blue-700' : entry.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{entry.type}</span></td><td className="px-4 py-3">{entry.description}</td><td className="px-4 py-3 text-right text-green-600 font-semibold">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}</td><td className="px-4 py-3 text-right text-red-600 font-semibold">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}</td><td className="px-4 py-3 text-right font-bold">₹{entry.balance.toLocaleString()}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${entry.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{entry.status}</span></td></tr>))}</tbody></table></div></div>
    </div>
  );
};

// ============ PHASE 1: CUSTOMERS ============
const CustomerComponent = () => {
  const [customers, setCustomers] = useState([
    { id: 1, name: 'Acme Corporation', email: 'john@acme.com', phone: '+91 98765 43210', creditLimit: 100000, creditUsed: 20000, address: 'Mumbai, India', type: 'business', notes: 'Good payer' },
    { id: 2, name: 'TechStart Inc', email: 'contact@techstart.com', phone: '+91 87654 32109', creditLimit: 50000, creditUsed: 25000, address: 'Bangalore, India', type: 'business', notes: 'New customer' },
    { id: 3, name: 'Global Retail', email: 'sales@global.com', phone: '+91 76543 21098', creditLimit: 75000, creditUsed: 0, address: 'Delhi, India', type: 'business', notes: 'Quarterly orders' },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', creditLimit: 0, address: '', type: 'business', notes: '' });

  const handleAddCustomer = (e) => {
    e.preventDefault();
    setCustomers([...customers, { ...formData, id: Date.now(), creditUsed: 0 }]);
    setFormData({ name: '', email: '', phone: '', creditLimit: 0, address: '', type: 'business', notes: '' });
    setShowAddForm(false);
  };

  const exportCustomers = () => {
    const data = customers.map(c => ({ 'Name': c.name, 'Email': c.email, 'Phone': c.phone, 'Credit Limit': c.creditLimit, 'Credit Used': c.creditUsed, 'Available Credit': c.creditLimit - c.creditUsed, 'Address': c.address, 'Notes': c.notes }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `Customers-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4"><button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Add Customer</button><button onClick={exportCustomers} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download size={18} />Export</button></div>
      {showAddForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-xl font-bold mb-4">Add Customer</h2><form onSubmit={handleAddCustomer} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Credit Limit" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseInt(e.target.value) })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2" /><textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2"></textarea><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button><button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{customers.map((customer) => (<div key={customer.id} className="bg-white p-6 rounded-lg border border-slate-200"><div className="flex justify-between items-start mb-4"><h3 className="text-lg font-bold text-slate-900">{customer.name}</h3><button onClick={() => setCustomers(customers.filter(c => c.id !== customer.id))} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={18} /></button></div><div className="space-y-2 text-sm"><p className="text-slate-600">📧 {customer.email}</p><p className="text-slate-600">📞 {customer.phone}</p><p className="text-slate-600">📍 {customer.address}</p><div className="pt-2 border-t"><div className="flex justify-between mb-2"><span className="font-medium">Credit Limit:</span><span>₹{customer.creditLimit.toLocaleString()}</span></div><div className="flex justify-between mb-2"><span className="font-medium">Used:</span><span className="text-orange-600">₹{customer.creditUsed.toLocaleString()}</span></div><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(customer.creditUsed / customer.creditLimit) * 100}%` }}></div></div></div>{customer.notes && <p className="text-slate-600 italic mt-2">📝 {customer.notes}</p>}</div></div>))}</div>
    </div>
  );
};

// ============ PHASE 1: PAYMENTS ============
const PaymentComponent = () => {
  const [payments, setPayments] = useState([
    { id: 1, date: '2024-01-16', customer: 'Acme Corp', invoiceId: 'INV-001', amount: 30000, method: 'bank-transfer', reference: 'TXN123456', status: 'completed' },
    { id: 2, date: '2024-01-18', customer: 'TechStart Inc', invoiceId: 'INV-002', amount: 10000, method: 'cash', reference: 'CASH001', status: 'pending' },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ customer: '', invoiceId: '', amount: 0, method: 'bank-transfer', reference: '', status: 'pending' });

  const handleAddPayment = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    setPayments([...payments, { ...formData, id: Date.now(), date: today }]);
    setFormData({ customer: '', invoiceId: '', amount: 0, method: 'bank-transfer', reference: '', status: 'pending' });
    setShowAddForm(false);
  };

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Received</p><p className="text-2xl font-bold text-green-600">₹{totalReceived.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Pending</p><p className="text-2xl font-bold text-orange-600">₹{totalPending.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Transactions</p><p className="text-2xl font-bold text-blue-600">{payments.length}</p></div>
      </div>
      <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Record Payment</button>
      {showAddForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-xl font-bold mb-4">Record Payment</h2><form onSubmit={handleAddPayment} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Customer" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Invoice ID" value={formData.invoiceId} onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="bank-transfer">Bank Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="upi">UPI</option></select><input type="text" placeholder="Reference (TXN ID, Cheque #)" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2" /><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Record</button><button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold">Date</th><th className="px-4 py-3 text-left font-semibold">Customer</th><th className="px-4 py-3 text-left font-semibold">Invoice</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3 text-left font-semibold">Method</th><th className="px-4 py-3 text-left font-semibold">Reference</th><th className="px-4 py-3 text-center font-semibold">Status</th></tr></thead><tbody>{payments.map((payment) => (<tr key={payment.id} className="border-t"><td className="px-4 py-3">{payment.date}</td><td className="px-4 py-3">{payment.customer}</td><td className="px-4 py-3 font-mono text-blue-600">{payment.invoiceId}</td><td className="px-4 py-3 text-right font-semibold">₹{payment.amount.toLocaleString()}</td><td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{payment.method}</span></td><td className="px-4 py-3 text-slate-600">{payment.reference}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${payment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status}</span></td></tr>))}</tbody></table></div></div>
    </div>
  );
};

// ============ PHASE 1: REPORTS ============
const ReportsComponent = () => {
  const salesData = { today: 50000, thisWeek: 250000, thisMonth: 850000, thisYear: 2500000 };
  const customerData = [
    { name: 'Acme Corp', sales: 350000, outstanding: 20000 },
    { name: 'TechStart Inc', sales: 200000, outstanding: 25000 },
    { name: 'Global Retail', sales: 150000, outstanding: 0 },
  ];
  const expenseData = [
    { category: 'Office Supplies', amount: 50000 },
    { category: 'Salaries', amount: 200000 },
    { category: 'Rent', amount: 75000 },
    { category: 'Utilities', amount: 25000 },
  ];
  const totalExpenses = expenseData.reduce((sum, e) => e.amount, 0);
  const totalRevenue = salesData.thisMonth;
  const profit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-2xl font-bold text-slate-900 mb-4">Revenue Summary</h2><div className="grid grid-cols-4 gap-4"><div className="p-4 bg-blue-50 rounded-lg"><p className="text-slate-600 text-sm">Today</p><p className="text-xl font-bold text-blue-600">₹{salesData.today.toLocaleString()}</p></div><div className="p-4 bg-green-50 rounded-lg"><p className="text-slate-600 text-sm">This Week</p><p className="text-xl font-bold text-green-600">₹{salesData.thisWeek.toLocaleString()}</p></div><div className="p-4 bg-purple-50 rounded-lg"><p className="text-slate-600 text-sm">This Month</p><p className="text-xl font-bold text-purple-600">₹{salesData.thisMonth.toLocaleString()}</p></div><div className="p-4 bg-orange-50 rounded-lg"><p className="text-slate-600 text-sm">This Year</p><p className="text-xl font-bold text-orange-600">₹{(salesData.thisYear / 100000).toFixed(1)}L</p></div></div></div>
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-2xl font-bold text-slate-900 mb-4">Profit & Loss</h2><div className="space-y-3"><div className="flex justify-between items-center p-3 bg-green-50 rounded-lg"><span className="font-medium text-slate-900">Total Revenue</span><span className="text-lg font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span></div><div className="flex justify-between items-center p-3 bg-red-50 rounded-lg"><span className="font-medium text-slate-900">Total Expenses</span><span className="text-lg font-bold text-red-600">₹{totalExpenses.toLocaleString()}</span></div><div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200"><span className="font-bold text-slate-900">Net Profit</span><span className="text-2xl font-bold text-blue-600">₹{profit.toLocaleString()}</span></div></div></div>
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-2xl font-bold text-slate-900 mb-4">Top Customers</h2><div className="space-y-3">{customerData.map((customer, idx) => (<div key={idx} className="p-4 bg-slate-50 rounded-lg"><div className="flex justify-between mb-2"><span className="font-medium text-slate-900">{customer.name}</span><span className="text-slate-600">Outstanding: ₹{customer.outstanding.toLocaleString()}</span></div><div className="text-sm text-slate-600">Sales: ₹{customer.sales.toLocaleString()}</div></div>))}</div></div>
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h2 className="text-2xl font-bold text-slate-900 mb-4">Expense Breakdown</h2><div className="space-y-2">{expenseData.map((expense, idx) => (<div key={idx} className="flex justify-between items-center"><span className="text-slate-600">{expense.category}</span><div className="flex items-center gap-3 flex-1 ml-4"><div className="flex-1 bg-slate-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(expense.amount / totalExpenses) * 100}%` }}></div></div><span className="font-semibold text-right w-24">₹{expense.amount.toLocaleString()}</span></div></div>))}</div></div>
    </div>
  );
};

// ============ PHASE 2: RECURRING INVOICES ============
const RecurringInvoicesComponent = () => {
  const [recurring, setRecurring] = useState([
    { id: 1, customer: 'Acme Corp', amount: 50000, frequency: 'monthly', startDate: '2024-01-01', nextDate: '2024-02-01', status: 'active', dayOfMonth: 1 },
    { id: 2, customer: 'TechStart Inc', amount: 25000, frequency: 'weekly', startDate: '2024-01-08', nextDate: '2024-01-22', status: 'active', dayOfMonth: null },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer: '', amount: 0, frequency: 'monthly', startDate: '', dayOfMonth: 1 });

  const handleAddRecurring = (e) => {
    e.preventDefault();
    setRecurring([...recurring, { ...formData, id: Date.now(), status: 'active', nextDate: formData.startDate }]);
    setFormData({ customer: '', amount: 0, frequency: 'monthly', startDate: '', dayOfMonth: 1 });
    setShowForm(false);
  };

  const toggleStatus = (id) => {
    setRecurring(recurring.map(r => r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200"><h2 className="text-2xl font-bold mb-2">Recurring Invoices</h2><p className="text-slate-600">Auto-generate invoices on schedule</p></div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Add Recurring Invoice</button>
      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">New Recurring Invoice</h3><form onSubmit={handleAddRecurring} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Customer" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{recurring.map((rec) => (<div key={rec.id} className={`p-6 rounded-lg border-2 ${rec.status === 'active' ? 'bg-white border-green-200' : 'bg-slate-50 border-slate-300'}`}><div className="flex justify-between items-start mb-4"><div><h3 className="text-lg font-bold">{rec.customer}</h3><p className="text-slate-600 text-sm">{rec.frequency.toUpperCase()}</p></div><button onClick={() => toggleStatus(rec.id)} className={`px-3 py-1 rounded text-xs font-semibold ${rec.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{rec.status}</button></div><div className="space-y-2 text-sm"><p>💰 Amount: ₹{rec.amount.toLocaleString()}</p><p>📅 Start: {rec.startDate}</p><p>⏰ Next: {rec.nextDate}</p></div></div>))}</div>
    </div>
  );
};

// ============ PHASE 2: EXPENSE TRACKING ============
const ExpenseTrackerComponent = () => {
  const [expenses, setExpenses] = useState([
    { id: 1, date: '2024-01-15', category: 'Office Supplies', amount: 5000, vendor: 'Staples', description: 'Stationery items', receipt: true },
    { id: 2, date: '2024-01-16', category: 'Travel', amount: 2500, vendor: 'Uber', description: 'Client meeting', receipt: false },
    { id: 3, date: '2024-01-17', category: 'Meals', amount: 1500, vendor: 'Restaurant XYZ', description: 'Team lunch', receipt: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ category: 'Office Supplies', amount: 0, vendor: '', description: '', date: new Date().toISOString().split('T')[0] });

  const categories = ['Office Supplies', 'Travel', 'Meals', 'Utilities', 'Marketing', 'Salaries', 'Rent', 'Software', 'Other'];

  const handleAddExpense = (e) => {
    e.preventDefault();
    setExpenses([...expenses, { ...formData, id: Date.now(), amount: parseInt(formData.amount), receipt: false }]);
    setFormData({ category: 'Office Supplies', amount: 0, vendor: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryBreakdown = categories.map(cat => ({ cat, total: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0) })).filter(c => c.total > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Expenses</p><p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Transactions</p><p className="text-2xl font-bold text-blue-600">{expenses.length}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Avg Per Transaction</p><p className="text-2xl font-bold text-purple-600">₹{Math.round(totalExpenses / expenses.length).toLocaleString()}</p></div>
      </div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Log Expense</button>
      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Record Expense</h3><form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-4"><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg">{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select><input type="text" placeholder="Vendor/Source" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2"></textarea><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Category Breakdown</h3><div className="space-y-2">{categoryBreakdown.map((c, idx) => (<div key={idx} className="flex justify-between items-center"><span>{c.cat}</span><div className="flex items-center gap-3 flex-1 ml-4"><div className="flex-1 bg-slate-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${(c.total / totalExpenses) * 100}%` }}></div></div><span className="font-semibold text-right w-24">₹{c.total.toLocaleString()}</span></div></div>))}</div></div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Vendor</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{expenses.map(e => (<tr key={e.id} className="border-t"><td className="px-4 py-3">{e.date}</td><td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{e.category}</span></td><td className="px-4 py-3">{e.vendor}</td><td className="px-4 py-3">{e.description}</td><td className="px-4 py-3 text-right font-semibold">₹{e.amount.toLocaleString()}</td></tr>))}</tbody></table></div>
    </div>
  );
};

// ============ PHASE 2: CREDIT/DEBIT NOTES ============
const CreditsDebitsComponent = () => {
  const [notes, setNotes] = useState([
    { id: 1, date: '2024-01-16', customer: 'Acme Corp', type: 'credit', invoiceId: 'INV-001', amount: 5000, reason: 'Product return', description: '2 units returned' },
    { id: 2, date: '2024-01-17', customer: 'TechStart Inc', type: 'debit', invoiceId: 'INV-002', amount: 2000, reason: 'Additional charges', description: 'Shipping adjustment' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer: '', type: 'credit', invoiceId: '', amount: 0, reason: '', description: '' });

  const handleAddNote = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    setNotes([...notes, { ...formData, id: Date.now(), date: today, amount: parseInt(formData.amount) }]);
    setFormData({ customer: '', type: 'credit', invoiceId: '', amount: 0, reason: '', description: '' });
    setShowForm(false);
  };

  const creditTotal = notes.filter(n => n.type === 'credit').reduce((sum, n) => sum + n.amount, 0);
  const debitTotal = notes.filter(n => n.type === 'debit').reduce((sum, n) => sum + n.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Credits</p><p className="text-2xl font-bold text-green-600">₹{creditTotal.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Debits</p><p className="text-2xl font-bold text-red-600">₹{debitTotal.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Net Balance</p><p className="text-2xl font-bold text-blue-600">₹{(creditTotal - debitTotal).toLocaleString()}</p></div>
      </div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Create Note</button>
      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Create Credit/Debit Note</h3><form onSubmit={handleAddNote} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Customer" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="credit">Credit Note (Refund/Return)</option><option value="debit">Debit Note (Additional Charge)</option></select><input type="text" placeholder="Invoice ID" value={formData.invoiceId} onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg"></textarea><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Reason</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{notes.map(n => (<tr key={n.id} className="border-t"><td className="px-4 py-3">{n.date}</td><td className="px-4 py-3">{n.customer}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${n.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{n.type.toUpperCase()}</span></td><td className="px-4 py-3 font-mono">{n.invoiceId}</td><td className="px-4 py-3">{n.reason}</td><td className="px-4 py-3 text-right font-semibold">₹{n.amount.toLocaleString()}</td></tr>))}</tbody></table></div>
    </div>
  );
};

// ============ PHASE 2: USER ROLES & PERMISSIONS ============
const UserManagementComponent = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@business.com', role: 'admin', status: 'active', joinDate: '2024-01-01' },
    { id: 2, name: 'Manager', email: 'manager@business.com', role: 'manager', status: 'active', joinDate: '2024-01-05' },
    { id: 3, name: 'Staff', email: 'staff@business.com', role: 'staff', status: 'active', joinDate: '2024-01-10' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'staff' });

  const roles = {
    admin: { label: 'Admin', perms: 'Full access to all features', color: 'red' },
    manager: { label: 'Manager', perms: 'Reports, payments, customers', color: 'blue' },
    staff: { label: 'Staff', perms: 'View only, record payments', color: 'green' },
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    setUsers([...users, { ...formData, id: Date.now(), status: 'active', joinDate: today }]);
    setFormData({ name: '', email: '', role: 'staff' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-lg border border-blue-200"><h2 className="text-2xl font-bold mb-2">User Management</h2><p className="text-slate-600">Role-based access control</p></div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Invite User</button>
      {showForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Add User</h3><form onSubmit={handleAddUser} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2"><option value="staff">Staff (View & Payments)</option><option value="manager">Manager (Reports & Customers)</option><option value="admin">Admin (Full Access)</option></select><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button><button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="grid grid-cols-3 gap-4 mb-6">{Object.entries(roles).map(([roleId, role]) => (<div key={roleId} className={`p-4 rounded-lg border border-${role.color}-200 bg-${role.color}-50`}><p className="font-bold">{role.label}</p><p className="text-sm text-slate-600">{role.perms}</p></div>))}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{users.map((user) => (<div key={user.id} className="bg-white p-6 rounded-lg border border-slate-200"><div className="flex justify-between mb-4"><div><h3 className="text-lg font-bold">{user.name}</h3><p className="text-slate-600 text-sm">{user.email}</p></div><span className={`px-3 py-1 rounded text-xs font-semibold bg-${roles[user.role].color}-100 text-${roles[user.role].color}-700`}>{roles[user.role].label}</span></div><div className="space-y-2 text-sm"><p>📅 Joined: {user.joinDate}</p><p>Status: <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">{user.status}</span></p></div></div>))}</div>
    </div>
  );
};

// ============ PHASE 3: PAYMENT REMINDERS & ALERTS ============
const RemindersComponent = () => {
  const [reminders, setReminders] = useState([
    { id: 1, customer: 'Acme Corp', amount: 20000, daysOverdue: 5, invoiceId: 'INV-001', priority: 'high' },
    { id: 2, customer: 'TechStart Inc', amount: 15000, daysOverdue: 2, invoiceId: 'INV-002', priority: 'medium' },
  ]);

  const sendReminder = (id) => {
    alert(`📱 Reminder sent to customer for payment!`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200"><h2 className="text-2xl font-bold mb-2">Payment Reminders</h2><p className="text-slate-600">Overdue & upcoming payments</p></div>
      <div className="grid grid-cols-1 gap-4">{reminders.map((reminder) => (<div key={reminder.id} className={`p-6 rounded-lg border-2 ${reminder.priority === 'high' ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}><div className="flex justify-between items-start mb-4"><div><h3 className="text-lg font-bold">{reminder.customer}</h3><p className="text-slate-600">{reminder.invoiceId}</p></div><span className={`px-3 py-1 rounded-full text-xs font-semibold ${reminder.priority === 'high' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>{reminder.priority.toUpperCase()}</span></div><div className="space-y-2 mb-4"><p className="font-semibold">💰 Amount Due: ₹{reminder.amount.toLocaleString()}</p><p className="text-red-700 font-bold">⏰ {reminder.daysOverdue} days overdue</p></div><div className="flex gap-2"><button onClick={() => sendReminder(reminder.id)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><Bell size={16} />Send Reminder</button><button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">✓ Mark Paid</button></div></div>))}</div>
    </div>
  );
};

// ============ PHASE 3: ADVANCED ANALYTICS ============
const AdvancedAnalyticsComponent = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200"><h2 className="text-2xl font-bold mb-2">Advanced Analytics</h2><p className="text-slate-600">Business insights & trends</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><BarChart2 size={32} className="text-blue-600 mb-3" /><p className="font-bold">Revenue Trend</p><p className="text-sm text-slate-600">Monthly growth analysis</p></div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><PieChart size={32} className="text-purple-600 mb-3" /><p className="font-bold">Sales Mix</p><p className="text-sm text-slate-600">By customer & category</p></div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><LineChart size={32} className="text-green-600 mb-3" /><p className="font-bold">Profit Margin</p><p className="text-sm text-slate-600">Quarterly performance</p></div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><TrendingUp size={32} className="text-orange-600 mb-3" /><p className="font-bold">Growth Metrics</p><p className="text-sm text-slate-600">YoY comparison</p></div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><Users size={32} className="text-red-600 mb-3" /><p className="font-bold">Customer Health</p><p className="text-sm text-slate-600">Retention & churn</p></div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer"><AlertCircle size={32} className="text-yellow-600 mb-3" /><p className="font-bold">Risk Analysis</p><p className="text-sm text-slate-600">Overdue & credit risk</p></div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">📊 Sample Insights</h3><div className="space-y-3"><p className="flex items-center gap-2"><CheckCircle size={18} className="text-green-600" /> Revenue increased by 15% this month</p><p className="flex items-center gap-2"><CheckCircle size={18} className="text-green-600" /> Top customer: Acme Corp (42% of revenue)</p><p className="flex items-center gap-2"><AlertCircle size={18} className="text-orange-600" /> 3 invoices overdue by more than 5 days</p><p className="flex items-center gap-2"><CheckCircle size={18} className="text-green-600" /> Expense ratio down to 35%</p></div></div>
    </div>
  );
};

// ============ PHASE 3: SMS/WHATSAPP INTEGRATION ============
const NotificationsComponent = () => {
  const [notificationSettings, setNotificationSettings] = useState({
    smsEnabled: true,
    whatsappEnabled: true,
    emailEnabled: true,
  });

  const [templates, setTemplates] = useState([
    { id: 1, name: 'Payment Reminder', type: 'sms', message: 'Hi {customer}, payment of ₹{amount} is due for {invoice}. Please pay at your earliest.', enabled: true },
    { id: 2, name: 'Invoice Sent', type: 'whatsapp', message: 'Invoice {invoice} for ₹{amount} has been sent. Thank you!', enabled: true },
    { id: 3, name: 'Payment Received', type: 'sms', message: 'Payment of ₹{amount} received for {invoice}. Thank you!', enabled: true },
  ]);

  const toggleTemplate = (id) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border border-green-200"><h2 className="text-2xl font-bold mb-2">Notifications & Messaging</h2><p className="text-slate-600">SMS & WhatsApp integration</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-lg border-2 cursor-pointer transition ${notificationSettings.smsEnabled ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`} onClick={() => setNotificationSettings({ ...notificationSettings, smsEnabled: !notificationSettings.smsEnabled })}><p className="font-bold">📱 SMS</p><p className="text-sm text-slate-600">{notificationSettings.smsEnabled ? 'Enabled' : 'Disabled'}</p><p className="text-xs text-slate-500 mt-2">Send payment reminders via SMS</p></div>
        <div className={`p-6 rounded-lg border-2 cursor-pointer transition ${notificationSettings.whatsappEnabled ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`} onClick={() => setNotificationSettings({ ...notificationSettings, whatsappEnabled: !notificationSettings.whatsappEnabled })}><p className="font-bold">💬 WhatsApp</p><p className="text-sm text-slate-600">{notificationSettings.whatsappEnabled ? 'Enabled' : 'Disabled'}</p><p className="text-xs text-slate-500 mt-2">Send invoices via WhatsApp</p></div>
        <div className={`p-6 rounded-lg border-2 cursor-pointer transition ${notificationSettings.emailEnabled ? 'border-green-300 bg-green-50' : 'border-slate-300 bg-slate-50'}`} onClick={() => setNotificationSettings({ ...notificationSettings, emailEnabled: !notificationSettings.emailEnabled })}><p className="font-bold">📧 Email</p><p className="text-sm text-slate-600">{notificationSettings.emailEnabled ? 'Enabled' : 'Disabled'}</p><p className="text-xs text-slate-500 mt-2">Send invoices & receipts via email</p></div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Message Templates</h3><div className="space-y-3">{templates.map((template) => (<div key={template.id} className="p-4 bg-slate-50 rounded-lg border"><div className="flex justify-between items-start mb-2"><div><p className="font-bold">{template.name}</p><span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{template.type.toUpperCase()}</span></div><button onClick={() => toggleTemplate(template.id)} className={`px-3 py-1 rounded text-xs font-semibold ${template.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-300 text-slate-700'}`}>{template.enabled ? 'Enabled' : 'Disabled'}</button></div><p className="text-sm text-slate-600 mt-2">{template.message}</p></div>))}</div></div>
    </div>
  );
};

// ============ PHASE 3: OFFLINE MODE & CHEQUE MANAGEMENT ============
const OfflineAndChequeComponent = () => {
  const [cheques, setCheques] = useState([
    { id: 1, chequeNo: 'CHQ001', amount: 50000, customer: 'Acme Corp', date: '2024-02-15', status: 'pending', notes: 'Post-dated' },
    { id: 2, chequeNo: 'CHQ002', amount: 25000, customer: 'TechStart Inc', date: '2024-01-20', status: 'cleared', notes: '' },
  ]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showChequeForm, setShowChequeForm] = useState(false);
  const [chequeForm, setChequeForm] = useState({ chequeNo: '', amount: 0, customer: '', date: '', notes: '' });

  const handleAddCheque = (e) => {
    e.preventDefault();
    setCheques([...cheques, { ...chequeForm, id: Date.now(), amount: parseInt(chequeForm.amount), status: 'pending' }]);
    setChequeForm({ chequeNo: '', amount: 0, customer: '', date: '', notes: '' });
    setShowChequeForm(false);
  };

  const pendingCheques = cheques.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const clearedCheques = cheques.filter(c => c.status === 'cleared').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center"><div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-lg border border-slate-200 flex-1"><h2 className="text-2xl font-bold mb-2">Cheque Management</h2><p className="text-slate-600">Track incoming & outgoing cheques</p></div><button onClick={() => setOfflineMode(!offlineMode)} className={`px-6 py-3 rounded-lg font-semibold ${offlineMode ? 'bg-orange-600 text-white' : 'bg-slate-200'}`}>{offlineMode ? '📡 Offline Mode' : 'Online'}</button></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Pending Cheques</p><p className="text-2xl font-bold text-orange-600">₹{pendingCheques.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Cleared Cheques</p><p className="text-2xl font-bold text-green-600">₹{clearedCheques.toLocaleString()}</p></div>
        <div className="bg-white p-4 rounded-lg border border-slate-200"><p className="text-slate-600 text-sm">Total Cheques</p><p className="text-2xl font-bold text-blue-600">{cheques.length}</p></div>
      </div>
      <button onClick={() => setShowChequeForm(!showChequeForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={18} />Add Cheque</button>
      {showChequeForm && (<div className="bg-white p-6 rounded-lg border border-slate-200"><h3 className="text-xl font-bold mb-4">Record Cheque</h3><form onSubmit={handleAddCheque} className="grid grid-cols-2 gap-4"><input type="text" placeholder="Cheque #" value={chequeForm.chequeNo} onChange={(e) => setChequeForm({ ...chequeForm, chequeNo: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="number" placeholder="Amount" value={chequeForm.amount} onChange={(e) => setChequeForm({ ...chequeForm, amount: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="text" placeholder="Customer" value={chequeForm.customer} onChange={(e) => setChequeForm({ ...chequeForm, customer: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><input type="date" value={chequeForm.date} onChange={(e) => setChequeForm({ ...chequeForm, date: e.target.value })} required className="px-3 py-2 border border-slate-300 rounded-lg" /><textarea placeholder="Notes" value={chequeForm.notes} onChange={(e) => setChequeForm({ ...chequeForm, notes: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg col-span-2"></textarea><div className="col-span-2 flex gap-2"><button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button><button type="button" onClick={() => setShowChequeForm(false)} className="flex-1 px-4 py-2 bg-slate-300 rounded-lg">Cancel</button></div></form></div>)}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Cheque #</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th></tr></thead><tbody>{cheques.map(c => (<tr key={c.id} className="border-t"><td className="px-4 py-3 font-mono">{c.chequeNo}</td><td className="px-4 py-3">{c.customer}</td><td className="px-4 py-3 text-right font-semibold">₹{c.amount.toLocaleString()}</td><td className="px-4 py-3">{c.date}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${c.status === 'cleared' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{c.status}</span></td></tr>))}</tbody></table></div>
    </div>
  );
};

// ============ MAIN APP ============
export default function KhataBookComplete() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const DashboardPage = () => (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold text-slate-900">KhataBook — Complete Edition</h1><p className="text-slate-600">All 3 phases: Accounting, Business Management, Advanced Analytics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 cursor-pointer hover:shadow-lg transition" onClick={() => setCurrentPage('ledger')}><BarChart3 className="text-blue-600 mb-3" size={28} /><p className="font-semibold">Ledger</p><p className="text-sm text-slate-600 mt-1">Phase 1</p></div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 cursor-pointer hover:shadow-lg transition" onClick={() => setCurrentPage('recurring')}><Repeat2 className="text-purple-600 mb-3" size={28} /><p className="font-semibold">Recurring</p><p className="text-sm text-slate-600 mt-1">Phase 2</p></div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 cursor-pointer hover:shadow-lg transition" onClick={() => setCurrentPage('analytics')}><BarChart2 className="text-orange-600 mb-3" size={28} /><p className="font-semibold">Analytics</p><p className="text-sm text-slate-600 mt-1">Phase 3</p></div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 cursor-pointer hover:shadow-lg transition" onClick={() => setCurrentPage('reminders')}><Bell className="text-green-600 mb-3" size={28} /><p className="font-semibold">Reminders</p><p className="text-sm text-slate-600 mt-1">Phase 3</p></div>
      </div>
    </div>
  );

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, phase: '1' },
    { id: 'ledger', label: 'Ledger', icon: FileText, phase: '1' },
    { id: 'customers', label: 'Customers', icon: Users, phase: '1' },
    { id: 'payments', label: 'Payments', icon: DollarSign, phase: '1' },
    { id: 'reports', label: 'Reports', icon: TrendingUp, phase: '1' },
    { section: 'phase2', label: '--- Phase 2 Features ---' },
    { id: 'recurring', label: 'Recurring', icon: Repeat2, phase: '2' },
    { id: 'expenses', label: 'Expenses', icon: Tag, phase: '2' },
    { id: 'credits', label: 'Credit/Debit', icon: FileText, phase: '2' },
    { id: 'users', label: 'Users', icon: Lock, phase: '2' },
    { section: 'phase3', label: '--- Phase 3 Features ---' },
    { id: 'reminders', label: 'Reminders', icon: Bell, phase: '3' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, phase: '3' },
    { id: 'notifications', label: 'Notifications', icon: Smartphone, phase: '3' },
    { id: 'cheques', label: 'Cheques', icon: FileText, phase: '3' },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 border-b border-slate-800"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white">K</div>{sidebarOpen && <div><p className="font-bold">KhataBook</p><p className="text-xs text-slate-400">All Phases</p></div>}</div></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.section) return <div key={item.section} className="px-4 py-2 text-xs font-bold text-slate-400 mt-4">{sidebarOpen ? item.label : '—'}</div>;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all text-sm ${currentPage === item.id ? 'bg-gradient-to-r from-green-600 to-green-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 border-t border-slate-800 hover:bg-slate-800"><X size={20} /></button>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 p-6 shadow-sm"><div><h2 className="text-2xl font-bold text-slate-900">{menuItems.find((item) => item.id === currentPage)?.label || 'Dashboard'}</h2><p className="text-slate-600">Complete Edition • All 3 Phases</p></div></div>
        <div className="flex-1 overflow-auto"><div className="max-w-7xl mx-auto p-6">{currentPage === 'dashboard' && <DashboardPage />}{currentPage === 'ledger' && <LedgerComponent />}{currentPage === 'customers' && <CustomerComponent />}{currentPage === 'payments' && <PaymentComponent />}{currentPage === 'reports' && <ReportsComponent />}{currentPage === 'recurring' && <RecurringInvoicesComponent />}{currentPage === 'expenses' && <ExpenseTrackerComponent />}{currentPage === 'credits' && <CreditsDebitsComponent />}{currentPage === 'users' && <UserManagementComponent />}{currentPage === 'reminders' && <RemindersComponent />}{currentPage === 'analytics' && <AdvancedAnalyticsComponent />}{currentPage === 'notifications' && <NotificationsComponent />}{currentPage === 'cheques' && <OfflineAndChequeComponent />}</div></div>
      </div>
    </div>
  );
}
