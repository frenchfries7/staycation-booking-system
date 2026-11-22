import Booking from "../models/booking.js";
import sendEmail from "./emailService.js";
import bookingExpirationEmail from "./bookingExpirationEmail.js";

const expirePendingBookings = async () => {
  const expiredBookings = await Booking.find({
    bookingStatus: "pending",
    isDateReserved: true,
    expiresAt: {
      $ne: null,
      $lte: new Date(),
    },
  }).populate("userId", "name email");

  let expiredCount = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const booking of expiredBookings) {
    const result = await Booking.updateOne(
      {
        _id: booking._id,
        bookingStatus: "pending",
        isDateReserved: true,
        expiresAt: {
          $ne: null,
          $lte: new Date(),
        },
      },
      {
        $set: {
          bookingStatus: "expired",
          isDateReserved: false,
        },
      },
    );

    if (result.modifiedCount === 0) continue;

    expiredCount++;

    try {
      if (!booking.userId?.email) {
        throw new Error("Customer email not found.");
      }

      await sendEmail({
        to: booking.userId.email,
        subject: "Booking Expiration Notice - Staycation",
        html: bookingExpirationEmail({
          customerName: booking.userId.name,
          bookingReference: booking.bookingReference,
          checkIn: booking.checkIn.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          checkOut: booking.checkOut.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          }),
          totalAmount: booking.totalAmount,
        }),
      });

      emailsSent++;
    } catch (emailError) {
      emailsFailed++;
      console.error("Booking expiration email failed:", emailError.message);
    }
  }

  return {
    expiredCount,
    emailsSent,
    emailsFailed,
  };
};

export default expirePendingBookings;
