import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productName: {type: String, required: true},
    productDescription: {type: String, required: true},
    costPrice: {type: Number, default: 0},
    sellingPrice: {type: Number, default: 0},
    stock: {type: Number, default: 0},
    locationId: {type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true},
    categoryId: {type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true},
    itemCode: {type: String},
},
{timestamps: true}
);

productSchema.index({itemCode: 1, locationId: 1}, {unique: true});

const ProductModel = mongoose.model("Product", productSchema);

export default ProductModel;