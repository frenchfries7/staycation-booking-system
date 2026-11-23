import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { getPaymentStatus } from "../services/bookingApi";
import { KEYS, readJson, removeKey } from "../services/bookingUtils";
import "./BookYourStay.css";
import "./BookingModal.css";

const POLL_MS = 3000;
const MAX_TRIES = 12;

const MESSAGES = {
  success: {
    title: "Your stay is confirmed",
    text: "We received your downpayment. See you soon! The remaining balance is paid before your stay.",
  },
  slow: {
    title: "Payment received",
    text: "Your payment went through and your reservation is being confirmed. This can take a few minutes.",
  },
  failed: {
    title: "Payment not completed",
    text: "The payment didn’t go through. If your reservation is still on hold, you can try again from the booking section.",
  },
  waiting: {
    title: "We haven’t received your payment yet",
    text: "If you already paid, give it a minute and refresh this page. Otherwise you can finish paying from the booking section while your date is still on hold.",
  },
  login: {
    title: "Please log in",
    text: "Log in to check the status of your payment.",
  },
  unknown: {
    title: "No payment to check",
    text: "We couldn’t find a recent payment on this device.",
  },
};

export default function PaymentResult() {
  const [info] = useState(() => readJson(KEYS.payment));
  const [state, setState] = useState(info ? "checking" : "unknown");

  useEffect(() => {
    if (!info) return undefined;

    let cancelled = false;
    let timer;
    let tries = 0;
    let sawPaid = false;

    const check = async () => {
      tries += 1;
      try {
        const data = await getPaymentStatus(info.paymentIntentId);
        if (cancelled) return;

        const paymentState = data.payment?.paymentStatus;

        if (data.bookingStatus === "confirmed") {
          removeKey(KEYS.payment);
          removeKey(KEYS.pending);
          setState("success");
          return;
        }

        if (
          paymentState === "failed" ||
          ["cancelled", "awaiting_payment_method"].includes(data.payMongoStatus)
        ) {
          setState("failed");
          return;
        }

        if (
          data.payMongoStatus === "succeeded" ||
          paymentState === "completed"
        ) {
          sawPaid = true;
          setState("processing");
        }
      } catch (err) {
        if (cancelled) return;
        if (err.code === "unauthorized") {
          setState("login");
          return;
        }
      }

      if (tries >= MAX_TRIES) {
        setState(sawPaid ? "slow" : "waiting");
        return;
      }
      timer = setTimeout(check, POLL_MS);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [info]);

  const busy = state === "checking" || state === "processing";
  const message = MESSAGES[state];

  return (
    <section className="book" style={{ minHeight: "60vh" }}>
      <div className="book__inner">
        <div className="bm__success">
          {busy ? (
            <>
              <Spinner animation="border" className="mb-3" />
              <h4>
                {state === "processing"
                  ? "Payment received"
                  : "Checking your payment…"}
              </h4>
              <p>
                {state === "processing"
                  ? "Confirming your reservation. This only takes a moment."
                  : "Please wait while we confirm your payment."}
              </p>
            </>
          ) : (
            <>
              <h4>{message.title}</h4>
              <p>{message.text}</p>
              {info?.reference && (
                <p className="bm__ref">
                  Reference: <strong>{info.reference}</strong>
                </p>
              )}
              <div className="bm__actions">
                {(state === "failed" || state === "waiting") && (
                  <Link to="/#book" className="bm__btn bm__btn--ghost">
                    Back to booking
                  </Link>
                )}
                <Link to="/" className="bm__btn bm__btn--primary">
                  Back to home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
