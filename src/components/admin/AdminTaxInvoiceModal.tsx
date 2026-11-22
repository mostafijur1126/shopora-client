import React, { useRef, useState } from "react";
import { OrderItem } from "../../types";
import { useStoreContactSettings } from "../../hooks/useStoreContactSettings";
import {
  X,
  Printer,
  ShieldCheck,
  MapPin,
  FileText,
} from "lucide-react";

interface AdminTaxInvoiceModalProps {
  order?: OrderItem | null;
  orders?: OrderItem[];
  onClose: () => void;
}

export const AdminTaxInvoiceModal: React.FC<AdminTaxInvoiceModalProps> = ({
  order,
  orders,
  onClose,
}) => {
  const activeOrders =
    orders && orders.length > 0 ? orders : order ? [order] : [];
  const {
    settings: storeSettings,
    isLoading: isStoreSettingsLoading,
    error: storeSettingsError,
    reload: reloadStoreSettings,
  } = useStoreContactSettings();

  const printAreaRef = useRef<HTMLDivElement>(null);
  const isPrintingRef = useRef(false);
  const [isPrinting, setIsPrinting] = useState(false);

  if (activeOrders.length === 0) return null;

  const handlePrint = async () => {
    if (!printAreaRef.current || isPrintingRef.current) return;

    isPrintingRef.current = true;
    setIsPrinting(true);

    let iframe: HTMLIFrameElement | null = null;

    try {
      iframe = document.createElement("iframe");

      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.left = "-9999px";

      document.body.appendChild(iframe);

      const printDocument = iframe.contentDocument;

      if (!printDocument) {
        throw new Error("Unable to create print document.");
      }

      printDocument.open();

      printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Tax Invoice</title>

          ${Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((link) => link.outerHTML)
            .join("")}

          ${Array.from(document.querySelectorAll("style"))
            .map((style) => style.outerHTML)
            .join("")}

          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: #fff !important;
              font-family: Arial, Helvetica, sans-serif;
            }

            .invoice-print-wrapper {
              width: 100%;
            }

            .invoice-print-page {
              width: 190mm;
              min-height: 277mm;
              margin: 0 auto;
              padding: 0;
              background: #fff !important;
              color: #111827;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              overflow: visible !important;
              page-break-after: always;
              break-after: page;
            }

            .invoice-print-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            img,
            svg {
              max-width: 100%;
            }

            @media print {
              html,
              body {
                width: 190mm;
                margin: 0;
                padding: 0;
              }

              .invoice-print-page {
                width: 190mm;
                min-height: 277mm;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="invoice-print-wrapper">
            ${printAreaRef.current.innerHTML}
          </div>
        </body>
      </html>
    `);

      printDocument.close();

      // Wait for external stylesheets and fonts to load.
      await Promise.all(
        Array.from(
          printDocument.querySelectorAll('link[rel="stylesheet"]'),
        ).map(
          (link) =>
            new Promise<void>((resolve) => {
              link.addEventListener("load", () => resolve(), { once: true });
              link.addEventListener("error", () => resolve(), { once: true });

              setTimeout(resolve, 3000);
            }),
        ),
      );

      if (printDocument.fonts?.ready) {
        await printDocument.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const printWindow = iframe.contentWindow;

      if (!printWindow) {
        throw new Error("Unable to access print window.");
      }

      printWindow.onafterprint = () => {
        iframe?.remove();
        iframe = null;

        isPrintingRef.current = false;
        setIsPrinting(false);
      };

      printWindow.focus();
      printWindow.print();

      // Fallback cleanup for browsers that do not fire afterprint.
      setTimeout(() => {
        if (iframe?.isConnected) {
          iframe.remove();
          iframe = null;
        }

        isPrintingRef.current = false;
        setIsPrinting(false);
      }, 60000);
    } catch (error) {
      console.error("Invoice printing failed:", error);

      iframe?.remove();

      isPrintingRef.current = false;
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="p-4 bg-[#191c1d] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#9ef4d0]" />
            <div>
              <span className="text-sm font-bold font-montserrat">
                Tax Invoice & Delivery Memo
              </span>
              <p className="text-[11px] text-gray-400">
                {activeOrders.length}{" "}
                {activeOrders.length === 1
                  ? `Invoice (#${activeOrders[0].invoiceId || activeOrders[0].id})`
                  : "Invoices Selected"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting || isStoreSettingsLoading}
              className="flex items-center gap-1.5 bg-[#00503a] hover:bg-[#003828] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isPrinting
                  ? "Preparing..."
                  : `Print ${activeOrders.length > 1 ? `All (${activeOrders.length})` : "Invoice"}`}
              </span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(isStoreSettingsLoading || storeSettingsError) && (
          <div
            role={storeSettingsError ? "alert" : "status"}
            className="print:hidden border-b border-gray-200 bg-amber-50 px-5 py-2 text-xs text-amber-900"
          >
            {storeSettingsError ? (
              <span className="flex items-center justify-between gap-3">
                <span>
                  Store details could not be loaded: {storeSettingsError}
                </span>
                <button
                  type="button"
                  onClick={() => void reloadStoreSettings()}
                  className="shrink-0 font-bold underline"
                >
                  Retry
                </button>
              </span>
            ) : (
              "Loading current store details..."
            )}
          </div>
        )}

        {/* Printable Invoice Sheet Container */}
        <div
          ref={printAreaRef}
          className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gray-50 print:bg-white print:p-0 space-y-8 invoice-print-wrapper"
        >
          {activeOrders.map((ord) => {
            const invoiceCode =
              ord.invoiceId ||
              (ord.id.startsWith("AS-")
                ? ord.id
                : `AS-${ord.id.replace(/\D/g, "") || "19685"}`);
            const deliveryCharge =
              ord.deliveryCharge ||
              (ord.deliveryZone === "outside_dhaka" ? 130 : 60);
            const subtotal =
              ord.subtotal || Math.max(0, ord.total - deliveryCharge);
            const paid =
              ord.paidAmount !== undefined
                ? ord.paidAmount
                : ord.paymentMethod === "bkash" || ord.paymentMethod === "nagad"
                  ? ord.total
                  : 0;
            const due =
              ord.dueAmount !== undefined
                ? ord.dueAmount
                : Math.max(0, ord.total - paid);

            return (
              <div
                key={ord.id}
                className="invoice-print-page bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0 print:break-after-page text-gray-900"
              >
                {/* Invoice Header */}
                <div className="border-b-2 border-[#00503a] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-[#003828] font-montserrat tracking-tight break-words">
                      {storeSettings.shopName.trim() || "Store name not configured"}
                    </h1>
                    <p className="text-xs text-gray-600 mt-2 break-words">
                      Hotline:{" "}
                      {storeSettings.hotlineNumber.trim() || "Not configured"}
                      <span className="mx-2 text-gray-300">|</span>
                      Email:{" "}
                      {storeSettings.shopEmail.trim() || "Not configured"}
                    </p>
                    <div className="mt-1.5 text-[11px] text-gray-600">
                      <p className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-[#00503a] shrink-0 mt-0.5" />
                        <span>
                          {storeSettings.storeAddress.trim() ||
                            "Address not configured"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Official Tax Invoice / Cash Memo
                    </span>
                    <p className="text-base font-extrabold font-mono text-[#00503a]">
                      {invoiceCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Date: {ord.date}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 justify-start sm:justify-end">
                      <span className="bg-emerald-100 text-[#00503a] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {ord.saleType || "Online Store"}
                      </span>
                      <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {ord.paymentMethod || "COD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer & Courier Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs">
                  <div>
                    <p className="font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">
                      Customer / Shipping Details:
                    </p>
                    <p className="font-bold text-sm text-gray-900">
                      {ord.customerName}
                    </p>
                    <p className="text-gray-700 mt-0.5 leading-relaxed">
                      {ord.address}
                    </p>
                    <p className="font-mono text-gray-900 font-bold mt-1">
                      Phone: {ord.phone}
                    </p>
                    {ord.district && (
                      <p className="text-gray-500 font-medium">
                        District: {ord.district}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">
                      Courier & Logistics Info:
                    </p>
                    <p className="font-semibold text-gray-800">
                      Courier Partner:{" "}
                      <span className="font-bold text-[#00503a]">
                        {ord.courier?.partner || "Steadfast Courier"}
                      </span>
                    </p>
                    <p className="font-mono text-gray-700 mt-0.5">
                      Tracking Code:{" "}
                      {ord.courier?.trackingId ||
                        `${(ord.courier?.partner || "ST").toUpperCase().slice(0, 3)}-${invoiceCode.replace(/\D/g, "")}`}
                    </p>
                    <p className="text-gray-600 mt-0.5">
                      Delivery Zone:{" "}
                      {ord.deliveryZone === "outside_dhaka"
                        ? "Outside Dhaka (130 tk)"
                        : ord.deliveryZone === "sub_dhaka"
                          ? "Sub-Dhaka (100 tk)"
                          : "Inside Dhaka (60 tk)"}
                    </p>
                    {ord.note && (
                      <p className="text-amber-800 bg-amber-50 p-1.5 rounded mt-2 border border-amber-200 text-[11px]">
                        <strong>Order Note:</strong> {ord.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Itemized Order Table */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8faf9] text-gray-700 font-bold uppercase text-[11px] border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">
                          Item Description / Variant
                        </th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ord.orderedProducts && ord.orderedProducts.length > 0 ? (
                        ord.orderedProducts.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-2.5 px-3 font-mono text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-gray-900">
                                {item.name}
                              </span>
                              {item.model && (
                                <span className="text-[11px] text-gray-500 ml-1 font-mono">
                                  [{item.model}]
                                </span>
                              )}
                              {item.sku && (
                                <span className="text-[10px] text-gray-400 block font-mono">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-montserrat">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-montserrat">
                              {item.price.toLocaleString()} tk
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-montserrat text-[#00503a]">
                              {(item.price * item.quantity).toLocaleString()} tk
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2.5 px-3 font-mono text-gray-500">
                            1
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {ord.items}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-montserrat">
                            1
                          </td>
                          <td className="py-2.5 px-3 text-right font-montserrat">
                            {subtotal.toLocaleString()} tk
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-montserrat text-[#00503a]">
                            {subtotal.toLocaleString()} tk
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pricing Breakdown & Authorised Seal */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#00503a]/40 flex flex-col items-center justify-center text-[#00503a] p-1 rotate-[-8deg] bg-emerald-50/50">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight">
                        Store Verified
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p className="font-bold text-gray-800">
                        Official Authorised Seal
                      </p>
                      <p className="text-[11px]">
                        100% Genuine Quality Guaranteed
                      </p>
                      <p className="text-[10px] text-gray-400">
                        System generated legal invoice
                      </p>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="w-full sm:w-72 bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-bold font-montserrat">
                        {subtotal.toLocaleString()} tk
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Delivery Charge:</span>
                      <span className="font-bold font-montserrat">
                        {deliveryCharge} tk
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-bold text-gray-900">
                      <span>Grand Total:</span>
                      <span className="font-extrabold font-montserrat text-sm text-[#00503a]">
                        {ord.total.toLocaleString()} tk
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 pt-1">
                      <span>Paid Amount:</span>
                      <span className="font-bold text-emerald-700 font-montserrat">
                        {paid.toLocaleString()} tk
                      </span>
                    </div>
                    <div className="border-t border-dashed border-gray-300 pt-1.5 flex items-center justify-between text-sm font-black text-rose-700">
                      <span>Due to Collect (COD):</span>
                      <span className="font-black font-montserrat text-base">
                        {due.toLocaleString()} tk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
                  Thank you for your purchase.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
