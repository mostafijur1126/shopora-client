import { useCallback, useEffect, useState } from "react";
import { StoreContactSettings } from "../types";
import { fetchStoreContactSettingsApi } from "../services/api";

const EMPTY_STORE_CONTACT_SETTINGS: StoreContactSettings = {
  shopName: "",
  shopEmail: "",
  hotlineNumber: "",
  whatsappNumber: "",
  storeAddress: "",
  bkashNumber: "",
  nagadNumber: "",
};

export const useStoreContactSettings = () => {
  const [settings, setSettings] = useState(EMPTY_STORE_CONTACT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const saved = await fetchStoreContactSettingsApi();
      setSettings({
        ...EMPTY_STORE_CONTACT_SETTINGS,
        ...saved,
        shopName: saved.shopName || "",
        shopEmail: saved.shopEmail || "",
        nagadNumber: saved.nagadNumber || "",
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load store contact information.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, isLoading, error, reload };
};
