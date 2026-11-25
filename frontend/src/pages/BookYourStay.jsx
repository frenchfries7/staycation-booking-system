import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  addPoolAccess,
  checkDateAvailability,
  createBooking,
  createPayment,
  getAccommodation,
} from "../services/bookingApi";
import {
  CHECK_IN_LABEL,
  CHECK_OUT_LABEL,
  FALLBACK_CAPACITY,
  FALLBACK_PRICE,
  HOLD_MINUTES,
  KEYS,
  STAY_HOURS,
  addDays,
  buildMonth,
  formatLong,
  formatTimeLeft,
  fromKey,
  getQuote,
  monthOf,
  peso,
  readJson,
  removeKey,
  todayKey,
  writeJson,
} from "../services/bookingUtils";
import "./BookYourStay.css";
import "./BookingModal.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const PAYMENT_METHODS = ["GCash", "Maya"];
const CACHE_MS = 60 * 1000; // how long a date's availability is trusted
const MAX_PARALLEL = 6; // availability checks sent at the same time

const monthIndex = ({ y, m }) => y * 12 + m;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ClockIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

// A reservation waiting for payment survives closing the modal or a page refresh
const loadPending = () => {
  const saved = readJson(KEYS.pending);
  if (!saved?.expiresAt || new Date(saved.expiresAt).getTime() <= Date.now()) {
    removeKey(KEYS.pending);
    return null;
  }
  return saved;
};

function useSecondsLeft(expiresAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

export default function BookYourStay({ onLoginClick }) {
  const { isLoggedIn, user } = useAuth();
  const today = todayKey();
  const [draft] = useState(() => readJson(KEYS.draft) || {});

  // Selection (a stay is always one night: check-out is the next day)
  const [checkIn, setCheckIn] = useState(draft.checkIn || "");
  const [guests, setGuests] = useState(draft.guests || 2);
  const [pool, setPool] = useState(Boolean(draft.pool));
  const [dateError, setDateError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [notice, setNotice] = useState("");
  const checkOut = checkIn ? addDays(checkIn, 1) : "";

  // Server data
  const [accommodation, setAccommodation] = useState(null);
  const price = accommodation?.price || FALLBACK_PRICE;
  const maxGuests = accommodation?.capacity || FALLBACK_CAPACITY;

  // Booked dates. The server only answers "is this one date free?", so we
  // check the dates of the month on screen and remember the answers briefly.
  const availability = useRef(new Map()); // dateKey -> { booked, at }
  const [booked, setBooked] = useState(() => new Set());
  const [checking, setChecking] = useState(false);

  const syncBooked = useCallback(() => {
    const set = new Set();
    availability.current.forEach((entry, key) => {
      if (entry.booked) set.add(key);
    });
    setBooked(set);
  }, []);

  const markBooked = useCallback(
    (key) => {
      availability.current.set(key, { booked: true, at: Date.now() });
      syncBooked();
    },
    [syncBooked],
  );

  const checkDates = useCallback(
    async (keys, { force = false } = {}) => {
      const nowKey = todayKey();
      const stale = keys.filter((k) => {
        if (k < nowKey) return false;
        const known = availability.current.get(k);
        return force || !known || Date.now() - known.at > CACHE_MS;
      });
      if (!stale.length) return;

      setChecking(true);
      let next = 0;
      const worker = async () => {
        while (next < stale.length) {
          const key = stale[next];
          next += 1;
          const isFree = await checkDateAvailability(key);
          if (isFree !== null) {
            availability.current.set(key, { booked: !isFree, at: Date.now() });
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(MAX_PARALLEL, stale.length) }, worker),
      );
      syncBooked();
      setChecking(false);
    },
    [syncBooked],
  );

  // Calendar
  const [view, setView] = useState(() =>
    monthOf(draft.checkIn && draft.checkIn >= today ? draft.checkIn : today),
  );

  // Reservation waiting for payment
  const [pending, setPending] = useState(loadPending);
  const secondsLeft = useSecondsLeft(pending?.expiresAt);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState("review"); // "review" -> "pay"
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState("GCash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ---------- Load data ----------
  useEffect(() => {
    let cancelled = false;
    getAccommodation().then((data) => {
      if (!cancelled && data) setAccommodation(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setGuests((g) => Math.min(g, maxGuests));
  }, [maxGuests]);

  // Clear the selected date if it became past or booked
  useEffect(() => {
    if (checkIn && (checkIn < today || booked.has(checkIn))) setCheckIn("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booked]);

  useEffect(() => {
    writeJson(KEYS.draft, { checkIn, guests, pool });
  }, [checkIn, guests, pool]);

  // The hold ran out before the guest paid
  useEffect(() => {
    if (pending && secondsLeft === 0) {
      const expiredDate = pending.checkIn;
      removeKey(KEYS.pending);
      setPending(null);
      setShowModal(false);
      setStep("review");
      setNotice(
        "Your reservation expired because the downpayment wasn’t received in time. You can book again.",
      );
      checkDates([expiredDate], { force: true });
    }
  }, [pending, secondsLeft, checkDates]);

  // ---------- Calendar rules ----------
  const isDisabled = (k) => k < today || booked.has(k);

  const handleDay = (k) => {
    setDateError("");
    setNotice("");
    if (isDisabled(k)) return;
    setCheckIn(k === checkIn ? "" : k);
  };

  const clearDates = () => {
    setCheckIn("");
    setDateError("");
  };

  const onCheckInInput = (value) => {
    setDateError("");
    setNotice("");
    if (!value) return setCheckIn("");
    if (value < today) return setDateError("Check-in can’t be in the past.");
    if (booked.has(value)) return setDateError("That date is already booked.");
    setCheckIn(value);
    setView(monthOf(value));
  };

  const changeGuests = (delta) =>
    setGuests((g) => Math.min(maxGuests, Math.max(1, g + delta)));

  // ---------- Month navigation ----------
  const currentIndex = monthIndex(monthOf(today));
  const canGoPrev = monthIndex(view) > currentIndex;
  const canGoNext = monthIndex(view) < currentIndex + 12;

  const goMonth = (delta) =>
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  const cells = useMemo(() => buildMonth(view.y, view.m), [view]);
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Check the dates of the month being shown
  useEffect(() => {
    checkDates(cells.filter(Boolean));
  }, [cells, checkDates]);

  // ---------- Price estimate ----------
  const quote = useMemo(
    () => getQuote({ checkIn, price, guests, pool }),
    [checkIn, price, guests, pool],
  );

  // ---------- Reserve flow ----------
  const handleReserve = () => {
    if (!quote || pending) return;
    if (!isLoggedIn) {
      setNeedLogin(true);
      onLoginClick?.();
      return;
    }
    setError("");
    setAgreed(false);
    setStep("review");
    setShowModal(true);
  };

  const openPayment = () => {
    setError("");
    setStep("pay");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setError("");
  };

  const handleAuthError = () => {
    setShowModal(false);
    setNeedLogin(true);
    onLoginClick?.();
  };

  const savePending = (value) => {
    writeJson(KEYS.pending, value);
    setPending(value);
  };

  // Adds the pool fee to a pending booking and returns it with the new amounts
  const applyPool = async (current) => {
    const data = await addPoolAccess(current.id);
    const updated = data.booking;
    return {
      ...current,
      poolApplied: true,
      poolFee: data.poolFee ?? 0,
      total: updated.totalAmount,
      downpayment: updated.downpaymentAmount,
      balance: updated.remainingBalance,
    };
  };

  // Step 1: create the booking (this holds the date for 15 minutes)
  const handleCreateBooking = async () => {
    if (!quote || !agreed || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      // Re-check right before booking, in case someone just took the date
      await checkDates([checkIn], { force: true });
      if (availability.current.get(checkIn)?.booked) {
        setError("Sorry, that date was just booked. Please pick another date.");
        return;
      }

      const booking = await createBooking({ checkIn, numberOfGuests: guests });

      let current = {
        id: booking._id,
        reference: booking.bookingReference,
        expiresAt: booking.expiresAt,
        checkIn,
        checkOut,
        guests,
        pool,
        poolApplied: false,
        poolFee: 0,
        total: booking.totalAmount,
        downpayment: booking.downpaymentAmount,
        balance: booking.remainingBalance,
      };
      savePending(current);

      // Add the pool fee before any payment starts
      if (pool) {
        try {
          current = await applyPool(current);
          savePending(current);
        } catch {
          // the payment step shows a warning with a retry button
        }
      }

      setNotice("");
      setStep("pay");
      markBooked(checkIn);
    } catch (err) {
      if (err.code === "unauthorized") handleAuthError();
      else if (err.code === "conflict") {
        markBooked(checkIn);
        setError("Sorry, that date was just taken. Please pick another date.");
      } else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPool = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      savePending(await applyPool(pending));
    } catch (err) {
      if (err.code === "unauthorized") handleAuthError();
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipPool = () => {
    setError("");
    savePending({ ...pending, pool: false, poolApplied: false });
  };

  // Step 2: start the GCash / Maya payment and go to the payment page
  const handlePay = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const data = await createPayment({
        bookingId: pending.id,
        paymentMethod: method,
      });

      const url = data.nextAction?.redirect?.url;
      if (!url || !data.payment?.paymentIntentId) {
        setError("We couldn’t open the payment page. Please try again.");
        return;
      }

      // Remember the payment so the result page can check it after you return
      writeJson(KEYS.payment, {
        paymentIntentId: data.payment.paymentIntentId,
        reference: pending.reference,
      });
      window.location.assign(url);
    } catch (err) {
      if (err.code === "unauthorized") handleAuthError();
      else {
        if (/expired/i.test(err.message)) {
          const expiredDate = pending.checkIn;
          removeKey(KEYS.pending);
          setPending(null);
          setStep("review");
          checkDates([expiredDate], { force: true });
        }
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Render ----------
  const tip = checkIn ? null : "Select your check-in date.";
  const poolUnresolved = Boolean(pending?.pool && !pending?.poolApplied);

  return (
    <section id="book" className="book">
      <div className="book__inner">
        <div className="book__layout">
          {/* ---------------- Left: calendar ---------------- */}
          <div className="book__left">
            <h3 className="book__title">Book your stay</h3>

            <div className="book__cal-head">
              <button
                type="button"
                className="book__nav"
                onClick={() => goMonth(-1)}
                disabled={!canGoPrev}
                aria-label="Previous month"
              >
                &lt;
              </button>
              <h4 className="book__month" aria-live="polite">
                {monthLabel}
              </h4>
              <button
                type="button"
                className="book__nav"
                onClick={() => goMonth(1)}
                disabled={!canGoNext}
                aria-label="Next month"
              >
                &gt;
              </button>
            </div>

            <div className="book__weekdays" aria-hidden="true">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="book__days">
              {cells.map((k, i) => {
                if (!k) return <div key={`empty-${i}`} />;

                const isStart = k === checkIn;
                const isEnd = k === checkOut;
                const past = k < today;
                const isBooked = booked.has(k) && !isEnd;
                const disabled = isDisabled(k) && !isEnd;

                const classes = [
                  "book__cell",
                  isStart && "is-start",
                  isStart && "has-after",
                  isEnd && "is-end",
                  isEnd && "has-before",
                  past && "is-past",
                  isBooked && "is-booked",
                  k === today && "is-today",
                ]
                  .filter(Boolean)
                  .join(" ");

                const status = past
                  ? "past date"
                  : isBooked
                    ? "booked"
                    : isEnd
                      ? "check-out"
                      : "available";

                return (
                  <div key={k} className={classes}>
                    <button
                      type="button"
                      className="book__day"
                      disabled={disabled}
                      onClick={() => handleDay(k)}
                      aria-pressed={isStart || isEnd}
                      aria-label={`${formatLong(k)}, ${status}`}
                    >
                      {fromKey(k).getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="book__legend">
              <span>
                <i className="dot dot--available" /> Available
              </span>
              <span>
                <i className="dot dot--booked" /> Booked
              </span>
              <span>
                <i className="dot dot--past" /> Past date
              </span>
            </div>

            <p className="book__tip" aria-live="polite">
              {tip || (
                <>
                  Check-in {CHECK_IN_LABEL}, check-out {CHECK_OUT_LABEL} the
                  next day ({STAY_HOURS} hours) ·{" "}
                  <button
                    type="button"
                    className="book__link"
                    onClick={clearDates}
                  >
                    Clear date
                  </button>
                </>
              )}
              {checking && (
                <span className="book__checking"> Checking availability…</span>
              )}
            </p>
          </div>

          {/* ---------------- Right: reservation card ---------------- */}
          <aside className="book__card">
            <p className="book__price">
              <strong>{peso(price)}</strong> <span>/ night</span>
            </p>

            <div className="book__fields">
              <label className="book__field">
                <span className="book__label">Check-in</span>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => onCheckInInput(e.target.value)}
                />
              </label>
              <label className="book__field book__field--auto">
                <span className="book__label">Check-out</span>
                <input type="date" value={checkOut} readOnly tabIndex={-1} />
              </label>
            </div>

            <div className="book__guests">
              <div>
                <span className="book__label">Guests</span>
                <span className="book__sub">{plural(guests, "Guest")}</span>
              </div>
              <div className="book__stepper">
                <button
                  type="button"
                  onClick={() => changeGuests(-1)}
                  disabled={guests <= 1}
                  aria-label="Decrease guests"
                >
                  −
                </button>
                <span aria-live="polite">{guests}</span>
                <button
                  type="button"
                  onClick={() => changeGuests(1)}
                  disabled={guests >= maxGuests}
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
            </div>
            {guests >= maxGuests && (
              <p className="book__note">Maximum of {maxGuests} guests.</p>
            )}

            <label className="book__check">
              <input
                type="checkbox"
                checked={pool}
                onChange={(e) => setPool(e.target.checked)}
              />
              <span>Avail pool Access</span>
            </label>

            {dateError && (
              <p className="book__error" role="alert">
                {dateError}
              </p>
            )}
            {notice && <p className="book__info">{notice}</p>}

            {pending ? (
              <div className="book__pending">
                <p>
                  Reservation <strong>{pending.reference}</strong> for{" "}
                  {formatLong(pending.checkIn)} is waiting for your{" "}
                  {peso(pending.downpayment)} downpayment.
                </p>
                <p className="book__timer">
                  {formatTimeLeft(secondsLeft)} left to pay
                </p>
                <button
                  type="button"
                  className="book__reserve"
                  onClick={openPayment}
                >
                  Complete payment
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="book__reserve"
                  onClick={handleReserve}
                  disabled={!quote}
                >
                  Reserve your stay
                </button>
                <p className="book__hint">
                  {quote
                    ? "Make downpayment first"
                    : "Choose your date to see the total"}
                </p>
              </>
            )}

            {needLogin && !isLoggedIn && (
              <p className="book__error" role="alert">
                Please log in to reserve your stay.{" "}
                {onLoginClick && (
                  <button
                    type="button"
                    className="book__link"
                    onClick={onLoginClick}
                  >
                    Log in
                  </button>
                )}
              </p>
            )}

            {!pending && (
              <>
                <div className="book__rows">
                  <div
                    className={`book__row${quote ? "" : " book__row--muted"}`}
                  >
                    <span>{peso(price)} × 1 night</span>
                    <span>{quote ? peso(quote.stay) : "—"}</span>
                  </div>
                  {pool && quote && (
                    <div className="book__row">
                      <span>Pool fee · {plural(guests, "guest")}</span>
                      <span>{peso(quote.poolFee)}</span>
                    </div>
                  )}
                </div>

                <div className="book__total">
                  <span>Estimated Total</span>
                  <strong>{quote ? peso(quote.total) : "—"}</strong>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      {/* ---------------- Reserve modal ---------------- */}
      <Modal
        show={showModal}
        onHide={closeModal}
        centered
        scrollable
        dialogClassName="book-modal"
        backdrop={submitting ? "static" : true}
        keyboard={!submitting}
      >
        <Modal.Header closeButton={!submitting}>
          <div>
            <p className="bm__step">
              {step === "pay"
                ? "Step 2 of 2 · Payment"
                : "Step 1 of 2 · Review"}
            </p>
            <Modal.Title>
              {step === "pay"
                ? "Pay your downpayment"
                : "Confirm your reservation"}
            </Modal.Title>
          </div>
        </Modal.Header>

        {step === "review" && quote && (
          <>
            <Modal.Body>
              <div className="bm__account">
                <span className="bm__avatar" aria-hidden="true">
                  {(user?.name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <span className="bm__account-label">Booking under</span>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>

              <dl className="bm__details">
                <div className="bm__detail">
                  <dt>Check-in</dt>
                  <dd>
                    {formatLong(checkIn)}
                    <small>{CHECK_IN_LABEL}</small>
                  </dd>
                </div>
                <div className="bm__detail">
                  <dt>Check-out</dt>
                  <dd>
                    {formatLong(checkOut)}
                    <small>{CHECK_OUT_LABEL}</small>
                  </dd>
                </div>
                <div className="bm__detail">
                  <dt>Length of stay</dt>
                  <dd>{STAY_HOURS} hours</dd>
                </div>
                <div className="bm__detail">
                  <dt>Guests</dt>
                  <dd>
                    {plural(guests, "guest")}
                    {pool && <small>Pool access included</small>}
                  </dd>
                </div>
              </dl>

              <div className="bm__totals">
                <div className="bm__totals-row">
                  <span>{peso(price)} × 1 night</span>
                  <span>{peso(quote.stay)}</span>
                </div>
                {pool && (
                  <div className="bm__totals-row">
                    <span>Pool fee · {plural(guests, "guest")}</span>
                    <span>{peso(quote.poolFee)}</span>
                  </div>
                )}
                <div className="bm__totals-row bm__totals-row--total">
                  <span>Total</span>
                  <span>{peso(quote.total)}</span>
                </div>
              </div>

              <div className="bm__due">
                <span>Due now (downpayment)</span>
                <strong>{peso(quote.downpayment)}</strong>
              </div>
              <p className="bm__help">
                The remaining balance of {peso(quote.balance)} is paid before
                your stay.
              </p>

              <p className="bm__hold">
                <ClockIcon />
                <span>
                  Continuing holds this date for {HOLD_MINUTES} minutes while
                  you pay. If the downpayment isn’t received, the date is
                  released.
                </span>
              </p>

              <label className="bm__agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I’ve read and agree to the{" "}
                  <a href="#house-rules" onClick={closeModal}>
                    house rules
                  </a>
                  .
                </span>
              </label>

              {error && (
                <p className="bm__error" role="alert">
                  {error}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <button
                type="button"
                className="bm__btn bm__btn--ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bm__btn bm__btn--primary"
                onClick={handleCreateBooking}
                disabled={!agreed || submitting}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Reserving…
                  </>
                ) : (
                  "Reserve & continue to payment"
                )}
              </button>
            </Modal.Footer>
          </>
        )}

        {step === "pay" && pending && (
          <>
            <Modal.Body>
              <div className="bm__ref-card">
                <div>
                  <span>Reference</span>
                  <strong>{pending.reference}</strong>
                </div>
                <div>
                  <span>Check-in</span>
                  <strong>{formatLong(pending.checkIn)}</strong>
                  <small>{CHECK_IN_LABEL}</small>
                </div>
              </div>

              <p className="bm__timer" aria-live="polite">
                <ClockIcon />
                <span>Your date is held for</span>
                <strong>{formatTimeLeft(secondsLeft)}</strong>
              </p>

              <div className="bm__due">
                <span>Downpayment due now</span>
                <strong>{peso(pending.downpayment)}</strong>
              </div>
              <p className="bm__help">
                Total {peso(pending.total)}
                {pending.poolApplied
                  ? ` (includes ${peso(pending.poolFee)} pool fee)`
                  : ""}{" "}
                · balance of {peso(pending.balance)} is paid before your stay.
              </p>

              {/* ADDED: door access reminder */}
              <div className="bm__warn" role="note">
                <p>
                  Complete your <strong>full payment right away</strong>. You
                  won’t receive your <strong>door access code</strong> until
                  your booking is fully paid. You can also pay anytime from{" "}
                  <strong>My bookings</strong> in the menu.
                </p>
              </div>

              {poolUnresolved && (
                <div className="bm__warn" role="alert">
                  <p>
                    Your date is held, but we couldn’t add pool access to your
                    booking yet.
                  </p>
                  <div className="bm__warn-actions">
                    <button
                      type="button"
                      className="bm__btn bm__btn--ghost"
                      onClick={handleRetryPool}
                      disabled={submitting}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="bm__btn bm__btn--ghost"
                      onClick={handleSkipPool}
                      disabled={submitting}
                    >
                      Continue without pool
                    </button>
                  </div>
                </div>
              )}

              <p className="bm__heading">Pay with</p>
              <div
                className="bm__methods"
                role="radiogroup"
                aria-label="Payment method"
              >
                {PAYMENT_METHODS.map((name) => (
                  <label
                    key={name}
                    className={`bm__method${method === name ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pay-method"
                      value={name}
                      checked={method === name}
                      onChange={() => setMethod(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              <p className="bm__help">
                You’ll be taken to {method} to finish paying. Your stay is
                confirmed once the payment is received.
              </p>

              {error && (
                <p className="bm__error" role="alert">
                  {error}
                </p>
              )}
            </Modal.Body>

            <Modal.Footer>
              <button
                type="button"
                className="bm__btn bm__btn--ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                Pay later
              </button>
              <button
                type="button"
                className="bm__btn bm__btn--primary"
                onClick={handlePay}
                disabled={submitting || poolUnresolved}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Opening {method}…
                  </>
                ) : (
                  `Pay ${peso(pending.downpayment)} with ${method}`
                )}
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </section>
  );
}
