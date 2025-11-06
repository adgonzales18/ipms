import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    categoryName: {type: String, required: true},
    categoryDescription: {type: String},
})

const CategoryModel = mongoose.model('Category', categorySchema);

export default CategoryModel;