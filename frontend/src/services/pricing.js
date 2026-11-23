// Pool access is charged per person, per stay.
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

export const getPoolFee = (checkInKey, guests) =>
  guests * (HOLIDAYS.includes(checkInKey) ? POOL_RATE.holiday : POOL_RATE.regular);