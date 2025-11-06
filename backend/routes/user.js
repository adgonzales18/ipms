import express from 'express';
import { getUsers, getUserbyId, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get("/", authMiddleware, getUsers);
router.post("/", authMiddleware, createUser);
router.get("/:id", authMiddleware, getUserbyId);
router.patch("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);

export default router;