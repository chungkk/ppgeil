import mongoose from 'mongoose';

/**
 * ArticleCategory Model
 * 
 * Represents a classification category for articles/lessons with metadata
 * for display, filtering, and management. Supports Vietnamese language
 * with automatic URL-friendly slug generation.
 * 
 * Key Features:
 * - Vietnamese to ASCII slug conversion
 * - System category protection (cannot delete default "Chưa phân loại")
 * - Active/inactive status
 * - Article count tracking
 * - Timestamps for audit trail
 */

const ArticleCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên danh mục là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [1, 'Tên danh mục phải có ít nhất 1 ký tự'],
    maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự'],
    validate: {
      validator: function(v) {
        return /\S/.test(v); // At least one non-whitespace character
      },
      message: 'Tên danh mục không được chỉ chứa khoảng trắng'
    }
  },
  
  slug: {
    type: String,
    required: false,  // Auto-generated from name in pre-save hook
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty during creation (will be auto-generated)
        if (!v) return true;
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
      },
      message: 'Slug phải chỉ chứa chữ thường, số và dấu gạch ngang'
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
    default: ''
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true  // Frequently queried for user-facing lists
  },
  
  isSystem: {
    type: Boolean,
    default: false,
    immutable: true  // Cannot be changed after creation
  },
  
  articleCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  order: {
    type: Number,
    default: 0,
    index: true  // For sorting category lists
  }
  
}, {
  timestamps: true,  // Adds createdAt and updatedAt
  collection: 'articlecategories'
});

// Indexes for performance
ArticleCategorySchema.index({ name: 1 });
ArticleCategorySchema.index({ slug: 1 });
ArticleCategorySchema.index({ isActive: 1, order: 1 });

// ===================================================================
// Static Methods
// ===================================================================

/**
 * Get the default system category (Chưa phân loại)
 * @returns {Promise<ArticleCategory>} Default category
 */
ArticleCategorySchema.statics.getDefaultCategory = async function() {
  return await this.findOne({ isSystem: true });
};

/**
 * Get all active categories sorted by order and name
 * @returns {Promise<ArticleCategory[]>} Active categories
 */
ArticleCategorySchema.statics.getActiveCategories = async function() {
  return await this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

/**
 * Get category with current article count
 * @param {string} categoryId - Category ObjectId
 * @returns {Promise<Object>} Category with article count
 */
ArticleCategorySchema.statics.getCategoryWithCount = async function(categoryId) {
  const category = await this.findById(categoryId);
  if (!category) return null;
  
  const Lesson = mongoose.model('Lesson');
  const count = await Lesson.countDocuments({ category: categoryId });
  
  return { ...category.toObject(), articleCount: count };
};

// ===================================================================
// Instance Methods
// ===================================================================

/**
 * Check if this category can be deleted
 * @returns {boolean} True if can be deleted
 */
ArticleCategorySchema.methods.canDelete = function() {
  return !this.isSystem;
};

// ===================================================================
// Middleware Hooks
// ===================================================================

/**
 * Pre-save hook: Generate slug if not provided
 * If slug conflicts, append number (e.g., ngu-phap-2)
 */
ArticleCategorySchema.pre('save', async function(next) {
  // Only generate slug if not provided
  if (!this.slug && this.name) {
    let baseSlug = generateSlug(this.name);
    let slug = baseSlug;
    let counter = 1;
    
    // Check for duplicates and append number if needed
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    
    this.slug = slug;
  }
  next();
});

// ===================================================================
// Helper Functions
// ===================================================================

/**
 * Generate URL-friendly slug from Vietnamese text
 * Converts Vietnamese diacritics to ASCII equivalents
 * 
 * Examples:
 * - "Ngữ pháp Đức" → "ngu-phap-duc"
 * - "Từ vựng A1" → "tu-vung-a1"
 * - "Chưa phân loại" → "chua-phan-loai"
 * 
 * @param {string} str - Input string with Vietnamese characters
 * @returns {string} URL-friendly slug
 */
function generateSlug(str) {
  // Vietnamese character mapping to ASCII
  const vietnameseMap = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
    'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'a',
    'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'e',
    'Ì|Í|Ị|Ỉ|Ĩ': 'i',
    'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'o',
    'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'u',
    'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'y',
    'Đ': 'd'
  };
  
  let slug = str;
  
  // Convert Vietnamese characters to ASCII
  for (const [pattern, replacement] of Object.entries(vietnameseMap)) {
    slug = slug.replace(new RegExp(pattern, 'g'), replacement);
  }
  
  // Convert to lowercase and clean up
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')      // Remove special characters
    .replace(/[\s_-]+/g, '-')      // Replace spaces/underscores with hyphen
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}

// Export the model
export const ArticleCategory = mongoose.models.ArticleCategory || 
  mongoose.model('ArticleCategory', ArticleCategorySchema);
