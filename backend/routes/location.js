import express from 'express';
import {getLocations, createLocation, updateLocation, deleteLocation } from '../controllers/locationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get("/", authMiddleware, getLocations);
router.post("/", authMiddleware, createLocation);
router.patch("/:id", authMiddleware, updateLocation);
router.delete("/:id", authMiddleware, deleteLocation);

export default router;