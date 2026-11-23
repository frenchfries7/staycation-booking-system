const doorAccessEmail = ({ customerName, bookingReference, accessCode }) => {
  return `
    <h1>Your Door Access Code</h1>

    <p>Hello ${customerName},</p>

    <p>
      Your Staycation booking is now fully paid!
      Here is your door access code.
    </p>

    <h3>Booking Details</h3>
    <p><strong>Booking Reference:</strong> ${bookingReference}</p>

    <h2>Door Access Code: ${accessCode}</h2>

    <p>
      Please keep your access code private.
      Use it only during your confirmed reservation.
    </p>

    <p>Thank you for choosing Staycation!</p>
  `;
};

export default doorAccessEmail;
