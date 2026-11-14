import { GoogleGenAI } from '@google/genai';

/**
 * Generates a short Bengali sales-insight summary using Gemini, based on
 * aggregated (non-sensitive) sales numbers. No customer PII is sent.
 */
export async function generateSalesInsight(summary: {
  totalSalesThisMonth: number;
  totalOrdersThisMonth: number;
  topProducts: { name: string; qty: number }[];
  lowStockProducts: { name: string; stockQty: number }[];
}): Promise<string> {
  const apiKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) || '';
  if (!apiKey) {
    return 'AI ইনসাইট দেখতে হলে প্রজেক্টে GEMINI_API_KEY সেট করুন (.env ফাইলে)।';
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `তুমি একজন বাংলাদেশি ই-কমার্স দোকানের জন্য বিজনেস অ্যানালিস্ট। নিচের ডেটা থেকে ৩-৪ লাইনের একটা সংক্ষিপ্ত, বাস্তবসম্মত ও কার্যকর ইনসাইট বাংলায় লিখে দাও (সরাসরি পরামর্শসহ, কোনো ভূমিকা বা ফরম্যাটিং ছাড়া প্লেইন টেক্সটে):

এই মাসের মোট বিক্রি: ৳${summary.totalSalesThisMonth}
এই মাসের অর্ডার সংখ্যা: ${summary.totalOrdersThisMonth}
সবচেয়ে বেশি বিক্রি হওয়া প্রোডাক্ট: ${summary.topProducts.map((p) => `${p.name} (${p.qty}টি)`).join(', ') || 'তথ্য নেই'}
লো-স্টক ঝুঁকিতে থাকা প্রোডাক্ট: ${summary.lowStockProducts.map((p) => `${p.name} (${p.stockQty}টি বাকি)`).join(', ') || 'কোনোটি নেই'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || 'ইনসাইট তৈরি করা যায়নি, আবার চেষ্টা করুন।';
  } catch (error) {
    console.error('Gemini sales insight generation failed:', error);
    return 'AI ইনসাইট তৈরি করতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
  }
}
