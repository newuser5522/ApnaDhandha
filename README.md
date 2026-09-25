# Apna Dhandha

A React single-page business app built with Vite. The active app currently provides a dashboard, inventory, quotations, and invoices, with local IndexedDB persistence. Quote and invoice items can autofill from inventory by SKU, with manual entry for unmatched products and editable GST rates.

## Run Locally

```bash
npm install
npm run dev
```

Run `npm run build` to create a production build.

## Source Structure

```text
src/
  App.jsx                  App shell, navigation, and shared business state
  main.jsx                 React entry point
  database.js              IndexedDB collection hook
  index.css                Tailwind and global styles
  components/
    Dashboard.jsx          Business summary and alerts
    Inventory.jsx          Inventory list, entry form, and export
    LineItemsEditor.jsx    Shared SKU lookup and manual line-item entry
    Quotation.jsx          Quote creation, export, and invoice conversion
    Invoice.jsx            Invoice creation, payment status, and export
  utils/
    invoices.js            Shared invoice and line-item helpers
```

`ApnaDhandha-AllPhases-Complete.jsx` remains as a compatibility re-export; the maintained implementation lives under `src/`.
