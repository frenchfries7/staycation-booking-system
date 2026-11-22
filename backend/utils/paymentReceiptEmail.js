const paymentReceiptEmail = ({
  customerName,
  bookingReference,
  paymentPurpose,
  amountPaid,
  totalAmount,
  remainingBalance,
  paymentMethod,
  paymentDate,
}) => {
  return `
    <h1>Payment Receipt</h1>
    <p>Hello ${customerName},</p>

    <p>We have successfully received your payment. Thank you!</p>

    <h3>Booking Details</h3>
    <p><strong>Booking Reference:</strong> ${bookingReference}</p>

    <h3>Payment Details</h3>
    <p><strong>Payment Type:</strong> ${paymentPurpose}</p>
    <p><strong>Amount Paid:</strong> ₱${amountPaid.toLocaleString("en-PH")}</p>
    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
    <p><strong>Payment Date:</strong> ${paymentDate}</p>
    <p><strong>Total Booking Amount:</strong> ₱${totalAmount.toLocaleString("en-PH")}</p>
    <p><strong>Remaining Balance:</strong> ₱${remainingBalance.toLocaleString("en-PH")}</p>

    <p>Keep this email for your payment records.</p>
    <p>Thank you for choosing Staycation!</p>
  `;
};

export default paymentReceiptEmail;
