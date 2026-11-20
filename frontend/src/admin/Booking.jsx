import { useEffect, useState } from "react";
import "../admin/Booking.css";

const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/all`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch bookings");
      }

      setBookings(data.bookings || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const customerName = booking.userId?.name || "";
    const bookingReference = booking.bookingReference || "";

    return (
      customerName.toLowerCase().includes(search.toLowerCase()) ||
      bookingReference.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="admin-booking-page">
      <div className="booking-header">
        <h1>Recent Bookings</h1>
        <p>Manage and monitor customer reservations.</p>
      </div>

      <div className="booking-toolbar">
        <input
          type="text"
          placeholder="Search booking or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button onClick={fetchBookings}>Refresh</button>
      </div>

      {loading ? (
        <p>Loading bookings...</p>
      ) : error ? (
        <div className="booking-error">
          <p>{error}</p>
          <button onClick={fetchBookings}>Try Again</button>
        </div>
      ) : (
        <div className="booking-table-container">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Booking Reference</th>
                <th>Customer</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Guests</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.bookingReference}</td>
                    <td>
                      <div>{booking.userId?.name || "Unknown"}</div>
                      <small>{booking.userId?.email || "No email"}</small>
                    </td>
                    <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
                    <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
                    <td>{booking.numberOfGuests}</td>
                    <td>₱{booking.totalAmount?.toLocaleString("en-PH")}</td>
                    <td>{booking.paymentStatus}</td>
                    <td>{booking.bookingStatus}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          console.log("Selected booking:", booking)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Booking;
