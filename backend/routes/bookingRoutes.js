import express from "express";
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  checkAvailability,
} from "../controllers/bookingController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createBooking);

router.get("/my-bookings", authMiddleware, getMyBookings);

router.get("/all", authMiddleware, adminMiddleware, getAllBookings);

router.get("/availability", checkAvailability);

export default router;
