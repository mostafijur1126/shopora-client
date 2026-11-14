import React, { useState } from 'react';
import { CategoryItem, Product } from '../types';
import { renderCategoryIcon } from './TopNavBar';
import {
  Edit2,
  Trash2,
  X,
  Tag,
  Sparkles,
  Layers,
  FolderPlus,
  AlertCircle
} from 'lucide-react';

interface AdminCategoriesTabProps {
  categories?: CategoryItem[];
  products?: Product[];
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (category: CategoryItem) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Shirt', label: 'Fashion / Clothing' },
  { name: 'Sparkles', label: 'Crafts / Nakshi' },
  { name: 'Home', label: 'Home Decor & Ceramic' },
  { name: 'Tv', label: 'Electronics & Gadgets' },
  { name: 'Apple', label: 'Food & Organic' },
  { name: 'Briefcase', label: 'Leather & Bags' },
  { name: 'Gem', label: 'Jewelry & Ornaments' },
  { name: 'Watch', label: 'Watches & Accessories' },
  { name: 'Utensils', label: 'Kitchen & Dining' },
  { name: 'Package', label: 'Gifts & Bundles' },
  { name: 'Layers', label: 'Other Categories' },
];

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories = [],
  products = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form states
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [formError, setFormError] = useState('');

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setNameBn('');
    setNameEn('');
    setSlug('');
    setDescription('');
    setSelectedIcon('Sparkles');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setNameBn(cat.name);
    setNameEn(cat.nameEn || '');
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setSelectedIcon(cat.iconName || 'Tag');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim()) {
      setFormError('Please provide a category name.');
      return;
    }

    const cleanSlug = (slug.trim() || nameEn.trim() || nameBn.trim()).toLowerCase().replace(/\s+/g, '-');

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: nameBn.trim(),
        nameEn: nameEn.trim() || nameBn.trim(),
        slug: cleanSlug,
        description: description.trim(),
        iconName: selectedIcon,
      });
    } else {
      const newCategory: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: nameBn.trim(),
        nameEn: nameEn.trim() || nameBn.trim(),
        slug: cleanSlug,
        description: description.trim(),
        iconName: selectedIcon,
      };
      onAddCategory(newCategory);
    }

    setIsModalOpen(false);
  };

  const getProductCountForCat = (cat: CategoryItem) => {
    return products.filter(
      (p) =>
        p.category === cat.slug ||
        p.categoryBn === cat.slug ||
        p.categoryBn === cat.name ||
        p.category === cat.nameEn
    ).length;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#bec9c2]/50 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e7f6f0] text-[#00503a] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#191c1d]">
              Category Management ({categories.length} Categories)
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Create, edit, and organize product categories displayed across your store
          </p>
        </div>

        <button
          id="admin-add-category-btn"
          onClick={handleOpenAddModal}
          className="bg-[#00503a] hover:bg-[#003828] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
        >
          <FolderPlus className="w-4 h-4 text-[#9ef4d0]" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const productCount = getProductCountForCat(cat);

          return (
            <div
              key={cat.id}
              id={`category-card-${cat.id}`}
              className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-[#00503a]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#e7f6f0] text-[#00503a] flex items-center justify-center shrink-0 border border-emerald-100">
                      {renderCategoryIcon(cat.iconName, 'w-5 h-5')}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 leading-snug">
                        {cat.nameEn || cat.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-montserrat">
                        {cat.name !== cat.nameEn ? cat.name : cat.slug}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] bg-emerald-50 text-[#00503a] font-bold px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                    {productCount} Products
                  </span>
                </div>

                {cat.description && (
                  <p className="text-xs text-gray-600 mt-3 line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">
                  Slug: {cat.slug}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`edit-cat-${cat.id}`}
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 text-gray-600 hover:text-[#00503a] hover:bg-[#e7f6f0] rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`delete-cat-${cat.id}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete category "${cat.nameEn || cat.name}"?`
                        )
                      ) {
                        onDeleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div
          id="category-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#191c1d]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e7f6f0] text-[#00503a] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Category Name (Primary) <span className="text-red-500">*</span>
                </label>
                <input
                  id="cat-form-name-bn"
                  type="text"
                  required
                  placeholder="e.g. Jewelry & Ornaments / জুয়েলারি"
                  value={nameBn}
                  onChange={(e) => {
                    setNameBn(e.target.value);
                    if (!editingCategory && !slug) {
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#00503a] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Category Name (English Sub-label)
                </label>
                <input
                  id="cat-form-name-en"
                  type="text"
                  placeholder="e.g. Jewelry & Ornaments"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#00503a] bg-white font-montserrat"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Category Slug / Identifier
                </label>
                <input
                  id="cat-form-slug"
                  type="text"
                  placeholder="e.g. jewelry-ornaments"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#00503a] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Select Category Icon
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-200">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        selectedIcon === icon.name
                          ? 'bg-[#00503a] text-white shadow-2xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-[#00503a] border border-gray-200'
                      }`}
                    >
                      {renderCategoryIcon(icon.name, 'w-4 h-4')}
                      <span className="text-[10px] truncate max-w-full text-center">
                        {icon.label.split('/')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="cat-form-desc"
                  rows={2}
                  placeholder="Brief description of the category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#00503a] bg-white resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
