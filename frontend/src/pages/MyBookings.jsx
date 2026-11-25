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

  return (
    <article className="mb-card">
      <header className="mb-card-head">
        <div>
          <p className="mb-ref">{booking.bookingReference}</p>
          <h2 className="mb-dates">{formatLong(booking.checkInDateKey)}</h2>
        </div>
        <span className={`mb-badge mb-badge--${booking.bookingStatus}`}>
          {BOOKING_LABELS[booking.bookingStatus] || booking.bookingStatus}
        </span>
      </header>

      <dl className="mb-grid">
        <div>
          <dt>Check-in</dt>
          <dd>{CHECK_IN_LABEL}</dd>
        </div>
        <div>
          <dt>Check-out</dt>
          <dd>
            {formatLong(checkOutKey)}, {CHECK_OUT_LABEL}
          </dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{booking.numberOfGuests}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>
            {PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus}
          </dd>
        </div>
      </dl>

      <div className="mb-amounts">
        <div>
          <span>Total</span>
          <strong>{peso(booking.totalAmount)}</strong>
        </div>
        <div>
          <span>Downpayment</span>
          <strong>{peso(booking.downpaymentAmount)}</strong>
        </div>
        <div>
          <span>Balance</span>
          <strong>{peso(booking.remainingBalance)}</strong>
        </div>
      </div>

      {canPayDown && booking.expiresAt && (
        <HoldTimer expiresAt={booking.expiresAt} onExpire={onExpire} />
      )}

      {(canPayDown || canPayBalance || canCancel) && (
        <footer className="mb-actions">
          {(canPayDown || canPayBalance) && (
            <div className="mb-pay">
              <span className="mb-pay-label">
                {canPayDown
                  ? `Pay ${peso(booking.downpaymentAmount)} downpayment`
                  : `Pay ${peso(booking.remainingBalance)} balance`}
              </span>
              <button
                type="button"
                className="mb-btn mb-btn--primary"
                disabled={busy}
                onClick={() =>
                  onPay(
                    booking,
                    "GCash",
                    canPayDown ? "downpayment" : "balance",
                  )
                }
              >
                GCash
              </button>
              <button
                type="button"
                className="mb-btn mb-btn--primary"
                disabled={busy}
                onClick={() =>
                  onPay(booking, "Maya", canPayDown ? "downpayment" : "balance")
                }
              >
                Maya
              </button>
            </div>
          )}

          {canCancel &&
            (confirming ? (
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
            ))}
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
