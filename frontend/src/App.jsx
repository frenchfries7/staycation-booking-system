import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { StayProvider } from "./context/StayContext";

import "bootstrap/dist/css/bootstrap.min.css";

// CLIENT PAGES
import GoogleSuccess from "./pages/GoogleSuccess";
import TheUnit from "./pages/TheUnit";
import Amenities from "./pages/Amenities";
import Location from "./pages/Location";
import HouseRules from "./pages/HouseRules";
import BookYourStay from "./pages/BookYourStay";
import PaymentResult from "./pages/PaymentResult";

// CLIENT COMPONENTS
import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";

// ADMIN COMPONENTS
import AdminLayout from "./admin/layout/AdminLayout";
import Overview from "./admin/Overview";
import Booking from "./admin/Booking";
import Calendar from "./admin/Calendar";

function ClientLayout({ showLogin, openLogin, closeLogin }) {
  return (
    <>
      <Navbar onLoginClick={openLogin} />

      {showLogin && <LoginModal isOpen={showLogin} onClose={closeLogin} />}

      <Outlet />
    </>
  );
}

// Only admins can open the /admin pages
function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return null; // wait for /auth/me to finish

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  const [showLogin, setShowLogin] = useState(false);

  const openLogin = () => setShowLogin(true);
  const closeLogin = () => setShowLogin(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <StayProvider>
          <Routes>
            <Route
              element={
                <ClientLayout
                  showLogin={showLogin}
                  openLogin={openLogin}
                  closeLogin={closeLogin}
                />
              }
            >
              <Route
                path="/"
                element={
                  <>
                    <TheUnit />
                    <Amenities />
                    <Location />
                    <HouseRules />
                    <BookYourStay onLoginClick={openLogin} />
                  </>
                }
              />

              <Route path="/google-success" element={<GoogleSuccess />} />

              <Route
                path="/booking/payment-result"
                element={<PaymentResult />}
              />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />

                <Route path="dashboard" element={<Overview />} />

                <Route path="booking" element={<Booking />} />

                <Route path="calendar" element={<Calendar />} />

                <Route
                  path="customers"
                  element={<div>Customer Management</div>}
                />

                <Route
                  path="payments"
                  element={<div>Payment Management</div>}
                />

                <Route path="property" element={<div>Property Details</div>} />

                <Route path="settings" element={<div>Admin Settings</div>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
