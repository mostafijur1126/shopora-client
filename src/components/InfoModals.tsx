import React, { useEffect, useState } from 'react';
import { X, Phone, Mail, MapPin, MessageCircle, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { StoreContactSettings } from '../types';
import { fetchStoreContactSettingsApi } from '../services/api';

interface InfoModalProps {
  type: 'about' | 'contact' | 'privacy' | 'terms' | 'faq' | null;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, onClose }) => {
  const [contactSettings, setContactSettings] =
    useState<StoreContactSettings | null>(null);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactRetry, setContactRetry] = useState(0);

  useEffect(() => {
    if (type !== 'contact') return;

    let active = true;
    setContactSettings(null);
    setIsContactLoading(true);
    setContactError(null);

    fetchStoreContactSettingsApi()
      .then((settings) => {
        if (active) setContactSettings(settings);
      })
      .catch((error: unknown) => {
        if (active) {
          setContactError(
            error instanceof Error
              ? error.message
              : 'Could not load store contact information.',
          );
        }
      })
      .finally(() => {
        if (active) setIsContactLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type, contactRetry]);

  if (!type) return null;

  const hotline = contactSettings?.hotlineNumber.trim() || '';
  const whatsapp = contactSettings?.whatsappNumber.trim() || '';
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const whatsappChatNumber = whatsappDigits.startsWith('00')
    ? whatsappDigits.slice(2)
    : whatsappDigits.startsWith('0')
      ? `88${whatsappDigits.slice(1)}`
      : whatsappDigits;
  const whatsappUrl =
    whatsappChatNumber.length >= 7
      ? `https://wa.me/${whatsappChatNumber}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-bengali">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa]">
          <h3 className="text-lg font-bold text-[#00503a]">
            {type === 'about' && 'About Us - Shopora'}
            {type === 'contact' && 'Contact Us'}
            {type === 'privacy' && 'Privacy Policy'}
            {type === 'terms' && 'Terms & Conditions'}
            {type === 'faq' && 'FAQ'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-[#3f4944] leading-relaxed">
          {type === 'about' && (
            <div className="space-y-4">
              <p>
                <strong>Shopora</strong> is a reliable e-commerce platform for authentic Bangladeshi handicrafts, Jamdani sarees, modern lifestyle products, and electronic gadgets.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#f3f4f5] p-3 rounded-xl text-center">
                  <ShieldCheck className="w-6 h-6 text-[#00503a] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#191c1d]">100% Genuine Products</p>
                </div>
                <div className="bg-[#f3f4f5] p-3 rounded-xl text-center">
                  <Truck className="w-6 h-6 text-[#00503a] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#191c1d]">Nationwide Delivery</p>
                </div>
                <div className="bg-[#f3f4f5] p-3 rounded-xl text-center">
                  <RefreshCw className="w-6 h-6 text-[#00503a] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#191c1d]">Easy Returns</p>
                </div>
              </div>
            </div>
          )}

          {type === 'contact' && (
            <div className="space-y-4">
              <p className="text-sm">
                For any product information or order inquiries, Contact Us:
              </p>
              {isContactLoading && (
                <p role="status" className="text-xs text-gray-500">
                  Loading contact information...
                </p>
              )}
              {contactError && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  <span>{contactError}</span>
                  <button
                    type="button"
                    onClick={() => setContactRetry((retry) => retry + 1)}
                    className="shrink-0 font-bold underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!isContactLoading && !contactError && contactSettings && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone className="w-5 h-5 text-[#00503a]" />
                    <div>
                      <p className="text-xs font-bold text-[#191c1d]">Hotline</p>
                      {hotline ? (
                        <a
                          href={`tel:${hotline.replace(/[^\d+]/g, '')}`}
                          className="text-xs font-mono text-[#00503a] hover:underline"
                        >
                          {hotline}
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500">Not configured</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <div>
                      <p className="text-xs font-bold text-[#191c1d]">WhatsApp Order</p>
                      {whatsapp && whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#00503a] font-semibold hover:underline"
                        >
                          Start Chat ({whatsapp})
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500">Not configured</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="w-5 h-5 text-[#00503a]" />
                    <div>
                      <p className="text-xs font-bold text-[#191c1d]">Email</p>
                      <p className="text-xs">support@shopora.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-[#00503a]" />
                    <div>
                      <p className="text-xs font-bold text-[#191c1d]">Address</p>
                      <p className="text-xs">
                        {contactSettings.storeAddress || 'Not configured'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'privacy' && (
            <div className="space-y-3 text-xs">
              <p>
                Shopora ensures the highest level of protection for customer personal information. Your name, address, and phone number are used solely for product delivery and order coordination.
              </p>
              <p>
                We never sell or share your information with any third party.
              </p>
            </div>
          )}

          {type === 'terms' && (
            <div className="space-y-3 text-xs">
              <p>
                1. Every order confirmed via WhatsApp or the website is delivered within 24-48 hours inside Dhaka, and within 3-5 business days outside Dhaka.
              </p>
              <p>
                2. Please check the product in front of the delivery person upon receipt. Immediate return applies if there is any defect.
              </p>
            </div>
          )}

          {type === 'faq' && (
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-[#191c1d]">Q: How do I place an order?</p>
                <p className="text-gray-600">A: Click the 'Order via WhatsApp' button under any product to send a message directly and confirm your order quickly.</p>
              </div>
              <div>
                <p className="font-bold text-[#191c1d]">Q: What payment methods are available?</p>
                <p className="text-gray-600">A: Cash on Delivery, bKash, and Nagad are all accepted.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-[#f8f9fa]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#00503a] text-white rounded-lg text-xs font-semibold hover:bg-[#046c50]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
