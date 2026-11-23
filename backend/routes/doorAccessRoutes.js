import express from "express";
import {
  getDoorAccess,
  updateDoorAccess,
} from "../controllers/doorAccessController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminMiddleware, getDoorAccess);
router.put("/", authMiddleware, adminMiddleware, updateDoorAccess);

export default router;
