const bookingConfirmationEmail = ({
  customerName,
  bookingReference,
  checkIn,
  checkOut,
  numberOfGuests,
  totalAmount,
  downpaymentAmount,
  remainingBalance,
}) => {
  return `
    <h1>Booking Confirmation</h1>

    <p>Hello ${customerName},</p>

    <p>
      Your Staycation booking has been successfully created!
      Please complete your downpayment before your reservation expires.
    </p>

    <h3>Booking Details</h3>
    <p><strong>Booking Reference:</strong> ${bookingReference}</p>
    <p><strong>Check-in:</strong> ${checkIn}</p>
    <p><strong>Check-out:</strong> ${checkOut}</p>
    <p><strong>Number of Guests:</strong> ${numberOfGuests}</p>

    <h3>Payment Details</h3>
    <p><strong>Total Amount:</strong> ₱${totalAmount.toLocaleString("en-PH")}</p>
    <p><strong>Downpayment:</strong> ₱${downpaymentAmount.toLocaleString("en-PH")}</p>
    <p><strong>Remaining Balance:</strong> ₱${remainingBalance.toLocaleString("en-PH")}</p>

    <p>
      Please settle your downpayment within the allotted time
      to keep your reservation active.
    </p>

    <p>Thank you for choosing Staycation!</p>
  `;
};

export default bookingConfirmationEmail;
