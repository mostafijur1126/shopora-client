import React, { useState } from 'react';
import { OrderItem } from '../../types';
import {
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Package,
  DollarSign,
  Phone,
  MapPin,
  FileText,
  Key,
  ShieldCheck,
  RefreshCw,
  Send
} from 'lucide-react';
import {
  sendOrderToSteadfastCourier,
  bulkSendOrdersToSteadfast,
  getSteadfastCredentials,
  normalizeBDPhoneNumber,
  SteadfastDispatchResult
} from '../../services/steadfastService';

interface AdminSteadfastCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  onOrdersDispatched?: (dispatchedOrders: OrderItem[]) => void;
}

export const AdminSteadfastCourierModal: React.FC<AdminSteadfastCourierModalProps> = ({
  isOpen,
  onClose,
  orders,
  onOrdersDispatched
}) => {
  const [isSending, setIsSending] = useState(false);
  const [credentials, setCredentials] = useState(() => getSteadfastCredentials());
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(credentials.apiKey || '');
  const [secretKeyInput, setSecretKeyInput] = useState(credentials.secretKey || '');

  // Custom editable note and COD amount for single order dispatch
  const isSingle = orders.length === 1;
  const singleOrder = isSingle ? orders[0] : null;

  const defaultCodAmount = singleOrder
    ? (singleOrder.dueAmount !== undefined
        ? singleOrder.dueAmount
        : (singleOrder.paidAmount ? Math.max(0, singleOrder.total - singleOrder.paidAmount) : singleOrder.total))
    : 0;

  const [customCod, setCustomCod] = useState<number>(defaultCodAmount);
  const [customNote, setCustomNote] = useState<string>(
    singleOrder?.note || (singleOrder?.items ? `Item: ${singleOrder.items.slice(0, 70)}` : 'Fragile / Standard Parcel')
  );

  // Dispatch results state
  const [dispatchResults, setDispatchResults] = useState<SteadfastDispatchResult[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen || orders.length === 0) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveTempKeys = () => {
    const updated = {
      ...credentials,
      apiKey: apiKeyInput.trim(),
      secretKey: secretKeyInput.trim()
    };
    setCredentials(updated);
    try {
      const saved = localStorage.getItem('amarshop_store_settings');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.steadfastApiKey = updated.apiKey;
      parsed.steadfastSecretKey = updated.secretKey;
      localStorage.setItem('amarshop_store_settings', JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }
    setShowConfig(false);
  };

  const handleExecuteDispatch = async () => {
    setIsSending(true);
    try {
      if (isSingle && singleOrder) {
        // Build customized order payload with any adjusted COD/note
        const orderToDispatch: OrderItem = {
          ...singleOrder,
          dueAmount: customCod,
          note: customNote
        };
        const result = await sendOrderToSteadfastCourier(orderToDispatch, credentials);
        setDispatchResults([result]);

        if (onOrdersDispatched && result.success) {
          onOrdersDispatched([
            {
              ...orderToDispatch,
              status: 'courier',
              courier: {
                partner: 'Steadfast',
                trackingId: result.trackingCode || '',
                trackingCode: result.trackingCode,
                consignmentId: result.consignmentId,
                trackingUrl: result.trackingUrl,
                assignedAt: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'In Transit',
                courierFee: orderToDispatch.deliveryCharge || 70
              }
            }
          ]);
        }
      } else {
        // Bulk dispatch
        const bulkRes = await bulkSendOrdersToSteadfast(orders, credentials);
        setDispatchResults(bulkRes.results);

        if (onOrdersDispatched) {
          const successfulDispatches = bulkRes.results.filter((r) => r.success);
          const updatedOrdersList = orders
            .filter((o) => successfulDispatches.some((s) => s.orderId === o.id))
            .map((o) => {
              const resInfo = successfulDispatches.find((s) => s.orderId === o.id);
              return {
                ...o,
                status: 'courier' as const,
                courier: {
                  partner: 'Steadfast' as const,
                  trackingId: resInfo?.trackingCode || '',
                  trackingCode: resInfo?.trackingCode,
                  consignmentId: resInfo?.consignmentId,
                  trackingUrl: resInfo?.trackingUrl,
                  assignedAt: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: 'In Transit' as const,
                  courierFee: o.deliveryCharge || 70
                }
              };
            });
          onOrdersDispatched(updatedOrdersList);
        }
      }
    } catch (err: any) {
      console.error('Dispatch failed:', err);
      alert('Error during Steadfast dispatch: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  const totalCodSum = orders.reduce((acc, o) => {
    const cod = o.dueAmount !== undefined
      ? o.dueAmount
      : (o.paidAmount ? Math.max(0, o.total - o.paidAmount) : o.total);
    return acc + cod;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#00503a] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Truck className="w-5 h-5 text-[#9ef4d0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Steadfast Courier API</h3>
                <span className="bg-[#9ef4d0] text-[#003828] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Automated Dispatch
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {isSingle
                  ? `Dispatching Order #${singleOrder?.invoiceId || singleOrder?.id}`
                  : `Bulk dispatching ${orders.length} orders`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-gray-900">
          {/* Dispatch Results View (if completed) */}
          {dispatchResults ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">
                    {dispatchResults.length === 1
                      ? 'Order Dispatched to Steadfast Successfully!'
                      : `${dispatchResults.filter((r) => r.success).length} Orders Dispatched to Steadfast!`}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Consignment IDs and tracking codes have been saved to Firestore. Status updated to <strong>In Courier</strong>.
                  </p>
                </div>
              </div>

              {/* List of returned tracking codes */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {dispatchResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#00503a] bg-emerald-100/60 px-2 py-0.5 rounded">
                          {res.invoiceId}
                        </span>
                        {res.consignmentId && (
                          <span className="text-gray-500 font-mono text-[11px]">
                            CID: {res.consignmentId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 font-mono font-semibold text-gray-800">
                        <span>Tracking:</span>
                        <span className="text-[#00503a]">{res.trackingCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {res.trackingCode && (
                        <button
                          onClick={() => handleCopy(res.trackingCode!)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors cursor-pointer"
                          title="Copy tracking code"
                        >
                          {copiedCode === res.trackingCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span>{copiedCode === res.trackingCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}

                      {res.trackingUrl && (
                        <a
                          href={res.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00503a] text-white rounded-lg hover:bg-[#003828] font-medium transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Done & Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* API Connection Banner */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${credentials.apiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <span className="font-semibold text-gray-800">
                      {credentials.apiKey ? 'Steadfast Live API Connected' : 'Steadfast Sandbox / Automated Mode'}
                    </span>
                    <p className="text-[11px] text-gray-500">
                      Endpoint: <code className="font-mono text-[#00503a]">https://portal.steadfast.com.bd/api/v1/create_order</code>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-[#00503a] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  <span>{showConfig ? 'Hide Keys' : 'API Keys'}</span>
                </button>
              </div>

              {/* Inline API Keys Config */}
              {showConfig && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">Steadfast API Credentials</span>
                    <span className="text-[10px] text-gray-500">Obtain from portal.steadfast.com.bd</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Api-Key</label>
                      <input
                        type="text"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="e.g. stdf_api_key_xxxxxxxx"
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-xs outline-hidden focus:border-[#00503a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Secret-Key</label>
                      <input
                        type="password"
                        value={secretKeyInput}
                        onChange={(e) => setSecretKeyInput(e.target.value)}
                        placeholder="••••••••••••••••••••"
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-xs outline-hidden focus:border-[#00503a]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTempKeys}
                      className="px-3 py-1 bg-[#00503a] text-white rounded-lg text-xs font-semibold hover:bg-[#003828] cursor-pointer"
                    >
                      Save Credentials
                    </button>
                  </div>
                </div>
              )}

              {/* Order Details Preview (Single Order) */}
              {isSingle && singleOrder && (
                <div className="space-y-3.5 bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00503a]" />
                      <span className="font-bold text-xs text-gray-900">
                        Invoice ID: {singleOrder.invoiceId || singleOrder.id}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold bg-emerald-50 text-[#00503a] px-2 py-0.5 rounded border border-emerald-100">
                      Steadfast Express
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Customer Name:</span>
                      <span className="font-bold text-gray-900">{singleOrder.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Phone Number:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {normalizeBDPhoneNumber(singleOrder.phone)}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block text-[11px]">Delivery Address:</span>
                      <span className="text-gray-800 font-medium">{singleOrder.address}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        COD Collection Amount (tk):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={customCod}
                          onChange={(e) => setCustomCod(Number(e.target.value))}
                          className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl font-montserrat font-bold focus:bg-white focus:border-[#00503a] outline-hidden"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">tk</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Order / Item Note for Courier:
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="e.g. Fragile, Deliver by 2 PM"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-[#00503a] outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Orders List Preview */}
              {!isSingle && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-gray-700">
                      Selected Orders ({orders.length})
                    </span>
                    <span className="font-bold text-[#00503a] font-montserrat">
                      Total COD: {totalCodSum.toLocaleString()} tk
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                    {orders.map((o) => {
                      const cod = o.dueAmount !== undefined
                        ? o.dueAmount
                        : (o.paidAmount ? Math.max(0, o.total - o.paidAmount) : o.total);
                      return (
                        <div
                          key={o.id}
                          className="p-2.5 bg-white rounded-lg border border-gray-200/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#00503a]">
                                {o.invoiceId || o.id}
                              </span>
                              <span className="font-medium text-gray-900">{o.customerName}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate max-w-[280px]">
                              {o.phone} • {o.address}
                            </p>
                          </div>

                          <span className="font-bold font-montserrat text-gray-900">
                            {cod.toLocaleString()} tk
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* POST Request Payload Explainer */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-[11px] text-gray-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00503a] shrink-0 mt-0.5" />
                <p>
                  Clicking <strong>Send to Steadfast Courier</strong> will post order data to Steadfast, receive the <code>consignment_id</code> and <code>tracking_code</code>, save them to Firestore, and update order status to <strong>In Courier</strong>.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteDispatch}
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending to Steadfast API...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#9ef4d0]" />
                      <span>Send to Steadfast Courier</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
