import crypto from "crypto";
import Payment from "../models/payment.js";
import Booking from "../models/booking.js";
import sendEmail from "../utils/emailService.js";
import paymentReceiptEmail from "../utils/paymentReceiptEmail.js";
import DoorAccess from "../models/doorAccess.js";
import doorAccessEmail from "../utils/doorAccessEmail.js";

const verifyPayMongoSignature = (rawBody, signatureHeader) => {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!webhookSecret || !signatureHeader || !Buffer.isBuffer(rawBody)) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const testSignature = parts.te;
  const liveSignature = parts.li;

  if (!timestamp) return false;

  // Reject old webhook requests to reduce replay attacks.
  const timestampNumber = Number(timestamp);

  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() / 1000 - timestampNumber) > 300
  ) {
    return false;
  }

  const payload = `${timestamp}.${rawBody.toString("utf8")}`;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  // Test and live events use different signature values.
  // We determine the correct mode after parsing the event,
  // so validate against either supplied signature here.
  const signatures = [testSignature, liveSignature].filter(Boolean);

  return signatures.some((signature) => {
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(signature, "hex");

    return (
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received)
    );
  });
};

export const handlePayMongoWebhook = async (req, res) => {
  try {
    console.log("PAYMONGO WEBHOOK HIT");

    const signatureHeader = req.headers["paymongo-signature"];

    if (!verifyPayMongoSignature(req.body, signatureHeader)) {
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    const eventType = event.data?.attributes?.type;
    console.log("PayMongo webhook event:", eventType);
    const eventData = event.data?.attributes?.data;
    const attributes = eventData?.attributes;

    if (!eventType || !eventData?.id || !attributes) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload.",
      });
    }

    // We only process successful and failed payment events.
    if (!["payment.paid", "payment.failed"].includes(eventType)) {
      return res.status(200).json({
        success: true,
        message: "Event ignored.",
      });
    }

    const paymentIntentId = attributes.payment_intent_id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment Intent ID is missing.",
      });
    }

    const payment = await Payment.findOne({ paymentIntentId });

    if (!payment) {
      console.error("Webhook payment record not found:", paymentIntentId);

      // Acknowledge unknown payments to avoid endless retries.
      return res.status(200).json({
        success: true,
        message: "Payment record not found. Event acknowledged.",
      });
    }

    // Prevent duplicate or repeated webhook processing.
    if (payment.paymentStatus === "completed") {
      return res.status(200).json({
        success: true,
        message: "Payment already processed.",
      });
    }

    if (eventType === "payment.failed") {
      payment.paymentStatus = "failed";
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Failed payment recorded.",
      });
    }

    // Verify amount and currency against our own payment record.
    const expectedAmount = Math.round(payment.amount * 100);

    if (
      attributes.status !== "paid" ||
      attributes.amount !== expectedAmount ||
      attributes.currency?.toUpperCase() !== "PHP"
    ) {
      console.error("Webhook payment validation failed:", paymentIntentId);

      return res.status(400).json({
        success: false,
        message: "Payment amount or currency does not match.",
      });
    }

    const booking = await Booking.findById(payment.bookingId).populate(
      "userId",
      "name email",
    );

    if (!booking) {
      return res.status(200).json({
        success: true,
        message: "Booking not found. Event acknowledged for review.",
      });
    }

    // DOWNPAYMENT: confirm booking only if it is still reserved.
    if (payment.paymentPurpose === "downpayment") {
      const isEligible =
        booking.bookingStatus === "pending" &&
        booking.paymentStatus === "unpaid" &&
        booking.isDateReserved === true &&
        booking.expiresAt &&
        booking.expiresAt > new Date();

      if (!isEligible) {
        payment.paymentStatus = "completed";
        await payment.save();

        console.error(
          "Late or ineligible downpayment requires manual review:",
          booking._id,
        );

        return res.status(200).json({
          success: true,
          message: "Payment received but booking requires manual review.",
        });
      }

      booking.bookingStatus = "confirmed";
      booking.paymentStatus = "partial";

      await booking.save();
      payment.paymentStatus = "completed";
      await payment.save();
      try {
        await sendEmail({
          to: booking.userId.email,
          subject: "Booking Confirmation - Staycation",
          html: `
      <h1>Booking Confirmed!</h1>
      <p>Hello ${booking.userId.name},</p>

      <p>Your Staycation reservation has been confirmed.</p>

      <h3>Booking Details</h3>
      <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
      <p><strong>Check-in:</strong> ${booking.checkIn.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      })}</p>
      <p><strong>Check-out:</strong> ${booking.checkOut.toLocaleString(
        "en-PH",
        {
          timeZone: "Asia/Manila",
        },
      )}</p>
      <p><strong>Guests:</strong> ${booking.numberOfGuests}</p>

      <h3>Payment Details</h3>
      <p><strong>Total:</strong> ₱${booking.totalAmount.toLocaleString("en-PH")}</p>
      <p><strong>Downpayment Paid:</strong> ₱${payment.amount.toLocaleString("en-PH")}</p>
      <p><strong>Remaining Balance:</strong> ₱${booking.remainingBalance.toLocaleString("en-PH")}</p>

      <p>Thank you for choosing Staycation!</p>
    `,
        });
        await sendEmail({
          to: booking.userId.email,
          subject: "Payment Receipt - Staycation",
          html: paymentReceiptEmail({
            customerName: booking.userId.name,
            bookingReference: booking.bookingReference,
            paymentPurpose: payment.paymentPurpose,
            amountPaid: payment.amount,
            totalAmount: booking.totalAmount,
            remainingBalance: booking.remainingBalance,
            paymentMethod: payment.paymentMethod,
            paymentDate: new Date().toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            }),
          }),
        });

        payment.receiptEmailSentAt = new Date();
        await payment.save();
      } catch (emailError) {
        console.error("Booking confirmation email failed:", emailError.message);
      }
    }

    // BALANCE: mark the booking fully paid.
    if (payment.paymentPurpose === "balance") {
      const isEligible =
        booking.bookingStatus === "confirmed" &&
        booking.paymentStatus === "partial";

      if (!isEligible) {
        payment.paymentStatus = "completed";
        await payment.save();

        console.error("Balance payment requires manual review:", booking._id);

        return res.status(200).json({
          success: true,
          message: "Payment received but booking requires manual review.",
        });
      }

      booking.paymentStatus = "fully_paid";
      booking.remainingBalance = 0; // <-- I-zero na ang remaining balance
      await booking.save();

      payment.paymentStatus = "completed";
      await payment.save();

      const doorAccess = await DoorAccess.findOne();

      if (!doorAccess) {
        console.error("DoorAccess document missing in database!");
      } else if (!booking.doorAccessEmailSentAt) {
        try {
          await sendEmail({
            to: booking.userId.email,
            subject: "Staycation Door Access Code",
            html: doorAccessEmail({
              customerName: booking.userId.name,
              bookingReference: booking.bookingReference,
              accessCode: doorAccess.accessCode,
            }),
          });
          booking.doorAccessEmailSentAt = new Date();
          await booking.save();
        } catch (error) {
          console.error("Door access email failed:", error);
        }
      }

      if (!payment.receiptEmailSentAt) {
        try {
          await sendEmail({
            to: booking.userId.email,
            subject: "Payment Receipt - Staycation",
            html: paymentReceiptEmail({
              customerName: booking.userId.name,
              bookingReference: booking.bookingReference,
              paymentPurpose: payment.paymentPurpose,
              amountPaid: payment.amount,
              totalAmount: booking.totalAmount,
              remainingBalance: booking.remainingBalance,
              paymentMethod: payment.paymentMethod,
              paymentDate: new Date().toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
              }),
            }),
          });

          payment.receiptEmailSentAt = new Date();
          await payment.save();
        } catch (emailError) {
          console.error("Balance receipt email failed:", emailError.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment webhook processed successfully.",
    });
  } catch (error) {
    console.error("PayMongo webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};
