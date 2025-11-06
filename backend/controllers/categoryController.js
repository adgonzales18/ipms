import CategoryModel from '../models/Category.js';

const createCategory = async (req, res) => {
    try {
        const {categoryName, categoryDescription} = req.body;
        if (!categoryName) return res.status(400).json({success: false, message: "Category name is required"});

        const newCategory = new CategoryModel({categoryName, categoryDescription});
        await newCategory.save();
        res.status(201).json({success: true, data: newCategory});
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({success: false, message: "Failed to create category"});;
    }
}

const getCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.find();
        res.status(200).json({success: true, data: categories});
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({success: false, message: "Failed to fetch categories"});;
    }
}

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const {categoryName, categoryDescription} = req.body;

        const updated = await CategoryModel.findByIdAndUpdate(
            id,
            {categoryName, categoryDescription}, 
            {new: true},
        );

        if (!updated )
            return res.status(404).json({success: false, message: "Category not found"});

        res.status(200).json({success: true, data: updated});
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({success: false, message: "Failed to update category"});;
    }
}

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CategoryModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.status(200).json({ success: true, message: "Category deleted successfully" }); 
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({success: false, message: "Failed to delete category"});;
    }
 }

 export {createCategory, getCategories, updateCategory, deleteCategory};