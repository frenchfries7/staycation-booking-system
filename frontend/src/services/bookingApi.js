const API_URL = import.meta.env.VITE_API_BASE_URL;

function apiError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Your server protects /bookings and /payments with a CSRF token:
// GET /csrf-token sets a cookie, and we send the same token back in a header.
let csrf = { token: "", at: 0 };

async function getCsrfToken() {
  if (csrf.token && Date.now() - csrf.at < 50 * 60 * 1000) return csrf.token;
  try {
    const res = await fetch(`${API_URL}/csrf-token`, { credentials: "include" });
    const data = await res.json();
    csrf = { token: data.csrfToken || "", at: Date.now() };
  } catch {
    csrf = { token: "", at: 0 };
  }
  return csrf.token;
}

async function request(path, { method = "GET", body } = {}) {
  const token = await getCsrfToken();

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        // TODO: if your csrfMiddleware reads a different header name, change it here
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw apiError(
      "We can’t reach the server. Check your connection and try again.",
      "network",
    );
  }

  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;

  const code =
    res.status === 401
      ? "unauthorized"
      : res.status === 403
        ? "forbidden"
        : res.status === 409
          ? "conflict"
          : "error";
  throw apiError(data.message || "Something went wrong. Please try again.", code);
}

// Uses the existing GET /bookings/availability?checkIn=YYYY-MM-DD route.
// Returns true (free), false (reserved) or null (couldn't check).
export async function checkDateAvailability(dateKey) {
  try {
    const data = await request(
      `/bookings/availability?checkIn=${encodeURIComponent(dateKey)}`,
    );
    return typeof data.available === "boolean" ? data.available : null;
  } catch {
    return null;
  }
}

// Price and capacity from the server. Returns null if it can't be loaded.
// TODO: adjust if your /accommodation route returns a different shape
export async function getAccommodation() {
  try {
    const data = await request("/accommodation");
    const item =
      data.accommodation ||
      data.data ||
      (Array.isArray(data.accommodations) ? data.accommodations[0] : null) ||
      data;
    const price = Number(item?.price);
    const capacity = Number(item?.capacity);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      price,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    };
  } catch {
    return null;
  }
}

// Creates a pending booking that holds the date for 15 minutes
export async function createBooking({ checkIn, numberOfGuests }) {
  const data = await request("/bookings", {
    method: "POST",
    body: { checkIn, numberOfGuests },
  });
  return data.booking;
}

// Adds pool access to your own pending booking. The server works out the fee
// and updates the booking total and downpayment before any payment starts.
export async function addPoolAccess(bookingId) {
  return request(`/bookings/${encodeURIComponent(bookingId)}/pool-access`, {
    method: "POST",
  });
}

// Starts a GCash / Maya payment. paymentMethod is "GCash" or "Maya".
export async function createPayment({ bookingId, paymentMethod }) {
  return request("/payments", {
    method: "POST",
    body: { bookingId, paymentMethod, paymentPurpose: "downpayment" },
  });
}

export const getPaymentStatus = (paymentIntentId) =>
  request(`/payments/${encodeURIComponent(paymentIntentId)}`);