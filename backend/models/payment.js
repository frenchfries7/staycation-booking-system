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
  },
  {
    timestamps: true,
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
