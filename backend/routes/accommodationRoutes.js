import express from "express";
import {
  saveAccommodation,
  getAccommodation,
} from "../controllers/accommodationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/", getAccommodation);
router.put("/", authMiddleware, adminMiddleware, saveAccommodation);

export default router;
