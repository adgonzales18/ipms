import express from 'express';
import {authMiddleware, requireAdmin } from '../middleware/authMiddleware.js';
import { 
    createTransaction, 
    getTransactions, 
    getTransactionById, 
    updateInboundTransaction, 
    updatePurchaseTransaction, 
    approveTransaction, 
    rejectTransaction, 
    cancelTransaction, 
    deleteDraftTransaction, 
    submitDraftTransaction, 
    moveToDraft, 
    resubmitTransaction } 
    from '../controllers/transactionController.js';

const router = express.Router();

// Normal users
router.post("/", authMiddleware, createTransaction);
router.get("/", authMiddleware, getTransactions);
router.get("/:id", authMiddleware, getTransactionById);

// ✅ Update inbound quantities & notes
router.put("/:id/inbound", authMiddleware, updateInboundTransaction);

// ✅ Update purchase transaction (only when pending)
router.put("/:id/purchase", authMiddleware, updatePurchaseTransaction);

// Admin approvals
router.put("/:id/approve", authMiddleware, requireAdmin, approveTransaction);
router.put("/:id/reject", authMiddleware, requireAdmin, rejectTransaction);

// ✅ Cancel approved purchase transaction (admin only)
router.put("/:id/cancel", authMiddleware, requireAdmin, cancelTransaction);

// ✅ Draft management
router.delete("/:id/draft", authMiddleware, deleteDraftTransaction);
router.put("/:id/submit", authMiddleware, submitDraftTransaction);

// ✅ Cancelled transaction management
router.put("/:id/move-to-draft", authMiddleware, moveToDraft);
router.put("/:id/resubmit", authMiddleware, resubmitTransaction);

export default router;
