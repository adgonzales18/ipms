import ProductModel from "../models/Product.js";
import CategoryModel from "../models/Category.js";
import LocationModel from "../models/Location.js";
import csv from "csvtojson";
import { Parser } from "json2csv";
import fs from "fs";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

const createProduct = async (req, res) => {
    try {
         const {
        productName,
        productDescription,
        costPrice,
        sellingPrice,
        stock,
        locationId,
        categoryId,
        itemCode,
    } = req.body;

    //validatee category and location
    const category = await CategoryModel.findById(categoryId);
    if (!category) {
        return res.status(400).json({success: false, message: "Category not found"});
    }
    const location = await LocationModel.findById(locationId);
    if (!location) {
        return res.status(400).json({success: false, message: "Location not found"});
    }

    if (location.locationName === "HQ") {
        return res.status(400).json({success: false, message: "Cannot add product to HQ"});
    }

    const existing  = await ProductModel.findOne({itemCode, locationId});
    if (existing) {
        return res.status(400).json({success: false, message: "Product already exists in this location"});
    }
    

    const newProduct = new ProductModel({
        productName,
        productDescription,
        costPrice,
        sellingPrice,
        stock,
        locationId,
        categoryId,
        itemCode,
    });

    await newProduct.save();
    res.status(201).json({success: true, data: newProduct});
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({success: false, message: "Failed to create product"});;
    }
}

const getProducts = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== "admin") {
            query.locationId = req.user.locationId;
        }
        const products = await ProductModel.find(query)
        .populate("categoryId", "categoryName")
        .populate("locationId", "locationName");
        res.status(200).json({success: true, data: products});
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({success: false, message: "Failed to fetch products"});;
    }
}
const updateProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const {
        productName,
        productDescription,
        sellingPrice,
        costPrice,
        unitMeasure,
        stock,
        categoryId,
        locationId,
        itemCode,
      } = req.body;
  
      const category = await CategoryModel.findById(categoryId);
      if (!category)
        return res.status(400).json({ success: false, message: "Category not found" });
  
      const location = await LocationModel.findById(locationId);
      if (!location)
        return res.status(400).json({ success: false, message: "Location not found" });
  
      if (location.locationName === "HQ") {
        return res.status(400).json({ success: false, message: "Cannot assign products to HQ" });
      }
  
      // Prevent duplicate itemCode in the same location (excluding itself)
      const duplicate = await ProductModel.findOne({
        _id: { $ne: id },
        itemCode,
        locationId,
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ success: false, message: "Another product with this item code exists in this location" });
      }
  
      const updated = await ProductModel.findByIdAndUpdate(
        id,
        {
          productName,
          productDescription,
          sellingPrice,
          costPrice,
          unitMeasure,
          stock,
          categoryId,
          locationId,
          itemCode,
        },
        { new: true }
      )
        .populate("categoryId", "categoryName")
        .populate("locationId", "locationName");
  
      if (!updated)
        return res.status(404).json({ success: false, message: "Product not found" });
  
      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating product", error);
      return res.status(500).json({ success: false, message: "Error updating product" });
    }
  };

  
const deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await ProductModel.findByIdAndDelete(id);
  
      if (!deleted)
        return res.status(404).json({ success: false, message: "Product not found" });
  
      return res.status(200).json({ success: true, message: "Product deleted" });
    } catch (error) {
      console.error("Error deleting product", error);
      return res.status(500).json({ success: false, message: "Error deleting product" });
    }
  };
  
  const exportProducts = async (req, res) => {
    try {
      const hq = await LocationModel.findOne({ locationName: "HQ" });
      const filter = hq ? { locationId: { $ne: hq._id } } : {};
  
      const products = await ProductModel.find(filter)
        .populate("categoryId", "categoryName")
        .populate("locationId", "locationName")
        .lean();
  
      if (!products.length) {
        return res.status(404).json({ success: false, message: "No products found" });
      }
  
      const formatted = products.map((p) => ({
        itemCode: p.itemCode,
        productName: p.productName,
        productDescription: p.productDescription,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        unitMeasure: p.unitMeasure,
        stock: p.stock,
        categoryName: p.categoryId?.categoryName || "Uncategorized",
        locationName: p.locationId?.locationName || "Unassigned",
      }));
  
      const fields = [
        "itemCode",
        "productName",
        "productDescription",
        "costPrice",
        "sellingPrice",
        "unitMeasure",
        "stock",
        "categoryName",
        "locationName",
      ];
  
      const parser = new Parser({ fields });
      const csv = parser.parse(formatted);
  
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=products.csv");
  
      return res.status(200).send(csv);
    } catch (err) {
      console.error("Export error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error exporting products" });
    }
  };
  
  const getProductByCode = async (req, res) => {
    try {
      const { itemCode } = req.params;
      const { locationId } = req.query;
  
      let query = { itemCode };
      if (locationId) {
        query.locationId = locationId;
      }
  
      const product = await ProductModel.findOne(query)
        .populate("categoryId", "categoryName")
        .populate("locationId", "locationName");
  
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found for this location",
        });
      }
  
      return res.status(200).json({ success: true, data: product });
    } catch (error) {
      console.error("Error fetching product by itemCode:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  // PATCH /api/products/itemcode/:oldItemCode
  const updateItemCodeAll = async (req, res) => {
    try {
      const { oldItemCode } = req.params;
      const { newItemCode } = req.body;
  
      if (!newItemCode || !newItemCode.trim()) {
        return res.status(400).json({ success: false, message: "New item code is required" });
      }
  
      // Check if new code already exists (in any location)
      const existing = await ProductModel.findOne({ itemCode: newItemCode });
      if (existing) {
        return res.status(400).json({ success: false, message: "Item code already exists in system" });
      }
  
      // Update all products with old code
      const result = await ProductModel.updateMany(
        { itemCode: oldItemCode },
        { $set: { itemCode: newItemCode } }
      );
  
      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: "No products found with that item code" });
      }
  
      return res.json({
        success: true,
        message: `Updated ${result.modifiedCount} products with new item code ${newItemCode}`,
      });
    } catch (error) {
      console.error("Error updating item code:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  const importProducts = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
  
      const jsonArray = await csv().fromFile(req.file.path);
      fs.unlinkSync(req.file.path);
  
      let updatedCount = 0;
      let insertedCount = 0;
  
      for (const row of jsonArray) {
        if (!row.itemCode?.trim() || !row.productName?.trim()) continue;
  
        const categoryName = row.categoryName?.trim() || "Uncategorized";
        const locationName = row.locationName?.trim() || "Unassigned";
  
        let category = await CategoryModel.findOne({ categoryName });
        if (!category) category = await CategoryModel.create({ categoryName });
  
        let location = await LocationModel.findOne({ locationName });
        if (!location) location = await LocationModel.create({ locationName });
  
        if (location.locationName === "HQ") continue;
  
        // Match itemCode + location
        const existing = await ProductModel.findOne({
          itemCode: row.itemCode.trim(),
          locationId: location._id,
        });
  
        if (existing) {
          await ProductModel.updateOne(
            { _id: existing._id },
            {
              productName: row.productName.trim(),
              productDescription: row.productDescription || "",
              costPrice: Number(row.costPrice) || 0,
              sellingPrice: Number(row.sellingPrice) || 0,
              unitMeasure: row.unitMeasure || "",
              stock: Number(row.stock) || 0,
              categoryId: category._id,
            }
          );
          updatedCount++;
        } else {
          await ProductModel.create({
            itemCode: row.itemCode.trim(),
            productName: row.productName.trim(),
            productDescription: row.productDescription || "",
            costPrice: Number(row.costPrice) || 0,
            sellingPrice: Number(row.sellingPrice) || 0,
            unitMeasure: row.unitMeasure || "",
            stock: Number(row.stock) || 0,
            categoryId: category._id,
            locationId: location._id,
          });
          insertedCount++;
        }
      }
  
      res.json({
        message: `Import completed. Updated: ${updatedCount}, Inserted: ${insertedCount}`,
      });
    } catch (error) {
      console.error("CSV Import Error:", error);
      res.status(500).json({ message: "Import failed", error: error.message });
    }
  };
  
  export {
    createProduct,
    getProducts,
    getProductByCode,
    updateProduct,
    deleteProduct,
    exportProducts,
    importProducts,
    upload,
    updateItemCodeAll,
  };
  