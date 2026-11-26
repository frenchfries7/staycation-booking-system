
const API_URL = import.meta.env.VITE_API_BASE_URL;

// Get the JWT token saved after login.
function getAuthToken() {
  return localStorage.getItem("token") || "";
}

// Create a reusable API error.
function apiError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// CSRF token cache for cookie-authenticated requests.
let csrf = {
  token: "",
  at: 0,
};

// Fetch a fresh CSRF token from the backend.
async function getCsrfToken(forceRefresh = false) {
  const TOKEN_LIFETIME = 50 * 60 * 1000;

  if (
    !forceRefresh &&
    csrf.token &&
    Date.now() - csrf.at < TOKEN_LIFETIME
  ) {
    return csrf.token;
  }

  try {
    const response = await fetch(`${API_URL}/csrf-token`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.csrfToken) {
      throw new Error(
        data.message || "Unable to obtain CSRF token."
      );
    }

    csrf = {
      token: data.csrfToken,
      at: Date.now(),
    };

    return csrf.token;
  } catch (error) {
    csrf = {
      token: "",
      at: 0,
    };

    throw apiError(
      error.message || "Unable to obtain CSRF token.",
      "csrf"
    );
  }
}

// Reusable API request.
async function request(
  path,
  {
    method = "GET",
    body,
    retryCsrf = true,
  } = {}
) {
  const authToken = getAuthToken();
  const upperMethod = method.toUpperCase();

  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(
    upperMethod
  );

  let csrfToken = "";

  // Only obtain a CSRF token when using cookie authentication.
  // Bearer-authenticated requests are validated by authMiddleware.
  if (!isSafeMethod && !authToken) {
    csrfToken = await getCsrfToken();
  }

  const headers = {
    "Content-Type": "application/json",

    // Send JWT authentication token when available.
    ...(authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {}),

    // Send CSRF token for cookie-authenticated requests.
    ...(csrfToken
      ? {
          "x-csrf-token": csrfToken,
        }
      : {}),
  };

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw apiError(
      "We can't reach the server. Check your connection and try again.",
      "network"
    );
  }

  const data = await response.json().catch(() => ({}));

  // Retry once if the CSRF cookie/header is missing or invalid.
  if (
    response.status === 403 &&
    retryCsrf &&
    !authToken &&
    /csrf token missing|invalid token/i.test(data.message || "")
  ) {
    csrf = {
      token: "",
      at: 0,
    };

    return request(path, {
      method,
      body,
      retryCsrf: false,
    });
  }

  if (response.ok) {
    return data;
  }

  const code =
    response.status === 401
      ? "unauthorized"
      : response.status === 403
        ? "forbidden"
        : response.status === 409
          ? "conflict"
          : "error";

  throw apiError(
    data.message || "Something went wrong. Please try again.",
    code
  );
}

// Check whether a date is available.
// true = available
// false = reserved
// null = unable to check
export async function checkDateAvailability(dateKey) {
  try {
    const data = await request(
      `/bookings/availability?checkIn=${encodeURIComponent(dateKey)}`
    );

    return typeof data.available === "boolean"
      ? data.available
      : null;
  } catch {
    return null;
  }
}

// Get accommodation price and capacity.
export async function getAccommodation() {
  try {
    const data = await request("/accommodation");

    const item =
      data.accommodation ||
      data.data ||
      (Array.isArray(data.accommodations)
        ? data.accommodations[0]
        : null) ||
      data;

    const price = Number(item?.price);
    const capacity = Number(item?.capacity);

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    return {
      price,
      capacity:
        Number.isFinite(capacity) && capacity > 0
          ? capacity
          : null,
    };
  } catch {
    return null;
  }
}

// Create a pending booking.
export async function createBooking({
  checkIn,
  numberOfGuests,
}) {
  const data = await request("/bookings", {
    method: "POST",
    body: {
      checkIn,
      numberOfGuests,
    },
  });

  return data.booking;
}

// Add pool access to an existing booking.
export async function addPoolAccess(bookingId) {
  return request(
    `/bookings/${encodeURIComponent(bookingId)}/pool-access`,
    {
      method: "POST",
    }
  );
}

// Create GCash or Maya payment.
export async function createPayment({
  bookingId,
  paymentMethod,
  paymentPurpose = "downpayment",
}) {
  return request("/payments", {
    method: "POST",
    body: {
      bookingId,
      paymentMethod,
      paymentPurpose,
    },
  });
}

// Get payment status.
export const getPaymentStatus = (paymentIntentId) =>
  request(
    `/payments/${encodeURIComponent(paymentIntentId)}`
  );

// Get the logged-in customer's bookings.
export async function getMyBookings() {
  const data = await request("/bookings/my-bookings");

  return data.bookings || [];
}

// Cancel a booking.
export async function cancelBooking(bookingId) {
  const data = await request(
    `/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {
      method: "PATCH",
    }
  );

  return data.booking;
}
