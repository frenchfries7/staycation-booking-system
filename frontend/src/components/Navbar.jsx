import { Container, Dropdown, Nav } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const links = [
  { label: "The unit", href: "/#unit" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Location", href: "/#location" },
  { label: "House rules", href: "/#house-rules" },
];

const bookHref = "/#book";

// onLoginClick: pass the function that opens your LoginModal
export default function Navbar({ onLoginClick }) {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const firstName = user?.name?.split(" ")[0];

  return (
    <header className="br-navbar">
      <Container fluid className="px-4 px-lg-5 d-flex align-items-center">
        <Link to="/" className="br-brand d-flex align-items-center gap-3">
          B&amp;R Hideaway
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
        <Dropdown align="end" className="ms-auto ms-lg-3">
          <Dropdown.Toggle
            as="button"
            className="br-pill"
            aria-label="Open menu"
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
          </Dropdown.Toggle>

          <Dropdown.Menu className="br-menu">
            {/* Links on small screens */}
            <div className="d-lg-none">
              {links.map((link) => (
                <Dropdown.Item key={link.label} href={link.href}>
                  {link.label}
                </Dropdown.Item>
              ))}
              <Dropdown.Item href={bookHref}>Book Now</Dropdown.Item>
              <Dropdown.Divider />
            </div>

            {isLoggedIn ? (
              <>
                <Dropdown.ItemText className="br-hello">
                  Hello, {firstName}
                </Dropdown.ItemText>
                <Dropdown.Item as={Link} to="/my-bookings">
                  My bookings
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
