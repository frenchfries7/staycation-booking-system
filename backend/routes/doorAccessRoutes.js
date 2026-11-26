import express from "express";
import {
  getDoorAccess,
  updateDoorAccess,
} from "../controllers/doorAccessController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";
const router = express.Router();

router.get("/", authMiddleware, adminMiddleware, getDoorAccess);
router.put(
  "/",
  authMiddleware,
  adminMiddleware,
  csrfMiddleware,
  updateDoorAccess,
);
export default router;
