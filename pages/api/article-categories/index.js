/**
 * Article Categories API
 * 
 * Endpoints:
 * - GET    /api/article-categories - List all categories (public for active, admin for all)
 * - POST   /api/article-categories - Create new category (admin only)
 * - PUT    /api/article-categories - Update category (admin only)
 * - DELETE /api/article-categories?id=xxx - Delete category (admin only)
 * 
 * Features:
 * - Vietnamese slug generation
 * - System category protection (cannot delete "Chưa phân loại")
 * - Transaction-based deletion with article reassignment
 * - Article count statistics
 */

import { verifyToken } from '../../../lib/jwt';
import connectDB from '../../../lib/mongodb';
import { ArticleCategory } from '../../../lib/models/ArticleCategory';
import { Lesson } from '../../../lib/models/Lesson';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();
  
  // Ensure default category exists on every request
  await ensureDefaultCategory();

  // GET - List categories (public for active, admin for all)
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  // All other methods require admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không được phép truy cập' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện thao tác này' });
  }

  // Route to appropriate handler
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  if (req.method === 'PUT') {
    return handlePut(req, res);
  }
  
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return res.status(405).json({ error: 'Phương thức không được phép' });
}

// ===================================================================
// GET Handler - List Categories
// ===================================================================

/**
 * GET /api/article-categories
 * 
 * Query params:
 * - activeOnly: boolean - Filter to only active categories
 * 
 * Returns: { categories: Category[], stats: { [slug]: count } }
 */
async function handleGet(req, res) {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const filter = activeOnly ? { isActive: true } : {};
    
    // Fetch categories sorted by order and name
    const categories = await ArticleCategory.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get article counts for each category
    const stats = {};
    for (const category of categories) {
      const count = await Lesson.countDocuments({ category: category._id });
      stats[category.slug] = count;
      // Also add count to category object
      category.articleCount = count;
    }
    
    // T073: Add caching headers (5 min TTL, stale-while-revalidate)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json({ categories, stats });
  } catch (error) {
    console.error('GET /api/article-categories error:', error);
    return res.status(500).json({ error: 'Lỗi khi tải danh sách danh mục' });
  }
}

// ===================================================================
// POST Handler - Create Category
// ===================================================================

/**
 * POST /api/article-categories
 * 
 * Body: { name, slug?, description?, isActive?, order? }
 * 
 * Returns: { message, category }
 */
async function handlePost(req, res) {
  try {
    const { name, slug, description, isActive, order } = req.body;
    
    // Validation: name is required
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });
    }
    
    // Check for duplicate name (case-insensitive)
    const existingByName = await ArticleCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (existingByName) {
      return res.status(400).json({ error: 'Danh mục với tên này đã tồn tại' });
    }
    
    // Create category (slug auto-generated if not provided)
    const categoryData = {
      name: name.trim(),
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      isSystem: false, // Never allow creating system categories via API
      order: order || 0
    };
    
    // Only set slug if provided, otherwise let pre-save hook generate it
    if (slug) {
      categoryData.slug = slug.trim();
    }
    
    const category = await ArticleCategory.create(categoryData);
    
    return res.status(201).json({
      message: 'Danh mục đã được tạo thành công',
      category
    });
  } catch (error) {
    console.error('POST /api/article-categories error:', error);
    
    // Handle duplicate slug error
    if (error.code === 11000) {
      if (error.message.includes('slug')) {
        return res.status(400).json({ error: 'Slug này đã tồn tại. Vui lòng chọn slug khác.' });
      }
      return res.status(400).json({ error: 'Danh mục này đã tồn tại' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    return res.status(500).json({ error: 'Lỗi khi tạo danh mục' });
  }
}

// ===================================================================
// PUT Handler - Update Category
// ===================================================================

/**
 * PUT /api/article-categories
 * 
 * Body: { id, name?, slug?, description?, isActive?, order? }
 * 
 * Returns: { message, category }
 */
async function handlePut(req, res) {
  try {
    const { id, name, slug, description, isActive, order } = req.body;
    
    // Validation: id is required
    if (!id) {
      return res.status(400).json({ error: 'ID danh mục là bắt buộc' });
    }
    
    // Find category
    const category = await ArticleCategory.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    }
    
    // Update fields (only if provided)
    if (name !== undefined) {
      // Check for duplicate name (exclude current category)
      const existingByName = await ArticleCategory.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      if (existingByName) {
        return res.status(400).json({ error: 'Danh mục với tên này đã tồn tại' });
      }
      
      category.name = name.trim();
    }
    
    if (slug !== undefined) {
      category.slug = slug.trim();
    }
    
    if (description !== undefined) {
      category.description = description;
    }
    
    if (isActive !== undefined) {
      category.isActive = isActive;
    }
    
    if (order !== undefined) {
      category.order = order;
    }
    
    await category.save();
    
    return res.status(200).json({
      message: 'Danh mục đã được cập nhật',
      category
    });
  } catch (error) {
    console.error('PUT /api/article-categories error:', error);
    
    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Slug này đã tồn tại. Vui lòng chọn slug khác.' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    return res.status(500).json({ error: 'Lỗi khi cập nhật danh mục' });
  }
}

// ===================================================================
// DELETE Handler - Delete Category with Transaction
// ===================================================================

/**
 * DELETE /api/article-categories?id=xxx
 * 
 * Features:
 * - System category protection (cannot delete "Chưa phân loại")
 * - Transaction-based deletion
 * - Automatic article reassignment to default category
 * 
 * Returns: { message, reassignedCount }
 */
async function handleDelete(req, res) {
  // Check if MongoDB supports transactions
  const supportsTransactions = mongoose.connection.readyState === 1 && 
                                mongoose.connection.db.serverConfig &&
                                mongoose.connection.db.serverConfig.s &&
                                mongoose.connection.db.serverConfig.s.description &&
                                mongoose.connection.db.serverConfig.s.description.type !== 'Standalone';
  
  if (supportsTransactions) {
    return handleDeleteWithTransaction(req, res);
  } else {
    return handleDeleteFallback(req, res);
  }
}

/**
 * Delete with MongoDB transaction (preferred)
 */
async function handleDeleteWithTransaction(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.query;
    
    if (!id) {
      throw new Error('ID danh mục là bắt buộc');
    }
    
    // Find category
    const category = await ArticleCategory.findById(id).session(session);
    
    if (!category) {
      throw new Error('Không tìm thấy danh mục');
    }
    
    // Protection: cannot delete system category
    if (category.isSystem) {
      throw new Error('Không thể xóa danh mục hệ thống "Chưa phân loại"');
    }
    
    // Get default category
    const defaultCategory = await ArticleCategory.findOne({
      isSystem: true
    }).session(session);
    
    if (!defaultCategory) {
      throw new Error('Không tìm thấy danh mục mặc định. Hệ thống lỗi.');
    }
    
    // Reassign all lessons from this category to default
    const reassignResult = await Lesson.updateMany(
      { category: id },
      { $set: { category: defaultCategory._id } },
      { session }
    );
    
    // Delete the category
    await ArticleCategory.findByIdAndDelete(id).session(session);
    
    // Commit transaction
    await session.commitTransaction();
    
    return res.status(200).json({
      message: `Danh mục đã được xóa. ${reassignResult.modifiedCount} bài viết đã được chuyển sang "Chưa phân loại"`,
      reassignedCount: reassignResult.modifiedCount
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('DELETE /api/article-categories error:', error);
    
    // Handle specific errors
    if (error.message.includes('hệ thống')) {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message.includes('Không tìm thấy')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || 'Lỗi khi xóa danh mục' });
  } finally {
    session.endSession();
  }
}

/**
 * Delete without transaction (fallback for standalone MongoDB)
 */
async function handleDeleteFallback(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'ID danh mục là bắt buộc' });
    }
    
    // Find category
    const category = await ArticleCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    }
    
    // Protection: cannot delete system category
    if (category.isSystem) {
      return res.status(403).json({ error: 'Không thể xóa danh mục hệ thống "Chưa phân loại"' });
    }
    
    // Get default category
    const defaultCategory = await ArticleCategory.findOne({ isSystem: true });
    
    if (!defaultCategory) {
      return res.status(500).json({ error: 'Không tìm thấy danh mục mặc định. Hệ thống lỗi.' });
    }
    
    // Step 1: Reassign articles first
    const reassignResult = await Lesson.updateMany(
      { category: id },
      { $set: { category: defaultCategory._id } }
    );
    
    // Step 2: Then delete category
    await ArticleCategory.findByIdAndDelete(id);
    
    return res.status(200).json({
      message: `Danh mục đã được xóa. ${reassignResult.modifiedCount} bài viết đã được chuyển sang "Chưa phân loại"`,
      reassignedCount: reassignResult.modifiedCount
    });
    
  } catch (error) {
    console.error('DELETE /api/article-categories error (fallback):', error);
    return res.status(500).json({ error: 'Lỗi khi xóa danh mục' });
  }
}

// ===================================================================
// Helper Functions
// ===================================================================

/**
 * Ensure default "Chưa phân loại" category exists
 * Creates it if missing (idempotent operation)
 */
async function ensureDefaultCategory() {
  try {
    const defaultExists = await ArticleCategory.findOne({
      isSystem: true,
      slug: 'chua-phan-loai'
    });
    
    if (!defaultExists) {
      await ArticleCategory.create({
        name: 'Chưa phân loại',
        slug: 'chua-phan-loai',
        description: 'Danh mục mặc định cho bài viết chưa được phân loại',
        isSystem: true,
        isActive: true,
        order: 0
      });
      console.log('✅ Created default category "Chưa phân loại"');
    }
  } catch (error) {
    // Silent fail - don't break requests if default category creation fails
    console.error('Warning: Could not ensure default category exists:', error.message);
  }
}
