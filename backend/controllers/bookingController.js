import Booking from "../models/booking.js";
import Accommodation from "../models/accommodation.js";
import expirePendingBookings from "../utils/expirePendingBookings.js";
import { randomBytes } from "crypto";
import sendEmail from "../utils/emailService.js";
import bookingCancellationEmail from "../utils/bookingCancellationEmail.js";
import bookingConfirmationEmail from "../utils/bookingConfirmationEmail.js";
import BlockedDate from "../models/blockedDate.js";

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
    const blockedDate = await BlockedDate.findOne({
      startDate: { $lt: checkOutDate },
      endDate: { $gte: checkInDate },
    });

    if (blockedDate) {
      return res.status(409).json({
        message: "These dates are unavailable due to property maintenance.",
      });
    }

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

    // Send booking confirmation email
    try {
      await booking.populate("userId", "name email");

      if (!booking.userId?.email) {
        throw new Error("Customer email not found.");
      }

      await sendEmail({
        to: booking.userId.email,
        subject: "Booking Confirmation - Staycation",
        html: bookingConfirmationEmail({
          customerName: booking.userId.name,
          bookingReference: booking.bookingReference,
          checkIn: booking.checkIn.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          checkOut: booking.checkOut.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          numberOfGuests: booking.numberOfGuests,
          totalAmount: booking.totalAmount,
          downpaymentAmount: booking.downpaymentAmount,
          remainingBalance: booking.remainingBalance,
        }),
      });

      console.log("Booking confirmation email sent.");
    } catch (emailError) {
      console.error("Booking confirmation email failed:", emailError);
    }

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

    // Fixed check-out: 12 PM the following day
    const checkOutDate = new Date(checkInDate.getTime() + 22 * 60 * 60 * 1000);

    const blockedDate = await BlockedDate.findOne({
      startDate: { $lt: checkOutDate },
      endDate: { $gte: checkInDate },
    });

    if (blockedDate) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "This date is unavailable due to property maintenance.",
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

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      userId: req.user.userId,
    }).populate("userId", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (!["pending", "confirmed"].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: "This booking cannot be cancelled.",
      });
    }

    booking.bookingStatus = "cancelled";
    booking.isDateReserved = false;
    await booking.save();

    try {
      await sendEmail({
        to: booking.userId.email,
        subject: "Booking Cancellation - Staycation",
        html: bookingCancellationEmail({
          customerName: booking.userId.name,
          bookingReference: booking.bookingReference,
          checkIn: booking.checkIn.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          checkOut: booking.checkOut.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          totalAmount: booking.totalAmount,
          cancellationReason: "Cancelled by customer.",
        }),
      });
    } catch (emailError) {
      console.error("Booking cancellation email failed:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking.",
    });
  }
};
// Check availability for a date range (calendar batch request)
export const checkAvailabilityRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const isValidDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid start and end dates are required.",
      });
    }

    const now = new Date();
    const firstCheckIn = new Date(`${startDate}T14:00:00+08:00`);
    const lastCheckIn = new Date(`${endDate}T14:00:00+08:00`);
    const lastCheckOut = new Date(lastCheckIn.getTime() + 22 * 60 * 60 * 1000);

    // Run both queries in parallel + .lean() for faster execution
    const [bookings, blockedDates] = await Promise.all([
      Booking.find({
        checkInDateKey: { $gte: startDate, $lte: endDate },
        isDateReserved: true,
        $or: [
          { bookingStatus: { $in: ["confirmed", "completed"] } },
          { bookingStatus: "pending", expiresAt: { $gt: now } },
        ],
      })
        .select("checkInDateKey -_id")
        .lean(),
      BlockedDate.find({
        startDate: { $lt: lastCheckOut },
        endDate: { $gte: firstCheckIn },
      })
        .select("startDate endDate -_id")
        .lean(),
    ]);

    const unavailableDates = new Set(bookings.map((b) => b.checkInDateKey));

    if (blockedDates.length > 0) {
      const currentDate = new Date(`${startDate}T00:00:00.000Z`);
      const finalDate = new Date(`${endDate}T00:00:00.000Z`);

      while (currentDate <= finalDate) {
        const dateKey = currentDate.toISOString().slice(0, 10);
        const checkIn = new Date(`${dateKey}T14:00:00+08:00`);
        const checkOut = new Date(checkIn.getTime() + 22 * 60 * 60 * 1000);

        const isBlocked = blockedDates.some(
          (blocked) =>
            blocked.startDate < checkOut && blocked.endDate >= checkIn,
        );

        if (isBlocked) unavailableDates.add(dateKey);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    }

    return res.status(200).json({
      success: true,
      unavailableDates: [...unavailableDates],
    });
  } catch (error) {
    console.error("Check availability range error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to check availability.",
    });
  }
};
