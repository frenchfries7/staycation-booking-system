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
          <svg
            width="44"
            height="44"
            viewBox="0 0 100 100"
            className="br-brand-logo"
            aria-label="B&R Hideaway logo"
          >
            <circle cx="50" cy="50" r="48" fill="#ffffff" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1f2547"
              strokeWidth="3.2"
            />
            <circle
              cx="50"
              cy="50"
              r="41"
              fill="none"
              stroke="#c8a97e"
              strokeWidth="1.6"
            />
            {/* Sun */}
            <circle cx="54" cy="40" r="14" fill="#e6c79c" />
            {/* Stars */}
            <path
              d="M72 26l1.5 3.5 3.5 1.5-3.5 1.5L72 36l-1.5-3.5L67 31l3.5-1.5z"
              fill="#c8a97e"
            />
            <path
              d="M79 35l1 2.2 2.2 1-2.2 1L79 41.5l-1-2.3-2.2-1 2.2-1z"
              fill="#c8a97e"
            />
            {/* Palm trunk & leaves */}
            <path
              d="M31 58 Q33 44 30 34"
              fill="none"
              stroke="#1f2547"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M30 34 Q22 31 18 36 M30 34 Q23 27 19 29 M30 34 Q35 27 40 31 M30 34 Q36 33 39 38"
              fill="none"
              stroke="#1f2547"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* House roof & window */}
            <path
              d="M36 46 L54 31 L72 46"
              fill="none"
              stroke="#1f2547"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M41 44 L54 33 L67 44 L67 57 L41 57 Z" fill="#1f2547" />
            <rect x="50.5" y="43" width="3" height="3" fill="#ffffff" />
            <rect x="54.5" y="43" width="3" height="3" fill="#ffffff" />
            <rect x="50.5" y="47" width="3" height="3" fill="#ffffff" />
            <rect x="54.5" y="47" width="3" height="3" fill="#ffffff" />
            {/* Wave */}
            <path
              d="M16 58 Q36 52 54 57 T84 56"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            <path
              d="M16 59 Q36 53 54 58 T84 57"
              fill="none"
              stroke="#1f2547"
              strokeWidth="2.4"
            />
            {/* Bold B&R */}
            <text
              x="50"
              y="77"
              textAnchor="middle"
              fill="#1f2547"
              fontFamily="Georgia, serif"
              fontWeight="700"
              fontSize="20"
              letterSpacing="1"
            >
              B&amp;R
            </text>
          </svg>
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
