import { Schema, model } from "mongoose";

export interface IColorVariant {
  name: string;
  hex: string;
}

export interface IProduct {
  name: string;
  nameEn?: string;
  sku?: string;
  model?: string;
  models?: string[];
  sizes?: string[];
  colors?: IColorVariant[];
  colorVariants?: IColorVariant[];
  category: string;
  categoryBn?: string;
  price: number;
  originalPrice?: number;
  promotionalPrice?: number;
  costPrice?: number;
  discountBadge?: string;
  image: string;
  images?: string[];
  inStock: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  description?: string;
  detailedDescription?: string;
  features?: string[];
  specifications?: Record<string, string>;
  deliveryTime?: string;
  materialOrOrigin?: string;
  isPopular?: boolean;
  isFeatured?: boolean;
  hasColors?: boolean;
  hasSizes?: boolean;
  pdpSectionVisibility?: {
    description: boolean;
    specifications: boolean;
    reviews: boolean;
    relatedProducts: boolean;
    recentlyViewed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const colorVariantSchema = new Schema<IColorVariant>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    hex: { type: String, trim: true, default: "#007A55" },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    nameEn: { type: String, trim: true, maxlength: 200 },
    sku: { type: String, trim: true, maxlength: 60, index: true },
    model: { type: String, trim: true, maxlength: 100 },
    models: [{ type: String, trim: true }],
    sizes: [{ type: String, trim: true }],
    colors: { type: [colorVariantSchema], default: [] },
    colorVariants: { type: [colorVariantSchema], default: [] },
    category: { type: String, required: true, trim: true, index: true },
    categoryBn: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    promotionalPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    discountBadge: { type: String, trim: true, maxlength: 40 },
    image: { type: String, required: true },
    images: [{ type: String }],
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    description: { type: String, trim: true, maxlength: 2000 },
    detailedDescription: { type: String, trim: true, maxlength: 5000 },
    features: [{ type: String, trim: true }],
    specifications: { type: Schema.Types.Mixed },
    deliveryTime: { type: String, trim: true, maxlength: 100 },
    materialOrOrigin: { type: String, trim: true, maxlength: 200 },
    isPopular: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    hasColors: { type: Boolean, default: true },
    hasSizes: { type: Boolean, default: true },
    pdpSectionVisibility: {
      description: { type: Boolean, default: true },
      specifications: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      relatedProducts: { type: Boolean, default: true },
      recentlyViewed: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });

productSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Product = model<IProduct>("Product", productSchema);
