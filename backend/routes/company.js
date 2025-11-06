import express from 'express';
import { createCompany, updateCompany, getCompany, deleteCompany } from '../controllers/companyController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", authMiddleware, getCompany);
router.post("/add", authMiddleware, createCompany);
router.patch("/update/:id", authMiddleware, updateCompany);
router.delete("/delete/:id", authMiddleware, deleteCompany);

export default router;