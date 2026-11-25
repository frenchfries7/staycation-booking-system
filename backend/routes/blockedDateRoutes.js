import express from "express";
import {
  createBlockedDate,
  getBlockedDates,
  deleteBlockedDate,
  updateBlockedDate,
} from "../controllers/blockedDateController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminMiddleware, createBlockedDate);
router.get("/", authMiddleware, adminMiddleware, getBlockedDates);
router.delete("/:id", authMiddleware, adminMiddleware, deleteBlockedDate);
router.put("/:id", authMiddleware, adminMiddleware, updateBlockedDate);

export default router;
