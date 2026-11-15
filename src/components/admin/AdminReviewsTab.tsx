import React, { useState } from "react";
import { ReviewScreenshot, Product } from "../../types";
import {
  Star,
  PlusCircle,
  Edit2,
  Trash2,
  Image as ImageIcon,
  X,
  Eye,
  Loader2,
} from "lucide-react";
import { compressImage } from "../../utils/Image";
import { uploadImageApi } from "../../utils/uploadImage";

interface AdminReviewsTabProps {
  reviews?: ReviewScreenshot[];
  products?: Product[];
  onAddReview: (review: ReviewScreenshot) => Promise<unknown>;
  onUpdateReview: (review: ReviewScreenshot) => Promise<unknown>;
  onDeleteReview: (reviewId: string) => Promise<unknown>;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  reviews = [],
  products = [],
  onAddReview,
  onUpdateReview,
  onDeleteReview,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewScreenshot | null>(
    null,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [previewReview, setPreviewReview] =
    useState<ReviewScreenshot | null>(null);

  const resetForm = () => {
    setEditingReview(null);
    setCustomerName("");
    setCustomerLocation("");
    setProductId("");
    setProductSearch("");
    setRating(5);
    setComment("");
    setImage("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (review: ReviewScreenshot) => {
    setEditingReview(review);
    setCustomerName(review.customerName);
    setCustomerLocation(review.customerLocation || "");
    setProductId(review.productId || "");
    setProductSearch(
      products.find((product) => product.id === review.productId)?.name ||
        review.productName ||
        "",
    );
    setRating(review.rating);
    setComment(review.comment || "");
    setImage(review.image || "");
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setFormError("");
    try {
      const processed = await compressImage(file);
      const uploadedUrl = await uploadImageApi(processed.blob, processed.name);
      setImage(uploadedUrl || processed.dataUrl);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not upload this image.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    const selectedProduct = products.find((product) => product.id === productId);
    if (!customerName.trim()) {
      setFormError("Enter the customer's name.");
      return;
    }
    if (!selectedProduct) {
      setFormError("Search for and select a product.");
      return;
    }
    if (!comment.trim()) {
      setFormError("Enter the review text.");
      return;
    }

    const review: ReviewScreenshot = {
      id: editingReview?.id || "",
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      customerName: customerName.trim(),
      customerLocation: customerLocation.trim() || undefined,
      rating,
      comment: comment.trim(),
      image: image || undefined,
      imageAlt: image ? `${customerName.trim()}'s review` : undefined,
      verified: true,
    };

    setIsSaving(true);
    try {
      if (editingReview) await onUpdateReview({ ...editingReview, ...review });
      else await onAddReview(review);
      resetForm();
      setFormSuccess("Review saved successfully.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save this review.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (review: ReviewScreenshot) => {
    if (!confirm(`Are you sure you want to remove review from "${review.customerName}"?`)) {
      return;
    }
    setDeletingId(review.id);
    try {
      await onDeleteReview(review.id);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not delete this review.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const matchingProducts = productSearch.trim()
    ? products
        .filter((product) =>
          product.name.toLowerCase().includes(productSearch.trim().toLowerCase()),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191c1d] font-montserrat">
              Customer Reviews
            </h2>
            <span className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#00503a]/20">
              {reviews.length} Reviews
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage product reviews and customer feedback
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

      {formError && !isModalOpen && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {formError}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center text-sm text-gray-500">
          No reviews have been added yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#00503a] text-white font-bold text-xs flex items-center justify-center">
                      {review.customerName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">
                        {review.customerName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {review.customerLocation || "Customer"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-amber-500 gap-0.5">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star
                        key={index}
                        className="w-3 h-3 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
                {review.productName && (
                  <span className="inline-block bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded mb-2">
                    Product: {review.productName}
                  </span>
                )}
                {review.comment && (
                  <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
                    "{review.comment}"
                  </p>
                )}
                {review.image && (
                  <div
                    onClick={() => setPreviewReview(review)}
                    className="relative rounded-xl overflow-hidden border border-gray-200 aspect-16/10 cursor-pointer group bg-gray-100"
                  >
                    <img
                      src={review.image}
                      alt={review.imageAlt || review.customerName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" />
                      <span>View Image</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-[11px] text-gray-400">
                  {review.date || "Recent"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(review)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#00503a] hover:text-white text-gray-600 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(review)}
                    disabled={deletingId === review.id}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#00503a] text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-montserrat">
                {editingReview ? "Edit Review" : "Add New Customer Review"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={customerLocation}
                    onChange={(event) =>
                      setCustomerLocation(event.target.value)
                    }
                    placeholder="Dhanmondi, Dhaka"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Rating (1-5)
                  </label>
                  <select
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} Star{value > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block font-bold text-gray-700 mb-1">
                  Search and select product *
                </label>
                <input
                  type="search"
                  required={!productId}
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setProductId("");
                  }}
                  placeholder="Type a product name..."
                  autoComplete="off"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
                {matchingProducts.length > 0 && !productId && (
                  <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {matchingProducts.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setProductId(product.id);
                            setProductSearch(product.name);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 text-gray-800"
                        >
                          {product.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {productId && (
                  <p className="mt-1 text-[11px] text-[#00503a] font-semibold">
                    Product selected
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Review Image (optional)
                </label>
                <label className="w-full min-h-10 px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl flex items-center gap-2 cursor-pointer hover:border-[#00503a]">
                  <ImageIcon className="w-4 h-4 text-[#00503a]" />
                  <span className="truncate">
                    {isUploading
                      ? "Processing image..."
                      : image
                        ? "Choose a different image"
                        : "Upload an image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                    disabled={isUploading || isSaving}
                  />
                </label>
                {image && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={image}
                      alt="Review upload preview"
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Customer Review *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={1000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Write the customer's review..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p role="status" className="text-xs font-semibold text-[#00503a]">
                  {formSuccess}
                </p>
              )}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white font-bold cursor-pointer shadow-xs disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {(isSaving || isUploading) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isSaving ? "Saving..." : "Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewReview?.image && (
        <div
          onClick={() => setPreviewReview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-gray-900">
                {previewReview.customerName} - Review
              </span>
              <button
                onClick={() => setPreviewReview(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer"
                aria-label="Close image preview"
              >
                ✕
              </button>
            </div>
            <img
              src={previewReview.image}
              alt={previewReview.imageAlt || previewReview.customerName}
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
