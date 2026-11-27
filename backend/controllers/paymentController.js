import mongoose from "mongoose";
import Payment from "../models/payment.js";
import Booking from "../models/booking.js";

// PayMongo authentication
const getPayMongoHeaders = () => ({
  "Content-Type": "application/json",
  Authorization:
    "Basic " +
    Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
});

// Reusable PayMongo request
const payMongoRequest = async (url, options = {}) => {
  const timeoutMs = Number(process.env.PAYMONGO_REQUEST_TIMEOUT_MS);

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Invalid PAYMONGO_REQUEST_TIMEOUT_MS configuration.");
  }

  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      ...getPayMongoHeaders(),
      ...options.headers,
    },
  });
};

// Update local payment status only.
// Booking confirmation will be handled by the verified webhook.
const updatePaymentStatus = async (payment, status) => {
  if (status !== "cancelled") {
    return;
  }

  await Payment.updateOne(
    {
      _id: payment._id,
      paymentStatus: "pending",
    },
    {
      $set: {
        paymentStatus: "failed",
      },
    },
  );
};

// CREATE PAYMENT
export const createPayment = async (req, res) => {
  let paymentAttempt;
  let paymentIntentId;
  try {
    const {
      bookingId,
      paymentMethod,
      paymentPurpose = "downpayment",
    } = req.body;

    // STEP 1: Check PayMongo configuration
    if (!process.env.PAYMONGO_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured.",
      });
    }

    // STEP 2: Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    // STEP 3: Validate payment method
    const paymentMethods = {
      GCash: "gcash",
      Maya: "paymaya",
    };

    const provider = paymentMethods[paymentMethod];

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Only GCash and Maya payments are supported.",
      });
    }

    // STEP 4: Validate payment purpose
    if (!["downpayment", "balance"].includes(paymentPurpose)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment purpose.",
      });
    }

    // STEP 5: Find booking and verify ownership
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // STEP 6: Validate booking payment eligibility
    if (paymentPurpose === "downpayment") {
      if (
        booking.bookingStatus !== "pending" ||
        booking.paymentStatus !== "unpaid"
      ) {
        return res.status(409).json({
          success: false,
          message: "This booking is not eligible for downpayment.",
        });
      }

      if (
        !booking.isDateReserved ||
        !booking.expiresAt ||
        booking.expiresAt <= new Date()
      ) {
        return res.status(409).json({
          success: false,
          message: "This booking has expired. Please create a new booking.",
        });
      }
    }

    if (paymentPurpose === "balance") {
      if (
        booking.bookingStatus !== "confirmed" ||
        booking.paymentStatus !== "partial"
      ) {
        return res.status(409).json({
          success: false,
          message: "This booking is not eligible for balance payment.",
        });
      }
    }

    // STEP 7: Get the correct payment amount
    const amount =
      paymentPurpose === "downpayment"
        ? booking.downpaymentAmount
        : booking.remainingBalance;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    // STEP 8: Check existing pending payment

    const existingPayment = await Payment.findOne({
      bookingId: booking._id,
      paymentPurpose,
      paymentStatus: "pending",
    });

    if (existingPayment && !existingPayment.paymentIntentId) {
      return res.status(409).json({
        success: false,
        message: "Payment initialization is still in progress.",
      });
    }

    if (existingPayment) {
      const statusResponse = await payMongoRequest(
        `https://api.paymongo.com/v1/payment_intents/${existingPayment.paymentIntentId}`,
        { method: "GET" },
      );

      const statusResult = await statusResponse.json().catch(() => null);

      if (!statusResponse.ok || !statusResult?.data?.attributes?.status) {
        return res.status(502).json({
          success: false,
          message: "Unable to verify existing payment.",
        });
      }

      const actualStatus = statusResult.data.attributes.status;

      if (actualStatus === "succeeded") {
        return res.status(409).json({
          success: false,
          message:
            "Payment was already completed. Waiting for booking confirmation.",
        });
      }

      if (
        actualStatus === "awaiting_next_action" ||
        actualStatus === "processing"
      ) {
        return res.status(409).json({
          success: false,
          message: "An existing payment is still being processed.",
          paymentIntentId: existingPayment.paymentIntentId,
          paymentStatus: actualStatus,
        });
      }

      if (actualStatus === "awaiting_payment_method") {
        if (existingPayment.paymentMethod !== paymentMethod) {
          return res.status(409).json({
            success: false,
            message:
              "Please use the original payment method for this payment attempt.",
          });
        }

        if (existingPayment.amount !== amount) {
          return res.status(409).json({
            success: false,
            message: "Payment amount has changed. Please contact support.",
          });
        }
        // Reuse the existing Payment Intent.
        // A new Payment Method will be created and attached.

        paymentAttempt = existingPayment;
        paymentIntentId = existingPayment.paymentIntentId;

        paymentAttempt.paymentMethod = paymentMethod;
        await paymentAttempt.save();
      } else if (actualStatus === "cancelled") {
        // A cancelled Payment Intent can no longer be paid.

        const updateResult = await Payment.updateOne(
          {
            _id: existingPayment._id,
            paymentStatus: "pending",
          },
          {
            $set: { paymentStatus: "failed" },
          },
        );

        if (updateResult.modifiedCount !== 1) {
          return res.status(409).json({
            success: false,
            message:
              "Payment status changed. Please check your booking payment status.",
          });
        }
      } else {
        return res.status(409).json({
          success: false,
          message: "Existing payment cannot be retried yet.",
          paymentStatus: actualStatus,
        });
      }
    }
    // STEP 9: Validate frontend return URL
    const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is missing.",
      });
    }

    let returnUrl;

    try {
      const parsedUrl = new URL(`${frontendUrl}/booking/payment-result`);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }

      returnUrl = parsedUrl.toString();
    } catch {
      return res.status(500).json({
        success: false,
        message: "Invalid FRONTEND_URL.",
      });
    }

    // STEP 10: Create or reuse PayMongo Payment Intent

    if (!paymentIntentId) {
      const intentResponse = await payMongoRequest(
        "https://api.paymongo.com/v1/payment_intents",
        {
          method: "POST",
          body: JSON.stringify({
            data: {
              attributes: {
                amount: Math.round(amount * 100),
                currency: "PHP",
                payment_method_allowed: [provider],
                description: `Staycation ${paymentPurpose} - ${booking.bookingReference}`,
              },
            },
          }),
        },
      );

      const intentResult = await intentResponse.json().catch(() => null);

      if (!intentResponse.ok || !intentResult?.data?.id) {
        console.error("PayMongo intent error:", intentResult);

        return res.status(502).json({
          success: false,
          message: "Failed to create payment intent.",
        });
      }

      paymentIntentId = intentResult.data.id;

      try {
        paymentAttempt = await Payment.create({
          bookingId: booking._id,
          paymentIntentId,
          paymentMethod,
          paymentPurpose,
          amount,
          currency: "PHP",
          paymentStatus: "pending",
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "A payment attempt already exists for this booking.",
          });
        }

        throw error;
      }
    }

    // STEP 11: Create GCash or Maya Payment Method
    const methodResponse = await payMongoRequest(
      "https://api.paymongo.com/v1/payment_methods",
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            attributes: {
              type: provider,
            },
          },
        }),
      },
    );

    const methodResult = await methodResponse.json();

    if (!methodResponse.ok || !methodResult.data?.id) {
      console.error("PayMongo method error:", methodResult);

      return res.status(502).json({
        success: false,
        message: "Failed to create payment method.",
      });
    }

    const paymentMethodId = methodResult.data.id;

    // STEP 12: Attach Payment Method to Payment Intent
    const attachResponse = await payMongoRequest(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: paymentMethodId,
              return_url: returnUrl,
            },
          },
        }),
      },
    );

    const attachResult = await attachResponse.json();

    if (!attachResponse.ok || !attachResult.data) {
      console.error("PayMongo attach error:", attachResult);

      return res.status(502).json({
        success: false,
        message: "Failed to attach payment method.",
      });
    }

    const nextAction = attachResult.data.attributes.next_action;

    // STEP 13: Save payment record in MongoDB
    const payment = await Payment.findById(paymentAttempt._id);

    if (!payment) {
      console.error("Local payment record disappeared:", paymentAttempt._id);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve payment record.",
      });
    }

    // IMPORTANT:
    // Do not confirm the booking here.
    // The verified PayMongo webhook will update the booking.

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully.",
      payment: {
        id: payment._id,
        paymentIntentId,
        paymentMethod,
        paymentPurpose,
        amount,
        paymentStatus: payment.paymentStatus,
      },
      nextAction,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message:
          "Payment service timed out. Please check your payment status before retrying.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// GET PAYMENT STATUS
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    // STEP 1: Validate payment intent ID
    if (typeof paymentIntentId !== "string" || !paymentIntentId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Payment Intent ID is required.",
      });
    }

    // STEP 2: Find local payment record
    const payment = await Payment.findOne({
      paymentIntentId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    // STEP 3: Verify booking ownership
    const booking = await Booking.findOne({
      _id: payment.bookingId,
      userId: req.user.userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Associated booking not found.",
      });
    }

    // STEP 4: Get latest status directly from PayMongo
    const response = await payMongoRequest(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { method: "GET" },
    );

    const result = await response.json();

    if (!response.ok || !result.data?.attributes?.status) {
      console.error("PayMongo status error:", result);

      return res.status(502).json({
        success: false,
        message: "Failed to retrieve payment status.",
      });
    }

    const actualStatus = result.data.attributes.status;

    // STEP 5: Update local payment status
    if (actualStatus === "cancelled") {
      await updatePaymentStatus(payment, "cancelled");
    }
    const latestPayment = await Payment.findById(payment._id);

    if (!latestPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    // Booking confirmation and payment totals are updated
    // only by the verified webhook.

    return res.status(200).json({
      success: true,
      payment: {
        paymentIntentId,
        paymentMethod: payment.paymentMethod,
        paymentPurpose: payment.paymentPurpose,
        amount: payment.amount,
        paymentStatus: latestPayment.paymentStatus,
      },
      payMongoStatus: actualStatus,
      bookingStatus: booking.bookingStatus,
      bookingPaymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    console.error("Get payment status error:", error);

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Payment status request timed out. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
