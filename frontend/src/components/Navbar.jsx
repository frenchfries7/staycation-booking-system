import { useCallback, useEffect, useState } from "react"; // ADDED
import { Container, Dropdown, Nav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom"; // ADDED useLocation
import { useAuth } from "../context/AuthContext";
import { getMyBookings } from "../services/bookingApi"; // ADDED
import "./Navbar.css";

const links = [
  { label: "The Unit", href: "/#unit" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Location", href: "/#location" },
  { label: "House Rules", href: "/#house-rules" },
];

const bookHref = "/#book";

// ADDED: same conditions MyBookings uses to show the Pay buttons
const needsPayment = (b) =>
  (b.bookingStatus === "pending" && b.paymentStatus === "unpaid") ||
  (b.bookingStatus === "confirmed" && b.paymentStatus === "partial");

// onLoginClick: pass the function that opens your LoginModal
export default function Navbar({ onLoginClick }) {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // ADDED

  // ADDED: number of bookings that still need a payment
  const [dueCount, setDueCount] = useState(0);

  const refreshDue = useCallback(async () => {
    try {
      const list = await getMyBookings();
      setDueCount(list.filter(needsPayment).length);
    } catch {
      setDueCount(0);
    }
  }, []);

  // ADDED: refresh on login/logout and whenever the page changes
  useEffect(() => {
    if (isLoggedIn) refreshDue();
  }, [isLoggedIn, location.pathname, refreshDue]);

  const badgeCount = isLoggedIn ? dueCount : 0; // ADDED

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const firstName = user?.name?.split(" ")[0];

  return (
    <header className="br-navbar">
      <Container fluid className="px-4 px-lg-5 d-flex align-items-center">
        <Link to="/" className="br-brand d-flex align-items-center gap-2">
          <img
            src="/images/unit/logo.png"
            alt="B&R Hideaway logo"
            className="br-brand-logo"
          />
          <span>B&amp;R Hideaway</span>
        </Link>

        {/* Center links (desktop) */}
        <Nav className="br-links d-none d-lg-flex flex-row flex-grow-1 justify-content-center gap-4">
          {links.map((link) => (
            <Nav.Link key={link.label} href={link.href}>
              {link.label}
            </Nav.Link>
          ))}
        </Nav>

        {/* Book Now button (desktop) */}
        <a href={bookHref} className="br-book d-none d-lg-inline-flex">
          Book Now
        </a>

        {/* Menu pill */}
        <Dropdown
          align="end"
          className="ms-auto ms-lg-3"
          onToggle={(open) => open && isLoggedIn && refreshDue()} // ADDED: refresh when menu opens
        >
          <Dropdown.Toggle
            as="button"
            className="br-pill"
            aria-label={
              badgeCount > 0
                ? `Open menu, ${badgeCount} booking${badgeCount > 1 ? "s" : ""} need payment`
                : "Open menu"
            } // CHANGED: label only
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2 3.5h12M2 8h12M2 12.5h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {isLoggedIn && user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt=""
                className="br-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="br-avatar">
                {isLoggedIn ? firstName?.[0]?.toUpperCase() : ""}
              </span>
            )}
            {badgeCount > 0 && <span className="br-dot" aria-hidden="true" />}
            {/* ADDED: red dot */}
          </Dropdown.Toggle>

          <Dropdown.Menu className="br-menu">
            {/* Links on small screens */}
            <div className="d-lg-none">
              {links.map((link) => (
                <Dropdown.Item key={link.label} href={link.href}>
                  {link.label}
                </Dropdown.Item>
              ))}
              <Dropdown.Item href={bookHref} className="br-book-item">
                Book Now
              </Dropdown.Item>
              <Dropdown.Divider />
            </div>

            {isLoggedIn ? (
              <>
                <Dropdown.ItemText className="br-hello">
                  Hello, {firstName}
                </Dropdown.ItemText>
                <Dropdown.Item as={Link} to="/my-bookings">
                  My Bookings
                  {badgeCount > 0 && (
                    <span className="br-count">{badgeCount}</span>
                  )}
                  {/* ADDED: count badge */}
                </Dropdown.Item>
                <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
              </>
            ) : (
              <Dropdown.Item onClick={onLoginClick}>Login</Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown>
      </Container>
    </header>
  );
}
