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
  },
  {
    timestamps: true,
  },
);

// Only one active reservation per check-in date
bookingSchema.index(
  { checkInDateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDateReserved: true,
    },
  },
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
