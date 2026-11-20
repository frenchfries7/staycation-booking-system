import { createContext, useContext, useMemo, useState } from "react";

// Standard times shown until a guest picks their own (24-hour "HH:MM").
// TODO: confirm these before publishing.
export const DEFAULT_CHECK_IN = "14:00";
export const DEFAULT_CHECK_OUT = "12:00";

// "14:00" -> "2:00 PM"
export function formatTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Safe defaults so a component never crashes if it is used outside the provider
const StayContext = createContext({
  checkIn: "",
  checkOut: "",
  setCheckIn: () => {},
  setCheckOut: () => {},
});

export function StayProvider({ children }) {
  // Empty string = the guest hasn't chosen yet
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const value = useMemo(
    () => ({ checkIn, checkOut, setCheckIn, setCheckOut }),
    [checkIn, checkOut],
  );

  return <StayContext.Provider value={value}>{children}</StayContext.Provider>;
}

export const useStay = () => useContext(StayContext);
