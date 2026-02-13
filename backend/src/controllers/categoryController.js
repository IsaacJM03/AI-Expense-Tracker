const Category = require('../models/Category');

async function getCategories(req, res, next) {
  try {
    const categories = await Category.getHierarchical(req.user.id);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, icon, color, parentId } = req.body;
    const category = await Category.create({
      userId: req.user.id,
      name,
      icon,
      color,
      parentId,
    });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.update(req.params.id, req.user.id, req.body);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const deleted = await Category.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found or is a system category' });
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
