import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../../types';
import { ScanLine, Camera, CameraOff, Search, Plus, Trash2, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QuickSaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface AdminQuickSaleTabProps {
  products: Product[];
  onCompleteSale: (items: QuickSaleItem[], total: number) => void;
}

const formatTaka = (n: number) => `৳${(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

export const AdminQuickSaleTab: React.FC<AdminQuickSaleTabProps> = ({ products, onCompleteSale }) => {
  const [codeInput, setCodeInput] = useState('');
  const [saleItems, setSaleItems] = useState<QuickSaleItem[]>([]);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setScannerSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBySku = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const product = products.find((p) => p.sku === trimmed || p.id === trimmed);
    if (!product) {
      setMessage({ type: 'error', text: `"${trimmed}" কোডের কোনো প্রোডাক্ট পাওয়া যায়নি।` });
      return;
    }
    if (!product.inStock || (product.stockQty ?? 0) <= 0) {
      setMessage({ type: 'error', text: `${product.name} স্টক আউট।` });
      return;
    }
    setSaleItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
    setMessage({ type: 'success', text: `${product.name} যোগ হয়েছে` });
    setCodeInput('');
  };

  const stopScanner = () => {
    if (detectIntervalRef.current) {
      window.clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async () => {
    if (!scannerSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      // @ts-ignore - BarcodeDetector is a browser-native API, not in default TS lib
      const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'upc_a'] });
      detectIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            addBySku(codes[0].rawValue);
          }
        } catch {
          // ignore transient detection errors
        }
      }, 600);
    } catch (err) {
      console.error('Camera access failed:', err);
      setMessage({ type: 'error', text: 'ক্যামেরা অ্যাক্সেস করা যায়নি — পারমিশন চেক করুন।' });
    }
  };

  const total = useMemo(() => saleItems.reduce((s, it) => s + it.price * it.quantity, 0), [saleItems]);

  const handleRemove = (productId: string) => setSaleItems((prev) => prev.filter((it) => it.productId !== productId));

  const handleQtyChange = (productId: string, qty: number) => {
    if (qty <= 0) return handleRemove(productId);
    setSaleItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity: qty } : it)));
  };

  const handleComplete = () => {
    if (saleItems.length === 0) return;
    onCompleteSale(saleItems, total);
    setSaleItems([]);
    setMessage({ type: 'success', text: 'সেল সম্পন্ন হয়েছে!' });
  };

  return (
    <div className="space-y-5 font-bengali">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-montserrat flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-[#00503a]" /> Quick Sale (POS)
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">বারকোড/QR স্ক্যান করে অথবা কোড টাইপ করে দ্রুত সেল করুন।</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3.5">
          {scannerSupported ? (
            <div>
              {isScanning ? (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
                  <button
                    onClick={stopScanner}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bb0027] text-white text-xs font-bold cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" /> স্ক্যান বন্ধ করুন
                  </button>
                </div>
              ) : (
                <button
                  onClick={startScanner}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-2 text-gray-500 hover:border-[#00503a] hover:text-[#00503a] transition-colors cursor-pointer"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-xs font-semibold">ক্যামেরা দিয়ে স্ক্যান শুরু করুন</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              এই ব্রাউজারে ক্যামেরা বারকোড স্ক্যানার সাপোর্ট নেই — নিচে ম্যানুয়ালি SKU/কোড লিখে যোগ করুন।
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addBySku(codeInput);
            }}
            className="flex gap-2"
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="প্রোডাক্ট SKU/কোড লিখুন"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
            />
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#00503a] text-white text-sm font-bold hover:bg-[#006a4e] cursor-pointer flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> যোগ
            </button>
          </form>

          {message && (
            <p className={`text-xs font-semibold flex items-center gap-1.5 ${message.type === 'error' ? 'text-[#bb0027]' : 'text-[#00503a]'}`}>
              {message.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {message.text}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-[#00503a]" /> বর্তমান সেল
          </p>
          {saleItems.length === 0 ? (
            <p className="text-xs text-gray-400 flex-1">এখনো কোনো প্রোডাক্ট যোগ হয়নি।</p>
          ) : (
            <div className="space-y-2 flex-1">
              {saleItems.map((it) => (
                <div key={it.productId} className="flex items-center justify-between gap-2 text-xs border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-800 truncate flex-1">{it.name}</span>
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => handleQtyChange(it.productId, parseInt(e.target.value, 10) || 0)}
                    className="w-14 px-1.5 py-1 rounded-lg border border-gray-200 text-center"
                  />
                  <span className="font-bold text-gray-900 w-16 text-right">{formatTaka(it.price * it.quantity)}</span>
                  <button onClick={() => handleRemove(it.productId)} className="text-gray-400 hover:text-[#bb0027] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">মোট</span>
            <span className="text-lg font-extrabold text-[#00503a]">{formatTaka(total)}</span>
          </div>
          <button
            onClick={handleComplete}
            disabled={saleItems.length === 0}
            className="w-full mt-3 py-3 rounded-xl bg-[#bb0027] text-white font-bold text-sm hover:bg-[#9c0021] transition-colors cursor-pointer disabled:opacity-50"
          >
            সেল সম্পন্ন করুন
          </button>
        </div>
      </div>
    </div>
  );
};
