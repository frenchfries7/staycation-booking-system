import express from "express";
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  checkAvailability,
  cancelBooking,
} from "../controllers/bookingController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";

const router = express.Router();
router.post("/", authMiddleware, csrfMiddleware, createBooking);

router.get("/my-bookings", authMiddleware, getMyBookings);

router.get("/all", authMiddleware, adminMiddleware, getAllBookings);

router.get("/availability", checkAvailability);

router.patch(
  "/:bookingId/cancel",
  authMiddleware,
  csrfMiddleware,
  cancelBooking,
);

export default router;
