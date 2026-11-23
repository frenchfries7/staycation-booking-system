// ---------- Business rules ----------
// Used only when the accommodation details can't be loaded from the server.
// The server is always the final authority on price and capacity.
export const FALLBACK_PRICE = 1699;
export const FALLBACK_CAPACITY = 4;

// A stay is always 2:00 PM -> 12:00 PM the next day (22 hours)
export const CHECK_IN_LABEL = "2:00 PM";
export const CHECK_OUT_LABEL = "12:00 PM";
export const STAY_HOURS = 22;

// Pool access: per person, per stay (same rates as "Things to know")
export const POOL_RATE = { regular: 250, holiday: 300 };
// Philippine holidays that use the holiday pool rate (check-in date, YYYY-MM-DD).
// Source: Proclamation No. 1006 (2026) and No. 1427 (2027).
// TODO: Eid'l Fitr and Eid'l Adha 2027 are announced later - add them when declared.
export const HOLIDAYS = [
  // 2026
  "2026-11-30", // Bonifacio Day
  "2026-12-08", // Feast of the Immaculate Conception
  "2026-12-24", // Christmas Eve
  "2026-12-25", // Christmas Day
  "2026-12-30", // Rizal Day
  "2026-12-31", // Last Day of the Year
  // 2027
  "2027-01-01", // New Year's Day
  "2027-02-06", // Chinese New Year
  "2027-03-25", // Maundy Thursday
  "2027-03-26", // Good Friday
  "2027-03-27", // Black Saturday
  "2027-04-09", // Araw ng Kagitingan
  "2027-05-01", // Labor Day
  "2027-06-12", // Independence Day
  "2027-08-21", // Ninoy Aquino Day
  "2027-08-30", // National Heroes Day
  "2027-11-01", // All Saints' Day
  "2027-11-02", // All Souls' Day
  "2027-11-30", // Bonifacio Day
  "2027-12-08", // Feast of the Immaculate Conception
  "2027-12-24", // Christmas Eve
  "2027-12-25", // Christmas Day
  "2027-12-30", // Rizal Day
  "2027-12-31", // Last Day of the Year
];

export const DOWNPAYMENT_RATE = 0.5;
export const HOLD_MINUTES = 15;

// sessionStorage keys
export const KEYS = {
  draft: "br_booking_draft",
  pending: "br_pending_booking",
  payment: "br_payment",
};

export const readJson = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};
export const writeJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable - not a problem
  }
};
export const removeKey = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // storage unavailable - not a problem
  }
};

// ---------- Date helpers (dates are "YYYY-MM-DD" strings) ----------
export const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Today in Philippine time, the same clock the server uses
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const addDays = (key, n) => {
  const date = fromKey(key);
  date.setDate(date.getDate() + n);
  return toKey(date);
};

export const monthOf = (key) => ({
  y: Number(key.slice(0, 4)),
  m: Number(key.slice(5, 7)) - 1,
});

// Cells for a month grid: nulls for the empty slots before day 1
export function buildMonth(year, month) {
  const offset = new Date(year, month, 1).getDay(); // Sunday = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(offset).fill(null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(toKey(new Date(year, month, d)));
  }
  return cells;
}

// ---------- Pricing (an estimate - the server calculates the real amount) ----------
export function getQuote({ checkIn, price, guests = 1, pool = false }) {
  if (!checkIn) return null;

  const poolFee = pool
    ? guests * (HOLIDAYS.includes(checkIn) ? POOL_RATE.holiday : POOL_RATE.regular)
    : 0;
  const total = price + poolFee;
  const downpayment = total * DOWNPAYMENT_RATE;

  return { stay: price, poolFee, total, downpayment, balance: total - downpayment };
}

// ---------- Formatting ----------
export const peso = (n) => {
  const value = Number(n);
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatLong = (key) =>
  fromKey(key).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// 754 -> "12:34"
export const formatTimeLeft = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;