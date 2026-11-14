import heroBannerImg from "../assets/images/clean_festive_hero_1787591104735.jpg";
import eidFestiveBannerImg from "../assets/images/clean_eid_banner_1787591127059.jpg";
import artisanDecorBannerImg from "../assets/images/clean_decor_banner_1787591145392.jpg";

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

export const heroSlides: HeroSlide[] = [
  {
    id: "slide-1",
    badge: "Seasonal & Special Offers 🔥",
    badgeType: "hot",
    titleBn: "Mega Discounts on Traditional Local Products!",
    subtitleBn:
      "Attractive discounts on authentic Dhakai Jamdani, cotton Panjabi, and Nakshi Kantha. Cash on delivery nationwide.",
    subtitleEn:
      "Celebrate authentic Bangladeshi lifestyle with handcrafted premium collections.",
    image: heroBannerImg,
    ctaText: "Shop Now",
    category: "Fashion",
    discountText: "Up to 50% Off",
  },
  {
    id: "slide-2",
    badge: "New Arrivals 2026 ✨",
    badgeType: "new",
    titleBn: "Exclusive Festive Fashion & Jamdani Collection",
    subtitleBn:
      "Premium sarees handwoven by skilled artisans, designer Panjabi, and leather accessories delivered right to your doorstep.",
    subtitleEn:
      "Exclusive handloom silk, cotton sarees, and designer festive wear.",
    image: eidFestiveBannerImg,
    ctaText: "View Collection",
    category: "Fashion",
    discountText: "Free Home Delivery",
  },
  {
    id: "slide-3",
    badge: "100% Authentic & Handcrafted 🌿",
    badgeType: "discount",
    titleBn: "Elegant Ceramics, Home Decor & Sundarbans Honey",
    subtitleBn:
      "A trusted collection of ceramic dinnerware, terracotta, and natural organic products to elegantly decorate your home.",
    subtitleEn:
      "Handcrafted ceramic dinnerware, home accents & authentic natural honey.",
    image: artisanDecorBannerImg,
    ctaText: "View Products",
    category: "Home & Living",
    discountText: "Special Package",
  },
];

export const promoBanners = [
  {
    id: "promo-1",
    title: "Seasonal Discounts",
    titleBn: "Seasonal Discounts",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8JiCI41Ld4mY6s2nx6Wy_v4KNf4pxw6WHs8YWOCkTv07LkvnwNlLahCK0v6KaESfm3_vIM-orao2p0R-28oP1kGSZK-n3mQMy5HrJjxjRQXdq8VxWDs-loKyR2QZiuqbI-YCbnhEK4BNVaOcm7FxWX6jGXD8oSG0xom6pe3VhaaKoaB3IVApXUTEGoNIrQstdAN43mm-D15XdODb5T7AFnyGOdeQGzptmnOFo2tWh1OCWpXG-2XOLiw",
    category: "Fashion",
  },
  {
    id: "promo-2",
    title: "Featured Categories",
    titleBn: "Featured Categories",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC6mfghKmLHvZku5xa8DXTBOiKsDJWZ8B0BD6oTr8C4AA1ng9WBOlfdrXSKbh4iBUR4frnypQojrldmZumlJ_gTP_7bc0ATpXboOth9qfXuv0HJ2doJKhy56pBFPO7SYqDVcKcbOqufoMs9LopzqvU9iulYjv4UPRsYeG1VJGy0Fei00LXUSZKdXb8ew4ibLdWB_JRH8AYQTYSS3x0juSqYBU8H87edIDgU268JQNpUbUl6dBjdml06AA",
    category: "Home & Living",
  },
  {
    id: "promo-3",
    title: "New Arrivals",
    titleBn: "New Arrivals",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBO3Cvj10DI_IleR_5aQg7tpTa837zGkMWMPynauil2TxldFgZSe8sSMLgwvUcapeajYr7bSqaN2xqkds4_6dn1CN_oFUOAtsjri9VnhL6fGKX4R8n2N90LLVnVWd5TChMMS0QncRcXpU3t4Ghvw-IEu6aT7vwEK5KAKp0tpDgABx9JBEHcc-pslYEL7fLFlyRD7TyD7ixSMjzKCtXvge2OVPrOWH64gtIJAtGo5tStyVptG67HNLyajA",
    category: "Electronics",
  },
];
