import React, { useEffect, useRef, useState } from "react";
import { X, Printer, FileDown } from "lucide-react";

export default function ReceiptPreview({ transaction, onClose }) {
  const [visible, setVisible] = useState(false);
  const printRef = useRef(null);

  const receiptTitles = {
    purchase: "Purchase Order",
    sale: "Sales Receipt",
    transfer: "Transfer Receipt",
    inbound: "Inbound Receipt",
    outbound: "Outbound Receipt",
  };

  useEffect(() => {
    setVisible(!!transaction);
  }, [transaction]);

  const close = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 260);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    if (transaction) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transaction]);

  if (!transaction) return null;

  // ✅ Currency formatter
  const formatCurrency = (n) =>
    n == null || Number.isNaN(n)
      ? "-"
      : `₱${Number(n).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  // ✅ Unified price logic
  const getUnitPrice = (row, transactionType) => {
    if (!row) return 0;
    if (transactionType === "purchase") return row.unitPrice || 0;
    if (transactionType === "sale") {
      return (
        row.transactionSellingPrice ??
        row.customPrice ??
        row.unitPrice ??
        row.sellingPrice ??
        row.product?.sellingPrice ??
        0
      );
    }
    return 0; // for transfer/inbound/outbound
  };

  // ✅ Compute total
  const totalValue = (transaction.products || []).reduce((sum, row) => {
    const qty = Number(row.quantity || 0);
    const price = getUnitPrice(row, transaction.type);
    if (transaction.type === "purchase") {
      const discount = Number(row.discountPercent || 0);
      const discountedPrice = price * (1 - discount / 100);
      return sum + discountedPrice * qty;
    }
    if (transaction.type === "sale") return sum + price * qty;
    return sum;
  }, 0);

  // ✅ Printing
  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const style = `
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #111; }
        h1, h2, h3 { text-align: center; margin: 0; }
        .meta { margin-top: 12px; font-size: 14px; }
        table { width:100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;}
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background:#f3f4f6; }
        .totals { font-weight:700; }
        .footer { margin-top: 18px; text-align:center; font-size: 13px; }
        .signature { display:flex; justify-content:space-between; margin-top: 40px; }
        .signature div { width:45%; border-top:1px solid #000; padding-top: 6px; text-align:center; }
      </style>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(
      `<html><head><title>Receipt</title>${style}</head><body>${html}</body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // ✅ Download as Word
  const handleDownloadWord = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>Receipt</title></head><body>
    `;
    const footer = "</body></html>";
    const blob = new Blob([header + content + footer], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      receiptTitles[transaction.type] || "transaction"
    }_${transaction._id || Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isPurchase = transaction.type === "purchase";
  const isSale = transaction.type === "sale";
  const showPrice = isSale || isPurchase;

  const companyName = transaction.company?.companyName || "-";
  const companyAddress = transaction.company?.address || "";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal Container */}
      <div
        className={`relative bg-white w-[820px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transform transition-all duration-300 ${
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-3"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(.2,.9,.2,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center sticky top-0 bg-white border-b border-gray-200 px-5 py-3 z-10">
          <h2 className="font-semibold text-lg text-gray-800">
            {receiptTitles[transaction.type] || "Transaction Receipt"}
          </h2>
          <button
            onClick={close}
            title="Close"
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <button
            onClick={handleDownloadWord}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium transition"
          >
            <FileDown size={16} /> Download .doc
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            <Printer size={16} /> Print Preview
          </button>
        </div>

        {/* Receipt Body */}
        <div ref={printRef} className="p-6">
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              AVES Consumer Goods and Trading
            </h1>
          </header>

          {/* Meta Info */}
          <section className="mb-5 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {isPurchase && (
                <div>
                  <strong>PO Number:</strong> {transaction.poNumber || "-"}
                </div>
              )}
              <div>
                <strong>Date:</strong>{" "}
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleString()
                  : "-"}
              </div>
              {isPurchase && (
                <>
                  <div>
                    <strong>Supplier:</strong> {companyName}
                  </div>
                  <div>
                    <strong>Deliver To:</strong> {transaction.deliverTo || "-"}
                  </div>
                  <div>
                    <strong>Delivery Date:</strong>{" "}
                    {transaction.deliveryDate
                      ? new Date(transaction.deliveryDate).toLocaleDateString()
                      : "-"}
                  </div>
                  {transaction.company?.terms && (
                    <div>
                      <strong>Payment Terms:</strong> {transaction.company.terms}
                    </div>
                  )}
                </>
              )}
              {isSale && (
                <>
                  <div>
                    <strong>Customer:</strong> {companyName}
                    {companyAddress && (
                      <div className="text-gray-600 text-xs mt-1">
                        {companyAddress}
                      </div>
                    )}
                  </div>
                  {transaction.company?.terms && (
                    <div>
                      <strong>Payment Terms:</strong> {transaction.company.terms}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Table */}
          <section className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-2 text-left font-medium">Product</th>
                  <th className="p-2 text-left font-medium">Quantity</th>
                  {showPrice && (
                    <th className="p-2 text-left font-medium">Unit Price</th>
                  )}
                  {isPurchase && (
                    <th className="p-2 text-left font-medium">Discount %</th>
                  )}
                  {isPurchase && (
                    <th className="p-2 text-left font-medium">
                      Discounted Price
                    </th>
                  )}
                  {showPrice && (
                    <th className="p-2 text-left font-medium">Total</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {transaction.products.map((row, i) => {
                  const prod = row.product || row;
                  const name = prod?.productName || "-";
                  const qty = Number(row.quantity || 0);
                  const unitPrice = getUnitPrice(row, transaction.type);
                  const discount = Number(row.discountPercent || 0);
                  const discountedPrice = isPurchase
                    ? unitPrice * (1 - discount / 100)
                    : unitPrice;
                  const total =
                    isPurchase || isSale ? qty * discountedPrice : 0;

                  return (
                    <tr
                      key={i}
                      className="border-t border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="p-2">{name}</td>
                      <td className="p-2">{qty}</td>
                      {showPrice && (
                        <td className="p-2">{formatCurrency(unitPrice)}</td>
                      )}
                      {isPurchase && <td className="p-2">{discount}%</td>}
                      {isPurchase && (
                        <td className="p-2">
                          {formatCurrency(discountedPrice)}
                        </td>
                      )}
                      {showPrice && (
                        <td className="p-2">{formatCurrency(total)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Totals */}
          {showPrice && (
            <section className="mt-5 text-right text-sm">
              <div className="font-semibold text-gray-800">
                Total: {formatCurrency(totalValue)}
              </div>
            </section>
          )}

          <footer className="mt-8 text-center text-sm text-gray-600">
            <p>Thank you for your business!</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
