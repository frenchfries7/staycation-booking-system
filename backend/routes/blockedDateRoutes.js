import express from "express";
import {
  createBlockedDate,
  getBlockedDates,
  deleteBlockedDate,
  updateBlockedDate,
} from "../controllers/blockedDateController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  csrfMiddleware,
  createBlockedDate,
);
router.get("/", authMiddleware, adminMiddleware, getBlockedDates);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  csrfMiddleware,
  deleteBlockedDate,
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  csrfMiddleware,
  updateBlockedDate,
);
export default router;
