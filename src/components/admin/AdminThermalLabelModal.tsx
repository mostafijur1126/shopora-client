import React from 'react';
import { OrderItem } from '../../types';
import { X, Printer, Package, Truck, Phone, MapPin, User, CheckCircle2 } from 'lucide-react';

interface AdminThermalLabelModalProps {
  orders: OrderItem[];
  onClose: () => void;
}

export const AdminThermalLabelModal: React.FC<AdminThermalLabelModalProps> = ({ orders, onClose }) => {
  if (!orders || orders.length === 0) return null;

  const handlePrint = () => {
    window.print();
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
                Ready to print ({orders.length} {orders.length === 1 ? 'Label' : 'Labels'}) - 4x6 / Thermal & Standard format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {orders.length > 1 ? `All (${orders.length})` : 'Label'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-100 print:bg-white print:p-0 space-y-6">
          {orders.map((order, idx) => {
            const invoiceCode = order.invoiceId || order.id;
            const courierPartner = order.courier?.partner || 'Steadfast';
            const trackingCode = order.courier?.trackingId || `${courierPartner.toUpperCase().slice(0, 3)}-${invoiceCode.replace(/\D/g, '') || '98765'}`;
            const codAmount = order.dueAmount !== undefined ? order.dueAmount : (order.paymentMethod === 'cod' ? order.total : 0);

            return (
              <div
                key={order.id}
                className="bg-white border-2 border-black rounded-lg p-4 sm:p-5 max-w-md mx-auto shadow-sm print:shadow-none print:border-2 print:border-black print:rounded-none print:break-after-page print:m-0 print:max-w-none text-black"
                style={{ fontFamily: 'monospace, system-ui, sans-serif' }}
              >
                {/* Header: Merchant & Courier */}
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div>
                    <h2 className="text-base font-black tracking-wider uppercase">AmarShop BD</h2>
                    <p className="text-[10px] font-sans text-gray-700">Official Merchant | 01700-000000</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block border-2 border-black px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-gray-100">
                      {courierPartner}
                    </span>
                    <p className="text-[9px] font-sans font-bold mt-0.5">
                      {order.deliveryZone === 'inside_dhaka' ? 'INSIDE DHAKA' : order.deliveryZone === 'sub_dhaka' ? 'DHAKA SUB-CITY' : 'OUTSIDE DHAKA'}
                    </p>
                  </div>
                </div>

                {/* Tracking & Barcode Simulation */}
                <div className="py-3 border-b-2 border-black text-center space-y-1.5 bg-gray-50">
                  <div className="text-[11px] font-bold tracking-widest uppercase">
                    TRACKING: <span className="font-mono font-black text-xs">{trackingCode}</span>
                  </div>
                  {/* Simulated Clean Barcode */}
                  <div className="flex justify-center items-center h-10 px-4">
                    <div className="flex items-stretch justify-center gap-[2px] h-8 w-full max-w-[260px]">
                      {Array.from({ length: 48 }).map((_, bIdx) => (
                        <div
                          key={bIdx}
                          className="bg-black"
                          style={{
                            width: bIdx % 4 === 0 ? '3px' : bIdx % 3 === 0 ? '2px' : '1px',
                            opacity: bIdx % 7 === 0 ? 0 : 1
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
                      <span className="font-bold">District:</span> {order.district}
                    </div>
                  )}
                </div>

                {/* Package Items Info */}
                <div className="py-2.5 border-b-2 border-black space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-600 font-sans">
                    <span>Item Description</span>
                    <span>Qty</span>
                  </div>
                  {order.orderedProducts && order.orderedProducts.length > 0 ? (
                    order.orderedProducts.map((p, pIdx) => (
                      <div key={pIdx} className="flex justify-between text-xs font-sans font-medium text-gray-900">
                        <span className="truncate max-w-[240px]">
                          {p.name} {p.model ? `(${p.model})` : ''}
                        </span>
                        <span className="font-bold">x{p.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs font-sans text-gray-900 truncate">
                      {order.items || 'Standard Retail Order'}
                    </div>
                  )}
                  {order.note && (
                    <div className="text-[10px] font-sans italic text-gray-700 mt-1 bg-gray-100 p-1 border border-gray-300">
                      Note: {order.note}
                    </div>
                  )}
                </div>

                {/* COD & Payment Banner */}
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
                    <span className={`text-xs font-black uppercase px-2 py-0.5 border ${
                      codAmount === 0 ? 'bg-black text-white border-black' : 'bg-gray-100 text-black border-black'
                    }`}>
                      {codAmount === 0 ? 'PREPAID' : 'COLLECT CASH'}
                    </span>
                  </div>
                </div>

                {/* Footer Micro-print */}
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
