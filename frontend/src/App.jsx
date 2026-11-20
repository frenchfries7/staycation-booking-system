import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { StayProvider } from "./context/StayContext";
import "bootstrap/dist/css/bootstrap.min.css";
import GoogleSuccess from "./pages/GoogleSuccess";

import TheUnit from "./pages/TheUnit";
import Amenities from "./pages/Amenities";
import Location from "./pages/Location";
import HouseRules from "./pages/HouseRules";

import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StayProvider>
          <Navbar />
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <TheUnit />
                  <Amenities />
                  <Location />
                  <HouseRules />
                </>
              }
            />
            <Route path="/google-success" element={<GoogleSuccess />} />
          </Routes>
        </StayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
