import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMyBookings,
  cancelBooking,
  createPayment,
} from "../services/bookingApi";
import {
  CHECK_IN_LABEL,
  CHECK_OUT_LABEL,
  KEYS,
  addDays,
  formatLong,
  formatTimeLeft,
  peso,
  writeJson,
} from "../services/bookingUtils";
import "./MyBooking.css";

const BOOKING_LABELS = {
  pending: "Awaiting downpayment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const PAYMENT_LABELS = {
  unpaid: "Unpaid",
  partial: "Downpayment paid",
  fully_paid: "Fully paid",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const isUpcoming = (b) => ["pending", "confirmed"].includes(b.bookingStatus);

const secondsLeft = (expiresAt) =>
  expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
    : 0;

// DESIGN: date helpers for the bento tiles (display only)
const parseKey = (key) => {
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const monthDay = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// "Nov 28 – 29" + "2026"
function stayRange(inKey, outKey) {
  const a = parseKey(inKey);
  const b = parseKey(outKey);
  if (!a || !b) return { main: formatLong(inKey), year: "" };

  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const main = sameMonth
    ? `${monthDay(a)} – ${b.getDate()}`
    : `${monthDay(a)} – ${monthDay(b)}`;
  const year =
    a.getFullYear() === b.getFullYear()
      ? `${a.getFullYear()}`
      : `${a.getFullYear()} – ${b.getFullYear()}`;
  return { main, year };
}

// "Sat, Nov 28"
function shortDay(key) {
  const d = parseKey(key);
  return d
    ? d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : formatLong(key);
}

// DESIGN: small icons for the tiles
function TileIcon({ children }) {
  return (
    <span className="mb-tile-icon" aria-hidden="true">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

const LoginIcon = () => (
  <TileIcon>
    <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
    <path d="M4 12h10M10 8l4 4-4 4" />
  </TileIcon>
);

const LogoutIcon = () => (
  <TileIcon>
    <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" />
    <path d="M10 12h10M16 8l4 4-4 4" />
  </TileIcon>
);

function UsersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.2 3.2 0 010 6.2M18 14.3c1.7.8 3 2.7 3 5.7" />
    </svg>
  );
}

// DESIGN: new back button (UI only)
function BackLink() {
  return (
    <Link to="/" className="mb-back">
      <span className="mb-back-icon" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </span>
      Back to home
    </Link>
  );
}

function HoldTimer({ expiresAt, onExpire }) {
  const [left, setLeft] = useState(() => secondsLeft(expiresAt));

  useEffect(() => {
    const id = setInterval(() => {
      const next = secondsLeft(expiresAt);
      setLeft(next);
      if (next === 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return (
    <p className="mb-hold">
      Date held for <strong>{formatTimeLeft(left)}</strong>. Pay the downpayment
      before it runs out.
    </p>
  );
}

function BookingCard({ booking, busyId, onCancel, onPay, onExpire }) {
  const [confirming, setConfirming] = useState(false);
  const busy = busyId === booking._id;

  const isPending = booking.bookingStatus === "pending";
  const canPayDown = isPending && booking.paymentStatus === "unpaid";
  const canPayBalance =
    booking.bookingStatus === "confirmed" &&
    booking.paymentStatus === "partial";
  const canCancel = isUpcoming(booking);

  const checkOutKey = addDays(booking.checkInDateKey, 1);

  // DESIGN: display values for the bento tiles
  const range = stayRange(booking.checkInDateKey, checkOutKey);
  const rangeText = range.year ? `${range.main}, ${range.year}` : range.main;
  const guests = Number(booking.numberOfGuests);
  const guestsText = `${booking.numberOfGuests} ${guests === 1 ? "guest" : "guests"}`;
  const statusLabel =
    BOOKING_LABELS[booking.bookingStatus] || booking.bookingStatus;

  const total = Number(booking.totalAmount) || 0;
  const paid =
    booking.paymentStatus === "fully_paid"
      ? total
      : booking.paymentStatus === "partial"
        ? Number(booking.downpaymentAmount) || 0
        : 0;
  const percent =
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const isPaid = booking.paymentStatus === "fully_paid";
  const payLabel = canPayDown
    ? "Downpayment due"
    : canPayBalance
      ? "Balance due"
      : isPaid
        ? "Fully paid"
        : PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus;
  const payAmount = canPayDown
    ? peso(booking.downpaymentAmount)
    : canPayBalance
      ? peso(booking.remainingBalance)
      : peso(booking.totalAmount);
  const payPurpose = canPayDown ? "downpayment" : "balance";

  // DESIGN: cancelled / expired stay compact (header only)
  if (["cancelled", "expired"].includes(booking.bookingStatus)) {
    return (
      <article className={`mb-card mb-card--${booking.bookingStatus}`}>
        <header className="mb-card-head">
          <div>
            <p className="mb-ref">{booking.bookingReference}</p>
            <h2 className="mb-dates">{rangeText}</h2>
          </div>
          <span className={`mb-badge mb-badge--${booking.bookingStatus}`}>
            {statusLabel}
          </span>
        </header>
      </article>
    );
  }

  return (
    <article className={`mb-card mb-card--${booking.bookingStatus}`}>
      {/* DESIGN: bento grid */}
      <div className="mb-bento">
        {/* Date tile */}
        <div className="mb-tile mb-tile--date">
          <div>
            <span className={`mb-badge mb-badge--${booking.bookingStatus}`}>
              {statusLabel}
            </span>
            <h2 className="mb-dates">{range.main}</h2>
            <p className="mb-tile-sub">
              {range.year ? `${range.year} · ` : ""}1 night
            </p>
          </div>
          <div>
            <p className="mb-guests">
              <UsersIcon />
              {guestsText}
            </p>
            <p className="mb-ref">{booking.bookingReference}</p>
          </div>
        </div>

        {/* Check-in tile */}
        <div className="mb-tile mb-tile--info">
          <LoginIcon />
          <span className="mb-tile-label">Check-in</span>
          <strong className="mb-tile-value">
            {shortDay(booking.checkInDateKey)}
          </strong>
          <span className="mb-tile-sub">{CHECK_IN_LABEL}</span>
        </div>

        {/* Check-out tile */}
        <div className="mb-tile mb-tile--info">
          <LogoutIcon />
          <span className="mb-tile-label">Check-out</span>
          <strong className="mb-tile-value">{shortDay(checkOutKey)}</strong>
          <span className="mb-tile-sub">{CHECK_OUT_LABEL}</span>
        </div>

        {/* Payment tile */}
        <div className={`mb-tile mb-tile--pay${isPaid ? " is-paid" : ""}`}>
          <div className="mb-paytile-main">
            <span className="mb-tile-label">{payLabel}</span>
            <strong className="mb-paytile-amount">{payAmount}</strong>
            <div className="mb-progress" aria-hidden="true">
              <span style={{ width: `${percent}%` }} />
            </div>
            <span className="mb-paytile-note">
              {peso(paid)} paid of {peso(total)}
            </span>
          </div>

          {(canPayDown || canPayBalance) && (
            <div className="mb-paytile-btns" role="group" aria-label="Pay with">
              <button
                type="button"
                className="mb-paybtn"
                disabled={busy}
                onClick={() => onPay(booking, "GCash", payPurpose)}
              >
                GCash
              </button>
              <button
                type="button"
                className="mb-paybtn"
                disabled={busy}
                onClick={() => onPay(booking, "Maya", payPurpose)}
              >
                Maya
              </button>
            </div>
          )}
        </div>
      </div>

      {canPayDown && booking.expiresAt && (
        <HoldTimer expiresAt={booking.expiresAt} onExpire={onExpire} />
      )}

      {canCancel && (
        <footer className="mb-actions">
          {confirming ? (
            <div className="mb-confirm">
              <span>Cancel this booking?</span>
              <button
                type="button"
                className="mb-btn mb-btn--danger"
                disabled={busy}
                onClick={() => onCancel(booking._id)}
              >
                Yes, cancel
              </button>
              <button
                type="button"
                className="mb-btn"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mb-btn mb-btn--ghost"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Cancel booking
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      setBookings(await getMyBookings());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, load]);

  const handleCancel = async (bookingId) => {
    setBusyId(bookingId);
    setError("");
    setNotice("");
    try {
      await cancelBooking(bookingId);
      setNotice("Your booking was cancelled.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handlePay = async (booking, paymentMethod, paymentPurpose) => {
    setBusyId(booking._id);
    setError("");
    setNotice("");
    try {
      const data = await createPayment({
        bookingId: booking._id,
        paymentMethod,
        paymentPurpose,
      });

      const redirectUrl = data.nextAction?.redirect?.url;
      if (!redirectUrl)
        throw new Error("Couldn’t start the payment. Try again.");

      // Same sessionStorage key the booking flow uses, so PaymentResult can pick it up
      writeJson(KEYS.payment, data.payment);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err.message);
      setBusyId(null);
      // An "already processing" conflict may mean the booking changed, so refresh
      if (err.code === "conflict") load();
    }
  };

  const visible = bookings.filter((b) =>
    filter === "all"
      ? true
      : filter === "upcoming"
        ? isUpcoming(b)
        : !isUpcoming(b),
  );

  if (authLoading || loading) {
    return (
      <main className="mb-page">
        <div className="mb-wrap">
          <p className="mb-state">Loading your bookings…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mb-page">
        <div className="mb-wrap">
          <h1 className="mb-title">My bookings</h1>
          <p className="mb-state">Log in to see your bookings.</p>
          <Link to="/" className="mb-btn mb-btn--primary">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mb-page">
      <div className="mb-wrap">
        <BackLink />
        <p className="mb-eyebrow">Your reservations</p>
        <h1 className="mb-title">My bookings</h1>

        <div className="mb-filters" role="tablist" aria-label="Filter bookings">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`mb-filter${filter === f.id ? " is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-alert mb-alert--error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="mb-alert mb-alert--ok">{notice}</p>}

        {visible.length === 0 ? (
          <div className="mb-empty">
            <p className="mb-state">
              {bookings.length === 0
                ? "You haven’t booked a stay yet."
                : "No bookings in this view."}
            </p>
            {bookings.length === 0 && (
              <Link to="/#book" className="mb-btn mb-btn--primary">
                Book your stay
              </Link>
            )}
          </div>
        ) : (
          <div className="mb-list">
            {visible.map((b) => (
              <BookingCard
                key={b._id}
                booking={b}
                busyId={busyId}
                onCancel={handleCancel}
                onPay={handlePay}
                onExpire={load}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
