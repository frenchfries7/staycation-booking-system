import Booking from "../models/booking.js";

const expirePendingBookings = async () => {
  const result = await Booking.updateMany(
    {
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

  return result;
};

export default expirePendingBookings;
