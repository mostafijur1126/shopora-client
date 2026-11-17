import React, { useCallback, useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { StoreContactSettings } from "../types";
import { fetchStoreContactSettingsApi } from "../services/api";

const getWhatsAppChatNumber = (phone: string): string | null => {
  let digits = phone.replace(/\D/g, "");

  // Remove international dialing prefix
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Convert local format: 017XXXXXXXX -> 88017XXXXXXXX
  if (digits.startsWith("01")) {
    digits = `88${digits}`;
  }

  // Convert 88 prefix: 881XXXXXXXXX -> 8801XXXXXXXXX
  else if (digits.startsWith("88") && !digits.startsWith("880")) {
    digits = `880${digits.slice(2)}`;
  }

  // Convert 1XXXXXXXXX -> 8801XXXXXXXXX
  else if (digits.startsWith("1") && digits.length === 10) {
    digits = `880${digits}`;
  }

  // Validate Bangladesh mobile number
  return /^8801[3-9]\d{8}$/.test(digits) ? digits : null;
};

export const FloatingWhatsAppButton: React.FC = () => {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  const loadWhatsAppNumber = useCallback(async () => {
    try {
      const settings: StoreContactSettings =
        await fetchStoreContactSettingsApi();

      setWhatsappNumber(getWhatsAppChatNumber(settings.whatsappNumber));
    } catch (error) {
      setWhatsappNumber(null);
      console.error("Could not load the store WhatsApp number.", error);
    }
  }, []);

  useEffect(() => {
    void loadWhatsAppNumber();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadWhatsAppNumber();
      }
    };

    window.addEventListener("focus", loadWhatsAppNumber);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", loadWhatsAppNumber);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadWhatsAppNumber]);

  if (!whatsappNumber) return null;

  const message = encodeURIComponent("hello Shopora");
  const href = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Shopora on WhatsApp"
      title="Chat with Shopora on WhatsApp"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#20b858] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 md:bottom-6 md:right-6 md:h-16 md:w-16"
    >
      <span
        className="whatsapp-wave absolute inset-0 rounded-full"
        aria-hidden="true"
      />

      <FaWhatsapp
        className="relative h-6 w-6 md:h-8 md:w-8 md:h-9 md:w-9"
        aria-hidden="true"
      />
    </a>
  );
};
