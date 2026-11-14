import React from 'react';
import { MessageCircle, MapPin, Phone, Mail, Clock, ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenPolicy?: (type: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPolicy }) => {
  return (
    <footer className="bg-[#191c1d] text-[#e1e3e4] w-full mt-8 border-t border-[#3f4944]/40 font-bengali">
      {/* Top Banner Feature Strip */}
      <div className="border-b border-[#3f4944]/40 bg-[#222526]">
        <div className="w-full lg:w-[90%] mx-auto px-4 md:px-8 py-2.5 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#00503a]/30 flex items-center justify-center text-[#9ef4d0] shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight">100% Genuine Products</p>
              <p className="text-gray-400 text-[10px] hidden sm:block">Every item quality-checked</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#00503a]/30 flex items-center justify-center text-[#9ef4d0] shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight">Hotline Support</p>
              <p className="text-gray-400 text-[10px] font-mono">+880 1700-000000</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] shrink-0">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight">Order on WhatsApp</p>
              <p className="text-gray-400 text-[10px] hidden sm:block">Confirm directly via chat</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#00503a]/30 flex items-center justify-center text-[#9ef4d0] shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight">Fast Delivery</p>
              <p className="text-gray-400 text-[10px] hidden sm:block">Nationwide within 24-72 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Body with Columns */}
      <div className="w-full lg:w-[90%] mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        {/* Col 1: Store Branding & Description (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#006a4e] flex items-center justify-center text-white font-bold text-sm font-montserrat">
              U
            </div>
            <span className="text-xl font-bold text-white font-montserrat tracking-tight">
              Shopora
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
            <strong>Shopora</strong> — Bangladesh's trusted online shop for traditional Jamdani sarees, authentic handicrafts, modern lifestyle products, and gadgets. We are committed to premium quality at affordable prices and fast home delivery.
          </p>

          {/* Social / WhatsApp Direct Contact */}
          <div className="pt-1">
            <a
              id="footer-main-whatsapp-btn"
              href="https://wa.me/8801700000000?text=Hello%20Shopora,%20I%20need%20some%20help."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Col 2: Official Address & Contact Info (4 cols) */}
        <div className="lg:col-span-4 space-y-2 text-xs">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-montserrat text-[#9ef4d0]">
            Office & Contact
          </h4>

          <div className="space-y-1.5 text-gray-300">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#9ef4d0] shrink-0 mt-0.5" />
              <p className="leading-snug">
                House # 42, Road # 8/A, Dhanmondi, Dhaka - 1209
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#9ef4d0] shrink-0" />
              <p className="font-mono text-white">+880 1700-000000</p>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#9ef4d0] shrink-0" />
              <p className="text-gray-300">support@Shopora.com</p>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#9ef4d0] shrink-0" />
              <p className="text-gray-300">9:00 AM - 10:00 PM (Everyday)</p>
            </div>
          </div>

          {/* Policy Links */}
          <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
            <button
              id="footer-link-privacy"
              onClick={() => onOpenPolicy?.('privacy')}
              className="hover:text-white transition-colors underline"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              id="footer-link-terms"
              onClick={() => onOpenPolicy?.('terms')}
              className="hover:text-white transition-colors underline"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              id="footer-link-faq"
              onClick={() => onOpenPolicy?.('faq')}
              className="hover:text-white transition-colors underline"
            >
              FAQ
            </button>
          </div>
        </div>

        {/* Col 3: Live Interactive Location (Google Maps Live Embed) (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-montserrat">
                Live Location
              </h4>
            </div>

            <a
              href="https://maps.google.com/?q=Dhanmondi+Dhaka+Bangladesh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#9ef4d0] hover:underline flex items-center gap-0.5"
            >
              <span>View Larger Map</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Interactive Responsive Compact Map Frame */}
          <div className="w-full h-28 sm:h-32 rounded-lg overflow-hidden border border-[#3f4944] shadow-xs relative group bg-[#222526]">
            <iframe
              id="footer-live-map-iframe"
              title="Shopora Store Live Location"
              src="https://maps.google.com/maps?q=Dhanmondi,%20Dhaka,%20Bangladesh&t=&z=14&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full border-0 filter grayscale-20 contrast-105 hover:grayscale-0 transition-all duration-300"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {/* Overlay badge */}
            <div className="absolute bottom-1.5 left-1.5 bg-[#191c1d]/90 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-white flex items-center gap-1 border border-white/10 pointer-events-none">
              <MapPin className="w-2.5 h-2.5 text-red-400" />
              <span>Dhanmondi, Dhaka</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-[#3f4944]/40 py-2.5 bg-[#121415] text-[11px] text-gray-400 text-center">
        <div className="w-full lg:w-[90%] mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-1">
          <p>© 2024-2026 Shopora. All rights reserved.</p>
          <p className="text-[10px] text-gray-500">
            Safe shopping and the fastest WhatsApp order service
          </p>
        </div>
      </div>
    </footer>
  );
};

