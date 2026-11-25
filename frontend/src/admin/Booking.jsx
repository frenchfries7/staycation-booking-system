import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import "./Booking.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-US");
};

const formatCurrency = (amount) => {
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeStatus = (status) =>
  String(status || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();

const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/bookings/all`, {
        method: "GET",
        credentials: "include",
      });

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

  const filteredBookings = useMemo(() => {
    let result = bookings.filter((booking) => {
      const customerName = booking.userId?.name || "";
      const customerEmail = booking.userId?.email || "";
      const bookingReference = booking.bookingReference || "";

      const searchValue = search.toLowerCase();

      const matchesSearch =
        customerName.toLowerCase().includes(searchValue) ||
        customerEmail.toLowerCase().includes(searchValue) ||
        bookingReference.toLowerCase().includes(searchValue);

      const bookingStatus = normalizeStatus(booking.bookingStatus);

      const matchesStatus =
        statusFilter === "all" ||
        bookingStatus === normalizeStatus(statusFilter);

      return matchesSearch && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt || a.checkIn) -
            new Date(b.createdAt || b.checkIn)
          );

        case "checkin-asc":
          return new Date(a.checkIn) - new Date(b.checkIn);

        case "checkin-desc":
          return new Date(b.checkIn) - new Date(a.checkIn);

        case "checkout-asc":
          return new Date(a.checkOut) - new Date(b.checkOut);

        case "checkout-desc":
          return new Date(b.checkOut) - new Date(a.checkOut);

        case "customer-asc":
          return (a.userId?.name || "").localeCompare(b.userId?.name || "");

        case "amount-high":
          return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);

        case "amount-low":
          return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);

        case "newest":
        default:
          return (
            new Date(b.createdAt || b.checkIn) -
            new Date(a.createdAt || a.checkIn)
          );
      }
    });

    return result;
  }, [bookings, search, statusFilter, sortBy]);

  const exportBookings = () => {
    if (filteredBookings.length === 0) {
      alert("There are no bookings to export.");
      return;
    }

    const exportData = filteredBookings.map((booking) => ({
      "Booking Reference": booking.bookingReference || "—",
      Customer: booking.userId?.name || "Unknown",
      Email: booking.userId?.email || "No email",
      "Check-in": formatDate(booking.checkIn),
      "Check-out": formatDate(booking.checkOut),
      Guests: booking.numberOfGuests ?? 0,
      "Total Amount": Number(booking.totalAmount || 0),
      Payment: booking.paymentStatus || "Unknown",
      Status: booking.bookingStatus || "Unknown",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 25 },
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    XLSX.writeFile(
      workbook,
      `BR-Hideaway-Bookings-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="admin-booking-page">
      <div className="booking-page-heading">
        <div>
          <p className="booking-eyebrow">PROPERTY MANAGEMENT</p>
          <h1>Bookings</h1>
        </div>
      </div>

      <section className="booking-card">
        <div className="booking-card-header">
          <div className="booking-card-title">
            <h2>All reservations</h2>
            <p>Manage guest bookings and reservation status</p>
          </div>

          <button
            type="button"
            className="booking-export-button"
            onClick={exportBookings}
            disabled={loading || filteredBookings.length === 0}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 17v3h14v-3" />
            </svg>
            Export Excel
          </button>
        </div>

        <div className="booking-controls">
          <div className="booking-search">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              placeholder="Search guest or booking ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className="booking-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="booking-filter-control">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by booking status"
            >
              <option value="all">All bookings</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="pending payment">Pending payment</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="booking-sort-control">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort bookings"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="checkin-asc">Check-in: Earliest</option>
              <option value="checkin-desc">Check-in: Latest</option>
              <option value="checkout-asc">Check-out: Earliest</option>
              <option value="checkout-desc">Check-out: Latest</option>
              <option value="customer-asc">Customer: A–Z</option>
              <option value="amount-high">Amount: Highest</option>
              <option value="amount-low">Amount: Lowest</option>
            </select>
          </div>
        </div>

        <div className="booking-results-info">
          <span>
            Showing <strong>{filteredBookings.length}</strong> of{" "}
            <strong>{bookings.length}</strong> reservations
          </span>
        </div>

        {loading ? (
          <div className="booking-message">Loading bookings...</div>
        ) : error ? (
          <div className="booking-error">
            <p>{error}</p>
            <button type="button" onClick={fetchBookings}>
              Try Again
            </button>
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
                      <td data-label="Booking Reference">
                        <strong className="booking-reference">
                          {booking.bookingReference || "—"}
                        </strong>
                      </td>

                      <td data-label="Customer">
                        <div className="booking-customer">
                          <strong>{booking.userId?.name || "Unknown"}</strong>
                          <small>{booking.userId?.email || "No email"}</small>
                        </div>
                      </td>

                      <td data-label="Check-in">
                        {formatDate(booking.checkIn)}
                      </td>

                      <td data-label="Check-out">
                        {formatDate(booking.checkOut)}
                      </td>

                      <td data-label="Guests">{booking.numberOfGuests ?? 0}</td>

                      <td data-label="Total Amount">
                        <strong className="booking-amount">
                          {formatCurrency(booking.totalAmount)}
                        </strong>
                      </td>

                      <td data-label="Payment">
                        <span className="booking-payment">
                          {booking.paymentStatus || "Unknown"}
                        </span>
                      </td>

                      <td data-label="Status">
                        <span
                          className={`booking-status ${normalizeStatus(
                            booking.bookingStatus,
                          ).replaceAll(" ", "-")}`}
                        >
                          {booking.bookingStatus || "Unknown"}
                        </span>
                      </td>

                      <td data-label="Action">
                        <button
                          type="button"
                          className="booking-view-button"
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
                    <td colSpan="9" className="booking-empty">
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Booking;
