import express from "express";
import {
  createPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Create GCash or Maya payment
router.post("/", authMiddleware, createPayment);

// Get payment status
router.get("/:paymentIntentId", authMiddleware, getPaymentStatus);

export default router;
