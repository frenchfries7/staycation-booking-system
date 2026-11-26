import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Overview.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Icon = ({ name, size = 20 }) => {
  const icons = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 15 2 2 4-4" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 9h18M16 15h.01M3 5V4a2 2 0 0 1 2-2h14" />
      </>
    ),
    bed: (
      <>
        <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
        <path d="M3 14h18M5 9V6a2 2 0 0 1 2-2h3v5M14 9V4h3a2 2 0 0 1 2 2v3" />
        <path d="M3 18v2M21 18v2" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 9h20" />
      </>
    ),
    home: (
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: (
      <>
        <path d="M7 17 17 7M7 7h10v10" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
};

const formatCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getGuestName = (booking) =>
  booking.userId?.name ||
  booking.userId?.fullName ||
  booking.userId?.email ||
  "Unknown guest";

const getPaymentStatus = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (["fully_paid", "paid"].includes(normalized)) return "Paid";
  if (normalized === "partial") return "Partial";
  if (normalized.includes("pending")) return "Pending";
  if (normalized === "unpaid") return "Unpaid";

  return status || "Unknown";
};

const normalizeStatus = (status) =>
  String(status || "pending")
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");

const getBookingStatus = (status) =>
  String(status || "Pending").replaceAll("_", " ");

const Overview = () => {
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date();

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
        throw new Error(data.message || "Failed to fetch bookings.");
      }

      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const stats = useMemo(() => {
    const monthlyBookings = bookings.filter((booking) => {
      const date = new Date(booking.checkIn);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });

    const monthlyRevenue = monthlyBookings
      .filter((booking) =>
        ["fully_paid", "paid"].includes(
          String(booking.paymentStatus || "").toLowerCase(),
        ),
      )
      .reduce((total, booking) => total + Number(booking.totalAmount || 0), 0);

    const pendingBookings = bookings.filter((booking) =>
      ["unpaid", "pending", "pending payment"].includes(
        String(booking.paymentStatus || "").toLowerCase(),
      ),
    );

    const pendingAmount = pendingBookings.reduce(
      (total, booking) => total + Number(booking.totalAmount || 0),
      0,
    );

    return {
      totalBookings: bookings.length,
      monthlyRevenue,
      pendingAmount,
      pendingCount: pendingBookings.length,
    };
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.checkIn).getTime() -
          new Date(a.createdAt || a.checkIn).getTime(),
      )
      .slice(0, 5);
  }, [bookings]);

  const todaysSchedule = useMemo(() => {
    const todayString = today.toDateString();
    const schedule = [];

    bookings.forEach((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      if (
        !Number.isNaN(checkIn.getTime()) &&
        checkIn.toDateString() === todayString
      ) {
        schedule.push({
          id: `${booking._id}-checkin`,
          type: "Check-in",
          description: "Guest arrival",
          reference: booking.bookingReference,
          guest: getGuestName(booking),
          date: checkIn,
          badge: "Expected",
        });
      }

      if (
        !Number.isNaN(checkOut.getTime()) &&
        checkOut.toDateString() === todayString
      ) {
        schedule.push({
          id: `${booking._id}-checkout`,
          type: "Check-out",
          description: "Guest departure",
          reference: booking.bookingReference,
          guest: getGuestName(booking),
          date: checkOut,
          badge: "Due",
        });
      }
    });

    return schedule.sort((a, b) => a.date - b.date);
  }, [bookings]);

  const adminName =
    user?.name || user?.fullName || user?.email || "Administrator";

  const profileImage =
    user?.profilePicture ||
    user?.profileImage ||
    user?.avatar ||
    user?.photoURL ||
    user?.picture ||
    user?.image;

  const initials = adminName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="overview-page">
      <header className="overview-header">
        <div>
          <p className="overview-eyebrow">PROPERTY MANAGEMENT</p>
          <h1>Overview</h1>
        </div>

        <div className="overview-header-actions">
          <button
            type="button"
            className="overview-notification"
            aria-label="Notifications"
          >
            <Icon name="bell" />
          </button>

          <div className="overview-header-avatar">
            {profileImage ? (
              <img
                src={profileImage}
                alt={adminName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </div>
      </header>

      <section className="overview-welcome">
        <div className="overview-welcome-content">
          <p className="overview-date">
            {today
              .toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              .toUpperCase()}
          </p>

          <h2>Your stay, in good hands.</h2>
          <p>Here's what's happening with your property today.</p>
        </div>

        <div className="overview-welcome-icon">
          <Icon name="home" size={46} />
        </div>
      </section>

      {error && (
        <div className="overview-error">
          <span>{error}</span>
          <button type="button" onClick={fetchBookings}>
            Try again
          </button>
        </div>
      )}

      <section className="overview-stats">
        <div className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Total bookings</span>
            <Icon name="calendar" />
          </div>
          <h3>{loading ? "—" : stats.totalBookings}</h3>
          <p>All recorded reservations</p>
        </div>

        <div className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Monthly revenue</span>
            <Icon name="wallet" />
          </div>
          <h3>{loading ? "—" : formatCurrency(stats.monthlyRevenue)}</h3>
          <p>Fully paid bookings this month</p>
        </div>

        <div className="overview-stat-card">
          <div className="overview-stat-top">
            <span>Pending payments</span>
            <Icon name="card" />
          </div>
          <h3>{loading ? "—" : formatCurrency(stats.pendingAmount)}</h3>
          <p>{stats.pendingCount} reservations</p>
        </div>
      </section>

      <section className="overview-bottom-grid">
        <div className="overview-panel recent-bookings-panel">
          <div className="overview-panel-header">
            <div>
              <h2>Recent bookings</h2>
              <p>Latest reservation activity</p>
            </div>

            <Link to="/admin/booking" className="overview-view-all">
              View all <Icon name="arrow" size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="overview-empty">Loading bookings...</div>
          ) : recentBookings.length === 0 ? (
            <div className="overview-empty">No bookings available yet.</div>
          ) : (
            <div className="overview-table-wrapper">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Stay</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {recentBookings.map((booking) => (
                    <tr key={booking._id}>
                      <td data-label="Booking">
                        <strong className="overview-booking-reference">
                          {booking.bookingReference || "No reference"}
                        </strong>
                        <span
                          className={`overview-status ${normalizeStatus(
                            booking.bookingStatus,
                          )}`}
                        >
                          {getBookingStatus(booking.bookingStatus)}
                        </span>
                      </td>

                      <td data-label="Customer">
                        <div className="overview-guest">
                          <strong>{getGuestName(booking)}</strong>
                          <small>{booking.userId?.email || "No email"}</small>
                          <small>Guests: {booking.numberOfGuests ?? 0}</small>
                        </div>
                      </td>

                      <td data-label="Stay">
                        <div className="overview-stay">
                          <span>
                            <em>In</em> {formatDate(booking.checkIn)}
                          </span>
                          <span>
                            <em>Out</em> {formatDate(booking.checkOut)}
                          </span>
                        </div>
                      </td>

                      <td data-label="Amount">
                        <strong className="overview-total">
                          {formatCurrency(booking.totalAmount)}
                        </strong>
                        <span className="overview-payment">
                          {getPaymentStatus(booking.paymentStatus)}
                        </span>
                      </td>

                      <td data-label="Action">
                        <Link
                          to="/admin/booking"
                          className="overview-action-link"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overview-panel schedule-panel">
          <div className="overview-panel-header">
            <div>
              <h2>Today's schedule</h2>
              <p>{formatDate(today)}</p>
            </div>
          </div>

          {loading ? (
            <div className="overview-empty">Loading schedule...</div>
          ) : todaysSchedule.length > 0 ? (
            <div className="overview-schedule-list">
              {todaysSchedule.map((item) => (
                <div className="overview-schedule-item" key={item.id}>
                  <div className="overview-schedule-time">{item.type}</div>

                  <div className="overview-schedule-details">
                    <strong>{item.description}</strong>
                    <span>
                      {item.guest} · {item.reference || "No reference"}
                    </span>
                  </div>

                  <span
                    className={`overview-schedule-badge ${
                      item.badge === "Due" ? "due" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="overview-empty">
              No check-ins or check-outs scheduled for today.
            </div>
          )}

          <div className="overview-reminder">
            <Icon name="clock" size={18} />
            <p>Remember to update the unit's cleaning status after checkout.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Overview;
