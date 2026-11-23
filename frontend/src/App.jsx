import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { StayProvider } from "./context/StayContext";
import "bootstrap/dist/css/bootstrap.min.css";
import GoogleSuccess from "./pages/GoogleSuccess";

import TheUnit from "./pages/TheUnit";
import Amenities from "./pages/Amenities";
import Location from "./pages/Location";
import HouseRules from "./pages/HouseRules";
import BookYourStay from "./pages/BookYourStay";
import PaymentResult from "./pages/PaymentResult";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const openLogin = () => setShowLogin(true);

  return (
    <BrowserRouter>
      <AuthProvider>
        <StayProvider>
          <Navbar onLoginClick={openLogin} />

          {showLogin && (
            <LoginModal
              isOpen={showLogin}
              onClose={() => setShowLogin(false)}
            />
          )}

          <Routes>
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
            {/* PayMongo sends guests back here after GCash / Maya */}
            <Route path="/booking/payment-result" element={<PaymentResult />} />
            {/* Unknown URLs (like /my-bookings for now) go back home instead of a blank page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
