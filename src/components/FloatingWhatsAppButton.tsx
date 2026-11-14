import React, { useCallback, useEffect, useState } from "react";
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
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#20b858] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 md:bottom-6 md:right-6 md:h-16 md:w-16"
    >
      <span
        className="whatsapp-wave absolute inset-0 rounded-full"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 32 32"
        className="relative h-8 w-8 md:h-9 md:w-9"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16.04 2.003C8.32 2.003 2.04 8.28 2.037 16c0 2.466.645 4.875 1.87 6.997L2 30l7.19-1.886A13.93 13.93 0 0 0 16.04 30h.006c7.72 0 13.998-6.28 14.001-14 0-3.74-1.456-7.255-4.1-9.9a13.91 13.91 0 0 0-9.907-4.097Zm.006 25.65h-.005a11.59 11.59 0 0 1-5.906-1.615l-.424-.252-4.267 1.12 1.14-4.16-.276-.427A11.59 11.59 0 0 1 4.54 16c.003-6.34 5.163-11.497 11.505-11.497a11.43 11.43 0 0 1 8.134 3.37A11.43 11.43 0 0 1 27.55 16c-.003 6.34-5.163 11.65-11.504 11.65Zm6.315-8.67c-.346-.173-2.05-1.012-2.368-1.128-.317-.116-.548-.173-.779.173-.23.346-.894 1.128-1.096 1.36-.202.23-.404.26-.75.086-.346-.173-1.461-.538-2.783-1.716-1.029-.917-1.724-2.05-1.926-2.396-.202-.346-.022-.533.152-.705.156-.155.346-.404.519-.606.173-.202.23-.346.346-.577.115-.23.058-.433-.03-.606-.087-.173-.779-1.88-1.067-2.573-.281-.676-.567-.584-.779-.595l-.664-.012c-.23 0-.606.087-.923.433-.317.346-1.212 1.184-1.212 2.887 0 1.702 1.241 3.347 1.414 3.577.173.23 2.443 3.73 5.92 5.229.827.357 1.472.57 1.975.73.83.264 1.585.227 2.182.138.666-.1 2.05-.838 2.339-1.647.288-.808.288-1.5.202-1.644-.086-.144-.317-.23-.663-.404Z" />
      </svg>
    </a>
  );
};
