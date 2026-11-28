import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bookingReference: {
      type: String,
      unique: true,
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkInDateKey: {
      type: String,
      required: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },

    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    downpaymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "fully_paid"],
      default: "unpaid",
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "expired"],
      default: "pending",
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isDateReserved: {
      type: Boolean,
      default: true,
    },

    doorAccessEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Only one active reservation per check-in date (also speeds up checkAvailability)
bookingSchema.index(
  { checkInDateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDateReserved: true,
    },
  },
);

// Fast lookup and sorting for customer's "My Bookings"
bookingSchema.index({ userId: 1, createdAt: -1 });

// Fast cleanup for expirePendingBookings utility
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1, expiresAt: 1 });

// Fast sorting for Admin dashboard bookings list
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
