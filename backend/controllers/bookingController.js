import Booking from "../models/booking.js";
import Accommodation from "../models/accommodation.js";
import expirePendingBookings from "../utils/expirePendingBookings.js";
import { randomBytes } from "crypto";

// Create booking
export const createBooking = async (req, res) => {
  try {
    await expirePendingBookings();

    const { checkIn, numberOfGuests } = req.body;

    // Validate required fields
    if (!checkIn || numberOfGuests === undefined) {
      return res.status(400).json({
        success: false,
        message: "Check-in date and number of guests are required.",
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in date.",
      });
    }

    // Validate actual calendar date
    const checkInDate = new Date(`${checkIn}T14:00:00+08:00`);

    if (
      Number.isNaN(checkInDate.getTime()) ||
      checkInDate.toISOString().slice(0, 10) !== checkIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in date.",
      });
    }

    // Prevent past dates using Philippine time
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past.",
      });
    }

    // Validate guest count
    const guests = Number(numberOfGuests);

    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid number of guests.",
      });
    }

    // Get active Villa Azora details
    const accommodation = await Accommodation.findOne({
      isActive: true,
    });

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Accommodation not found.",
      });
    }

    if (guests > accommodation.capacity) {
      return res.status(400).json({
        success: false,
        message: "Guest capacity exceeded.",
      });
    }

    // Prevent bookings when admin has not configured a valid price
    if (!Number.isFinite(accommodation.price) || accommodation.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Accommodation price has not been configured.",
      });
    }

    // Fixed check-out: 12 PM the following day
    const checkOutDate = new Date(checkInDate.getTime() + 22 * 60 * 60 * 1000);

    // Calculate payment
    const totalAmount = accommodation.price;
    const downpaymentAmount = totalAmount * 0.5;
    const remainingBalance = totalAmount - downpaymentAmount;

    // Create pending booking with 15-minute expiration
    const booking = await Booking.create({
      userId: req.user.userId,
      bookingReference: `VA-${randomBytes(4).toString("hex").toUpperCase()}`,
      checkIn: checkInDate,
      checkInDateKey: checkIn,
      checkOut: checkOutDate,
      numberOfGuests: guests,
      totalAmount,
      downpaymentAmount,
      remainingBalance,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isDateReserved: true,
    });

    return res.status(201).json({
      success: true,
      message:
        "Booking created successfully. Please complete your downpayment within 15 minutes.",
      booking,
    });
  } catch (error) {
    // Duplicate active reservation
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Selected date is already reserved.",
      });
    }

    console.error("Create booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
};

// Get logged-in customer's bookings
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your bookings.",
    });
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get all bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve all bookings.",
    });
  }
};

// Check booking availability
export const checkAvailability = async (req, res) => {
  try {
    await expirePendingBookings();

    const { checkIn } = req.query;

    if (!checkIn || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
      return res.status(400).json({
        success: false,
        message: "Valid check-in date is required.",
      });
    }

    const checkInDate = new Date(`${checkIn}T14:00:00+08:00`);

    if (
      Number.isNaN(checkInDate.getTime()) ||
      checkInDate.toISOString().slice(0, 10) !== checkIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in date.",
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past.",
      });
    }

    const existingBooking = await Booking.findOne({
      checkInDateKey: checkIn,
      isDateReserved: true,
    });

    return res.status(200).json({
      success: true,
      available: !existingBooking,
      message: existingBooking
        ? "Selected date is already reserved."
        : "Selected date is available.",
    });
  } catch (error) {
    console.error("Check availability error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check availability.",
    });
  }
};
