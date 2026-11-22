const bookingCancellationEmail = ({
  customerName,
  bookingReference,
  checkIn,
  checkOut,
  totalAmount,
  cancellationReason,
}) => {
  return `
    <h1>Booking Cancellation Notice</h1>
    <p>Hello ${customerName},</p>

    <p>Your Staycation reservation has been cancelled.</p>

    <h3>Booking Details</h3>
    <p><strong>Booking Reference:</strong> ${bookingReference}</p>
    <p><strong>Check-in:</strong> ${checkIn}</p>
    <p><strong>Check-out:</strong> ${checkOut}</p>
    <p><strong>Total Amount:</strong> ₱${totalAmount.toLocaleString("en-PH")}</p>
    <p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>

    <p>If you have questions regarding your cancellation or payment refund,
    please contact us.</p>

    <p>Thank you for choosing Staycation.</p>
  `;
};

export default bookingCancellationEmail;
