const bookingExpirationEmail = ({
  customerName,
  bookingReference,
  checkIn,
  checkOut,
  totalAmount,
}) => {
  return `
    <h1>Booking Expiration Notice</h1>

    <p>Hello ${customerName},</p>

    <p>
      Your Staycation booking has expired because the required payment
      was not completed within the allowed time.
    </p>

    <h3>Booking Details</h3>

    <p><strong>Booking Reference:</strong> ${bookingReference}</p>
    <p><strong>Check-in:</strong> ${checkIn}</p>
    <p><strong>Check-out:</strong> ${checkOut}</p>
    <p><strong>Total Amount:</strong> ₱${totalAmount.toLocaleString("en-PH")}</p>

    <p>
      Your reservation is no longer active. You may create a new booking
      if you wish to reserve another date.
    </p>

    <p>Thank you for choosing Staycation.</p>
  `;
};

export default bookingExpirationEmail;
