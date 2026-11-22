import { StoreSettingsConfig } from "../types";

export interface HeroSlide {
  id: string;
  badge: string;
  badgeType: "hot" | "new" | "discount";
  titleBn: string;
  subtitleBn: string;
  subtitleEn: string;
  image: string;
  ctaText: string;
  category?: string;
  discountText: string;
}

export const initialStoreSettings: StoreSettingsConfig = {
  shippingInsideDhaka: 70,
  shippingSubDhaka: 100,
  shippingOutsideDhaka: 130,
  bkashMerchant: "01700-000000",
  nagadMerchant: "01800-000000",
  rocketNumber: "01900-000000",
  shopName: "",
  supportPhone: "",
  supportWhatsapp: "",
  supportEmail: "support@Shopora.com",
  storeAddress: "",
  defaultCourier: "Steadfast",
  vatTaxPercent: 0,
  steadfastApiKey: "",
  steadfastSecretKey: "",
  steadfastTestMode: true,
};
