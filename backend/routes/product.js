import express from "express";
import { createProduct, getProducts, getProductByCode, updateProduct, deleteProduct, exportProducts, importProducts, upload, updateItemCodeAll } from "../controllers/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, createProduct);
router.get("/", authMiddleware, getProducts);

router.get("/code/:itemCode", authMiddleware, getProductByCode)

// import/export
router.get("/csv/export", authMiddleware, exportProducts);
router.post("/csv/import", authMiddleware, upload.single("file"), importProducts);

router.patch("/itemcode/:oldItemCode", authMiddleware, updateItemCodeAll);

router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);



export default router;
