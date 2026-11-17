import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "../utils/scroll";

export const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > 500);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={isVisible ? 0 : -1}
      className={`fixed bottom-32 right-4 z-40 w-11 h-11 rounded-full bg-white text-[#00503a] border border-[#00503a]/15 shadow-lg flex items-center justify-center transition-[opacity,transform,visibility] duration-200 hover:bg-[#e7f6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00503a] focus-visible:ring-offset-2 ${
        isVisible
          ? "visible opacity-100 translate-y-0"
          : "invisible opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
