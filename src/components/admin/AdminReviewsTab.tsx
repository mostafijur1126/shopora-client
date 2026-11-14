import React, { useState } from 'react';
import { ReviewScreenshot, Product } from '../../types';
import {
  MessageSquareQuote,
  Star,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Eye,
  Check
} from 'lucide-react';

interface AdminReviewsTabProps {
  reviews?: ReviewScreenshot[];
  products?: Product[];
  onAddReview: (review: ReviewScreenshot) => void;
  onUpdateReview: (review: ReviewScreenshot) => void;
  onDeleteReview: (reviewId: string) => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  reviews = [],
  products = [],
  onAddReview,
  onUpdateReview,
  onDeleteReview
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewScreenshot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [image, setImage] = useState('');
  const [date, setDate] = useState('আজ');
  const [verified, setVerified] = useState(true);
  const [previewReview, setPreviewReview] = useState<ReviewScreenshot | null>(null);

  const handleOpenAdd = () => {
    setEditingReview(null);
    setCustomerName('');
    setCustomerLocation('Dhanmondi, Dhaka');
    setProductName(products[0]?.name || 'Exclusive Jamdani Saree');
    setRating(5);
    setComment('Excellent quality product, fast delivery and authentic materials. Highly recommended!');
    setImage('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80');
    setDate('Today');
    setVerified(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (review: ReviewScreenshot) => {
    setEditingReview(review);
    setCustomerName(review.customerName);
    setCustomerLocation(review.customerLocation || '');
    setProductName(review.productName || '');
    setRating(review.rating);
    setComment(review.comment || '');
    setImage(review.image);
    setDate(review.date || 'Today');
    setVerified(review.verified ?? true);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !image.trim()) return;

    if (editingReview) {
      onUpdateReview({
        ...editingReview,
        customerName: customerName.trim(),
        customerLocation: customerLocation.trim() || undefined,
        productName: productName.trim() || undefined,
        rating,
        comment: comment.trim() || undefined,
        image: image.trim(),
        date: date.trim() || 'Today',
        verified
      });
    } else {
      onAddReview({
        id: `rev-custom-${Date.now()}`,
        customerName: customerName.trim(),
        customerLocation: customerLocation.trim() || undefined,
        productName: productName.trim() || undefined,
        rating,
        comment: comment.trim() || undefined,
        image: image.trim(),
        date: date.trim() || 'Today',
        verified
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191c1d] font-montserrat">
              Customer Reviews & Proof
            </h2>
            <span className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#00503a]/20">
              {reviews.length} Reviews
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage authentic social proof, customer review screenshots, and rating testimonials
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
        >
          <PlusCircle className="w-4 h-4 text-[#9ef4d0]" />
          <span>Add New Review</span>
        </button>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00503a] text-white font-bold text-xs flex items-center justify-center font-montserrat">
                    {rev.customerName.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">{rev.customerName}</p>
                    <p className="text-[10px] text-gray-400">{rev.customerLocation || 'Bangladesh'}</p>
                  </div>
                </div>

                <div className="flex items-center text-amber-500 gap-0.5">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {rev.productName && (
                <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded mb-2">
                  Product: {rev.productName}
                </span>
              )}

              {rev.comment && (
                <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
                  "{rev.comment}"
                </p>
              )}

              {/* Screenshot thumbnail */}
              <div
                onClick={() => setPreviewReview(rev)}
                className="relative rounded-xl overflow-hidden border border-gray-200 aspect-16/10 cursor-pointer group bg-gray-100"
              >
                <img
                  src={rev.image}
                  alt={rev.customerName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                  <Eye className="w-4 h-4" />
                  <span>View Screenshot</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span className="text-[11px] text-gray-400">{rev.date || 'Recent'}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(rev)}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#00503a] hover:text-white text-gray-600 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove review from "${rev.customerName}"?`)) {
                      onDeleteReview(rev.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#00503a] text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-montserrat">
                {editingReview ? 'Edit Review' : 'Add New Customer Review'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={customerLocation}
                    onChange={(e) => setCustomerLocation(e.target.value)}
                    placeholder="Dhanmondi, Dhaka"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rating (1-5)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none font-bold"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Jamdani Saree"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Screenshot / Image URL *</label>
                <input
                  type="url"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/screenshot.jpg"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Comment / Review Text</label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Review comment or chat quote..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white font-bold cursor-pointer shadow-xs"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewReview && (
        <div
          onClick={() => setPreviewReview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-gray-900">{previewReview.customerName} - Review</span>
              <button
                onClick={() => setPreviewReview(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={previewReview.image}
              alt={previewReview.customerName}
              className="w-full rounded-2xl max-h-[70vh] object-contain bg-black"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}
    </div>
  );
};
