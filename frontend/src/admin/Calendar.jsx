import { useEffect, useMemo, useState } from "react";
import "./Calendar.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

/* ---------- Outline icons (same style as the sidebar) ---------- */

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const BookedIcon = () => (
  <svg {...iconProps} className="summary-icon">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

const AvailableIcon = () => (
  <svg {...iconProps} className="summary-icon">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const BlockedIcon = () => (
  <svg {...iconProps} className="summary-icon">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const EmptyCalendarIcon = () => (
  <svg {...iconProps} width={22} height={22}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

/* ---------- Helpers ---------- */

const getLocalDate = (value) => {
  if (!value) return null;

  const dateString = String(value).slice(0, 10);
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const formatDate = (date) =>
  date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const sameDay = (first, second) =>
  first && second && dateKey(first) === dateKey(second);

const isActiveBooking = (booking) => {
  const status = String(booking.bookingStatus || "").toLowerCase();

  return !["expired", "cancelled", "canceled", "rejected"].includes(status);
};

const Calendar = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState([]);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("Maintenance");
  const [saving, setSaving] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      setError(err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const response = await fetch(`${API_URL}/blocked-dates`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch blocked dates.");
      }

      setBlockedDates(data.blockedDates || []);
    } catch (err) {
      setError(err.message || "Unable to load blocked dates.");
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchBlockedDates();
  }, []);

  const activeBookings = useMemo(
    () => bookings.filter(isActiveBooking),
    [bookings],
  );

  const getBookingsForDate = (date) => {
    return activeBookings.filter((booking) => {
      const checkIn = getLocalDate(booking.checkIn);
      const checkOut = getLocalDate(booking.checkOut);

      return checkIn && checkOut && date >= checkIn && date < checkOut;
    });
  };

  const getCheckIns = (date) => {
    return activeBookings.filter((booking) =>
      sameDay(getLocalDate(booking.checkIn), date),
    );
  };

  const getCheckOuts = (date) => {
    return activeBookings.filter((booking) =>
      sameDay(getLocalDate(booking.checkOut), date),
    );
  };

  const getBlockedDate = (date) => {
    return blockedDates.find(
      (blocked) =>
        date >= getLocalDate(blocked.startDate) &&
        date <= getLocalDate(blocked.endDate),
    );
  };

  const isBooked = (date) => getBookingsForDate(date).length > 0;

  const isBlocked = (date) => Boolean(getBlockedDate(date));

  const getDayStatus = (date) => {
    if (date < today) return "past";
    if (isBlocked(date)) return "blocked";
    if (isBooked(date)) return "booked";
    return "available";
  };

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const monthStats = useMemo(() => {
    let booked = 0;
    let blocked = 0;
    let available = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );

      const status = getDayStatus(date);

      if (status === "booked") booked++;
      else if (status === "blocked") blocked++;
      else if (status !== "past") available++;
    }

    return { booked, blocked, available };
  }, [currentMonth, bookings, blockedDates]);

  const upcomingEvents = useMemo(() => {
    const events = [];

    activeBookings.forEach((booking) => {
      const checkIn = getLocalDate(booking.checkIn);
      const checkOut = getLocalDate(booking.checkOut);

      if (checkIn && checkIn >= today) {
        events.push({
          type: "check-in",
          date: checkIn,
          booking,
        });
      }

      if (checkOut && checkOut >= today) {
        events.push({
          type: "check-out",
          date: checkOut,
          booking,
        });
      }
    });

    return events.sort((a, b) => a.date - b.date).slice(0, 6);
  }, [activeBookings]);

  const selectedBookings = getBookingsForDate(selectedDate);
  const selectedCheckIns = getCheckIns(selectedDate);
  const selectedCheckOuts = getCheckOuts(selectedDate);
  const selectedBlocked = getBlockedDate(selectedDate);

  const changeMonth = (amount) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1),
    );
  };

  const openBlockModal = () => {
    setBlockStart(dateKey(selectedDate));
    setBlockEnd(dateKey(selectedDate));
    setBlockReason("Maintenance");
    setShowBlockModal(true);
  };

  const handleBlockDates = async (e) => {
    e.preventDefault();

    if (!blockStart || !blockEnd) return;

    const start = getLocalDate(blockStart);
    const end = getLocalDate(blockEnd);

    if (!start || !end || start > end) {
      alert("Please select a valid date range.");
      return;
    }

    if (start < today) {
      alert("You cannot block past dates.");
      return;
    }

    const hasBooking = activeBookings.some((booking) => {
      const checkIn = getLocalDate(booking.checkIn);
      const checkOut = getLocalDate(booking.checkOut);

      return checkIn && checkOut && start < checkOut && end >= checkIn;
    });

    if (hasBooking) {
      alert("The selected dates overlap with an existing reservation.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/blocked-dates`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: blockStart,
          endDate: blockEnd,
          reason: blockReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to block dates.");
      }

      setBlockedDates((previous) => [...previous, data.blockedDate]);
      setSelectedDate(start);
      setShowBlockModal(false);
    } catch (err) {
      alert(err.message || "Unable to block dates.");
    } finally {
      setSaving(false);
    }
  };

  const removeBlockedDate = async (id) => {
    try {
      const response = await fetch(`${API_URL}/blocked-dates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove block.");
      }

      setBlockedDates((previous) =>
        previous.filter((blocked) => blocked._id !== id),
      );
    } catch (err) {
      alert(err.message || "Unable to remove block.");
    }
  };

  const getGuestName = (booking) => booking.userId?.name || "Unknown guest";

  return (
    <div className="admin-calendar-page">
      <div className="calendar-page-header">
        <div>
          <p className="calendar-eyebrow">PROPERTY MANAGEMENT</p>
          <h1>Calendar</h1>
          <p className="calendar-page-description">
            Manage reservations and property availability.
          </p>
        </div>

        <button className="calendar-block-button" onClick={openBlockModal}>
          <span>+</span> Block dates
        </button>
      </div>

      <div className="calendar-summary">
        <div className="calendar-summary-card">
          <div>
            <p>Booked days</p>
            <h3>{monthStats.booked}</h3>
          </div>
          <BookedIcon />
        </div>

        <div className="calendar-summary-card">
          <div>
            <p>Available days</p>
            <h3>{monthStats.available}</h3>
          </div>
          <AvailableIcon />
        </div>

        <div className="calendar-summary-card">
          <div>
            <p>Blocked days</p>
            <h3>{monthStats.blocked}</h3>
          </div>
          <BlockedIcon />
        </div>
      </div>

      {error && (
        <div className="calendar-error">
          <span>{error}</span>
          <button onClick={fetchBookings}>Try again</button>
        </div>
      )}

      <div className="calendar-main-grid">
        <section className="calendar-panel">
          <div className="calendar-panel-header">
            <div>
              <h2>Reservation calendar</h2>
              <p>View and manage your property's availability.</p>
            </div>

            <button
              className="calendar-today-button"
              onClick={() => {
                setCurrentMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                setSelectedDate(new Date(today));
              }}
            >
              Today
            </button>
          </div>

          <div className="calendar-month-navigation">
            <button aria-label="Previous month" onClick={() => changeMonth(-1)}>
              ‹
            </button>

            <h3>
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>

            <button aria-label="Next month" onClick={() => changeMonth(1)}>
              ›
            </button>
          </div>

          {loading ? (
            <div className="calendar-loading">
              Loading reservation calendar...
            </div>
          ) : (
            <>
              <div className="calendar-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div key={day}>{day}</div>
                  ),
                )}
              </div>

              <div className="calendar-days-grid">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        className="calendar-day empty-day"
                        key={`empty-${index}`}
                      />
                    );
                  }

                  const date = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day,
                  );

                  const status = getDayStatus(date);
                  const isSelected = sameDay(date, selectedDate);
                  const isToday = sameDay(date, today);
                  const reservations = getBookingsForDate(date);
                  const checkIns = getCheckIns(date);
                  const checkOuts = getCheckOuts(date);

                  return (
                    <button
                      type="button"
                      key={day}
                      className={`calendar-day ${status} ${
                        isSelected ? "selected-day" : ""
                      } ${isToday ? "today-day" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="calendar-day-number">{day}</span>

                      {reservations.length > 0 && (
                        <span className="day-indicator">
                          {reservations.length} booked
                        </span>
                      )}

                      {status === "blocked" && (
                        <span className="day-indicator">Blocked</span>
                      )}

                      {(checkIns.length > 0 || checkOuts.length > 0) && (
                        <span className="day-event-indicator">
                          {checkIns.length > 0 && "In "}
                          {checkOuts.length > 0 && "Out"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="calendar-legend">
            <span>
              <i className="legend-dot available-dot" /> Available
            </span>
            <span>
              <i className="legend-dot booked-dot" /> Booked
            </span>
            <span>
              <i className="legend-dot blocked-dot" /> Blocked
            </span>
            <span>
              <i className="legend-dot past-dot" /> Past date
            </span>
          </div>
        </section>

        <aside className="calendar-side-panel">
          <section className="calendar-detail-card">
            <div className="side-panel-heading">
              <div>
                <p className="side-panel-eyebrow">SELECTED DATE</p>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <span className={`date-status ${getDayStatus(selectedDate)}`}>
                {getDayStatus(selectedDate)}
              </span>
            </div>

            {selectedBlocked ? (
              <div className="selected-date-content">
                <div className="detail-notice blocked-notice">
                  <strong>This date is blocked</strong>
                  <span>{selectedBlocked.reason}</span>
                  <button
                    onClick={() => removeBlockedDate(selectedBlocked._id)}
                  >
                    Remove block
                  </button>
                </div>
              </div>
            ) : (
              <>
                {selectedBookings.length > 0 ? (
                  <div className="selected-date-content">
                    <h3>Reservations</h3>

                    {selectedBookings.map((booking) => (
                      <div className="selected-booking-item" key={booking._id}>
                        <strong>{getGuestName(booking)}</strong>
                        <span>{booking.bookingReference}</span>
                        <small>
                          {formatDate(getLocalDate(booking.checkIn))} –{" "}
                          {formatDate(getLocalDate(booking.checkOut))}
                        </small>
                        <small>{booking.numberOfGuests} guests</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-date-message">
                    <span className="empty-calendar-icon">
                      <EmptyCalendarIcon />
                    </span>
                    <strong>No reservations</strong>
                    <p>
                      {selectedDate < today
                        ? "This date has already passed."
                        : "There are no reservations for this date."}
                    </p>
                  </div>
                )}

                {selectedCheckIns.length > 0 && (
                  <div className="date-event-group">
                    <h3>Check-ins</h3>
                    {selectedCheckIns.map((booking) => (
                      <div className="date-event-item" key={booking._id}>
                        <span className="event-dot checkin-dot" />
                        <div>
                          <strong>{getGuestName(booking)}</strong>
                          <small>{booking.bookingReference}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCheckOuts.length > 0 && (
                  <div className="date-event-group">
                    <h3>Check-outs</h3>
                    {selectedCheckOuts.map((booking) => (
                      <div className="date-event-item" key={booking._id}>
                        <span className="event-dot checkout-dot" />
                        <div>
                          <strong>{getGuestName(booking)}</strong>
                          <small>{booking.bookingReference}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDate >= today && !isBooked(selectedDate) && (
                  <button
                    className="side-block-button"
                    onClick={openBlockModal}
                  >
                    + Block this date
                  </button>
                )}
              </>
            )}
          </section>

          <section className="calendar-upcoming-card">
            <div className="upcoming-heading">
              <div>
                <h2>Upcoming reservations</h2>
                <p>Guest arrivals and departures</p>
              </div>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="upcoming-event-list">
                {upcomingEvents.map((event, index) => (
                  <div
                    className="upcoming-event"
                    key={`${event.booking._id}-${event.type}-${index}`}
                  >
                    <div className="upcoming-event-date">
                      <strong>{event.date.getDate()}</strong>
                      <span>
                        {event.date.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                    </div>

                    <div className="upcoming-event-info">
                      <strong>{getGuestName(event.booking)}</strong>
                      <small>{event.booking.bookingReference}</small>
                      <span>
                        {event.type === "check-in" ? "Check-in" : "Check-out"}
                      </span>
                    </div>

                    <span className={`upcoming-event-tag ${event.type}`}>
                      {event.type === "check-in" ? "IN" : "OUT"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="upcoming-empty">No upcoming reservations.</div>
            )}
          </section>
        </aside>
      </div>

      {showBlockModal && (
        <div
          className="calendar-modal-overlay"
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="calendar-block-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-modal-header">
              <div>
                <p>PROPERTY AVAILABILITY</p>
                <h2>Block dates</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <p className="calendar-modal-description">
              Select the dates you want to make unavailable for reservations.
            </p>

            <form onSubmit={handleBlockDates}>
              <div className="calendar-modal-field">
                <label htmlFor="block-start">Start date</label>
                <input
                  id="block-start"
                  type="date"
                  min={dateKey(today)}
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  required
                />
              </div>

              <div className="calendar-modal-field">
                <label htmlFor="block-end">End date</label>
                <input
                  id="block-end"
                  type="date"
                  min={blockStart || dateKey(today)}
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  required
                />
              </div>

              <div className="calendar-modal-field">
                <label htmlFor="block-reason">Reason</label>
                <select
                  id="block-reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                >
                  <option>Maintenance</option>
                  <option>Private use</option>
                  <option>Cleaning</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="calendar-modal-actions">
                <button
                  type="button"
                  className="calendar-cancel-button"
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="calendar-confirm-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Confirm block dates"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
