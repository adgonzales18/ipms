import express from 'express';
import {createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", authMiddleware, getCategories);
router.post("/add", authMiddleware, createCategory);
router.patch("/update/:id", authMiddleware, updateCategory);
router.delete("/delete/:id", authMiddleware, deleteCategory);

export default router;