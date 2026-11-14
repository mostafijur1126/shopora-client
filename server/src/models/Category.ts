import { Schema, model, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  titleEn?: string;
  titleBn?: string;
  description?: string;
  image?: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    titleEn: { type: String, trim: true, maxlength: 100 },
    titleBn: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = model<ICategory>('Category', categorySchema);
