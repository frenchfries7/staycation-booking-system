import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["GCash", "Maya"],
    },

    paymentPurpose: {
      type: String,
      enum: ["downpayment", "balance"],
      default: "downpayment",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "PHP",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    receiptEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate pending payments for the same booking and purpose
paymentSchema.index(
  {
    bookingId: 1,
    paymentPurpose: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      paymentStatus: "pending",
    },
    name: "unique_active_payment_per_booking_purpose",
  },
);

// Fast lookup of all payments associated with a booking
paymentSchema.index({ bookingId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
