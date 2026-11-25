import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./AdminSidebar.css";

const Icon = ({ children }) => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const menuItems = [
  {
    name: "Overview",
    path: "/admin/dashboard",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </Icon>
    ),
  },
  {
    name: "Bookings",
    path: "/admin/booking",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 15 2 2 4-4" />
      </Icon>
    ),
  },
  {
    name: "Calendar",
    path: "/admin/calendar",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </Icon>
    ),
  },
  {
    name: "Customers",
    path: "/admin/customers",
    icon: (
      <Icon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </Icon>
    ),
  },
  {
    name: "Payments",
    path: "/admin/payments",
    icon: (
      <Icon>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 9h20" />
        <path d="M16 15h.01M18 15h.01" />
      </Icon>
    ),
  },
  {
    name: "Property details",
    path: "/admin/property",
    icon: (
      <Icon>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
      </Icon>
    ),
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9z" />
      </Icon>
    ),
  },
];

const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const adminName =
    user?.name || user?.fullName || user?.email || "Administrator";

  const profileImage =
    user?.profilePicture ||
    user?.profileImage ||
    user?.avatar ||
    user?.photoURL ||
    user?.picture ||
    user?.image ||
    null;

  const adminRole = user?.role || "admin";

  const initials = adminName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    closeMobileSidebar();
    navigate("/", { replace: true });
  };

  return (
    <>
      <button
        type="button"
        className="admin-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? (
          <Icon>
            <path d="m18 6-12 12M6 6l12 12" />
          </Icon>
        ) : (
          <Icon>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </Icon>
        )}
      </button>

      {isMobileOpen && (
        <div className="admin-sidebar-overlay" onClick={closeMobileSidebar} />
      )}

      <aside className={`admin-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <h2>B&R Hideaway</h2>
        </div>

        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin/dashboard"}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-sidebar-icon">{item.icon}</span>

              <span className="admin-sidebar-label">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-profile">
            <div className="admin-profile-avatar">
              {profileImage && !imageError ? (
                <img
                  src={profileImage}
                  alt={`${adminName}'s profile`}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="admin-profile-initials">{initials}</span>
              )}
            </div>

            <div className="admin-profile-info">
              <span className="admin-profile-name">{adminName}</span>

              <span className="admin-profile-role">{adminRole}</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout-button"
            onClick={handleSignOut}
          >
            <Icon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </Icon>

            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
