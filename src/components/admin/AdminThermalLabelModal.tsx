import React, { useRef, useState } from "react";
import { OrderItem } from "../../types";
import { useStoreContactSettings } from "../../hooks/useStoreContactSettings";
import { X, Printer, Package, Phone } from "lucide-react";

interface AdminThermalLabelModalProps {
  orders: OrderItem[];
  onClose: () => void;
}

export const AdminThermalLabelModal: React.FC<AdminThermalLabelModalProps> = ({
  orders,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const isPrintingRef = useRef(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const {
    settings: storeSettings,
    isLoading: isStoreSettingsLoading,
    error: storeSettingsError,
    reload: reloadStoreSettings,
  } = useStoreContactSettings();

  if (!orders || orders.length === 0) return null;

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

      const styles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]'),
      )
        .map((link) => link.outerHTML)
        .join("");

      const inlineStyles = Array.from(document.querySelectorAll("style"))
        .map((style) => style.outerHTML)
        .join("");

      printDocument.open();

      printDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            

            ${styles}
            ${inlineStyles}

            <style>
              @page {
                size: 4in 6in;
                margin: 0;
              }

              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html,
              body {
                margin: 0 !important;
                padding: 0 !important;
                width: 4in !important;
                background: #fff !important;
                font-family: monospace, system-ui, sans-serif;
              }

              .label-print-wrapper {
                width: 4in;
                margin: 0;
                padding: 0;
              }

              .thermal-label-page {
                width: 4in !important;
                height: 6in !important;
                min-height: 6in !important;
                max-height: 6in !important;
                margin: 0 !important;
                padding: 0.15in !important;
                background: #fff !important;
                color: #000 !important;
                border: 2px solid #000 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                overflow: hidden !important;
                page-break-after: always;
                break-after: page;
              }

              .thermal-label-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              img,
              svg {
                max-width: 100%;
              }

              @media print {
                html,
                body {
                  width: 4in !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }

                .thermal-label-page {
                  width: 4in !important;
                  height: 6in !important;
                  min-height: 6in !important;
                  max-height: 6in !important;
                }
              }
            </style>
          </head>

          <body>
            <div class="label-print-wrapper">
              ${printAreaRef.current.innerHTML}
            </div>
          </body>
        </html>
      `);

      printDocument.close();

      // Wait for stylesheets.
      await Promise.all(
        Array.from(
          printDocument.querySelectorAll('link[rel="stylesheet"]'),
        ).map(
          (link) =>
            new Promise<void>((resolve) => {
              link.addEventListener("load", () => resolve(), {
                once: true,
              });

              link.addEventListener("error", () => resolve(), {
                once: true,
              });

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

      // Fallback cleanup.
      setTimeout(() => {
        if (iframe?.isConnected) {
          iframe.remove();
          iframe = null;
        }

        isPrintingRef.current = false;
        setIsPrinting(false);
      }, 60000);
    } catch (error) {
      console.error("Label printing failed:", error);

      iframe?.remove();

      isPrintingRef.current = false;
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-[#191c1d] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-[#9ef4d0]" />

            <div>
              <h3 className="text-sm font-bold font-montserrat">
                Courier Thermal Shipping Labels
              </h3>

              <p className="text-[11px] text-gray-400">
                Ready to print ({orders.length}{" "}
                {orders.length === 1 ? "Label" : "Labels"}) - 4x6 Thermal Format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || isStoreSettingsLoading}
              className="flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />

              <span>
                {isPrinting
                  ? "Preparing..."
                  : `Print ${orders.length > 1 ? `All (${orders.length})` : "Label"}`}
              </span>
            </button>

            <button
              type="button"
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

        {/* Printable Area */}
        <div
          ref={printAreaRef}
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-100 print:bg-white print:p-0 space-y-6 label-print-wrapper"
        >
          {orders.map((order) => {
            const invoiceCode = order.invoiceId || order.id;

            const courierPartner = order.courier?.partner || "Steadfast";

            const trackingCode =
              order.courier?.trackingId ||
              `${courierPartner.toUpperCase().slice(0, 3)}-${invoiceCode.replace(/\D/g, "") || "98765"}`;

            const codAmount =
              order.dueAmount !== undefined
                ? order.dueAmount
                : order.paymentMethod === "cod"
                  ? order.total
                  : 0;

            return (
              <div
                key={order.id}
                className="thermal-label-page bg-white border-2 border-black rounded-lg p-4 sm:p-5 max-w-md mx-auto shadow-sm print:shadow-none print:border-2 print:border-black print:rounded-none print:break-after-page print:m-0 print:max-w-none text-black"
                style={{
                  fontFamily: "monospace, system-ui, sans-serif",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div>
                    <h2 className="max-w-[190px] break-words text-base font-black tracking-wider uppercase leading-tight">
                      {storeSettings.shopName.trim() ||
                        "Store name not configured"}
                    </h2>

                    <p className="max-w-[190px] break-words text-[9px] font-sans text-gray-700">
                      Hotline:{" "}
                      {storeSettings.hotlineNumber.trim() || "Not configured"}
                    </p>
                    <p className="max-w-[190px] break-words text-[9px] font-sans text-gray-700">
                      Email:{" "}
                      {storeSettings.shopEmail.trim() || "Not configured"}
                    </p>
                    {storeSettings.storeAddress.trim() && (
                      <p className="text-[8px] font-sans text-gray-600 max-w-[190px] leading-tight">
                        {storeSettings.storeAddress}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="inline-block border-2 border-black px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-gray-100">
                      {courierPartner}
                    </span>

                    <p className="text-[9px] font-sans font-bold mt-0.5">
                      {order.deliveryZone === "inside_dhaka"
                        ? "INSIDE DHAKA"
                        : order.deliveryZone === "sub_dhaka"
                          ? "DHAKA SUB-CITY"
                          : "OUTSIDE DHAKA"}
                    </p>
                  </div>
                </div>

                {/* Tracking & Barcode */}
                <div className="py-3 border-b-2 border-black text-center space-y-1.5 bg-gray-50">
                  <div className="text-[11px] font-bold tracking-widest uppercase">
                    TRACKING:{" "}
                    <span className="font-mono font-black text-xs">
                      {trackingCode}
                    </span>
                  </div>

                  <div className="flex justify-center items-center h-10 px-4">
                    <div className="flex items-stretch justify-center gap-[2px] h-8 w-full max-w-[260px]">
                      {Array.from({ length: 48 }).map((_, bIdx) => (
                        <div
                          key={bIdx}
                          className="bg-black"
                          style={{
                            width:
                              bIdx % 4 === 0
                                ? "3px"
                                : bIdx % 3 === 0
                                  ? "2px"
                                  : "1px",
                            opacity: bIdx % 7 === 0 ? 0 : 1,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono tracking-widest text-gray-600">
                    *{invoiceCode}*
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="py-3 border-b-2 border-black space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider font-sans">
                    SHIP TO (CUSTOMER):
                  </div>

                  <div className="font-bold text-sm leading-tight text-black">
                    {order.customerName}
                  </div>

                  <div className="text-xs font-bold text-black flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-black shrink-0" />
                    <span>{order.phone}</span>
                  </div>

                  <div className="text-xs font-sans leading-relaxed text-gray-900">
                    <span className="font-bold">Address:</span> {order.address}
                  </div>

                  {order.district && (
                    <div className="text-xs font-sans text-gray-800">
                      <span className="font-bold">District:</span>{" "}
                      {order.district}
                    </div>
                  )}
                </div>

                {/* Package Items */}
                <div className="py-2.5 border-b-2 border-black space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-600 font-sans">
                    <span>Item Description</span>
                    <span>Qty</span>
                  </div>

                  {order.orderedProducts && order.orderedProducts.length > 0 ? (
                    order.orderedProducts.map((p, pIdx) => (
                      <div
                        key={p.id || pIdx}
                        className="flex justify-between text-xs font-sans font-medium text-gray-900"
                      >
                        <span className="truncate max-w-[240px]">
                          {p.name} {p.model ? `(${p.model})` : ""}
                        </span>

                        <span className="font-bold">x{p.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs font-sans text-gray-900 truncate">
                      {order.items || "Standard Retail Order"}
                    </div>
                  )}

                  {order.note && (
                    <div className="text-[10px] font-sans italic text-gray-700 mt-1 bg-gray-100 p-1 border border-gray-300">
                      Note: {order.note}
                    </div>
                  )}
                </div>

                {/* COD & Payment */}
                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase block font-sans">
                      COLLECT ON DELIVERY (COD):
                    </span>

                    <span className="text-xl font-black text-black font-montserrat">
                      {codAmount.toLocaleString()} tk
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-600 uppercase block font-sans">
                      PAYMENT STATUS:
                    </span>

                    <span
                      className={`text-xs font-black uppercase px-2 py-0.5 border ${
                        codAmount === 0
                          ? "bg-black text-white border-black"
                          : "bg-gray-100 text-black border-black"
                      }`}
                    >
                      {codAmount === 0 ? "PREPAID" : "COLLECT CASH"}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-dashed border-gray-400 flex justify-between items-center text-[9px] font-sans text-gray-500">
                  <span>Order Date: {order.date}</span>
                  <span>Invoice: #{invoiceCode}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
