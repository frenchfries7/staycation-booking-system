import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import GoogleSuccess from "./pages/GoogleSuccess";
import Home from "./pages/Home";
import Booking from "./admin/Booking";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/google-success" element={<GoogleSuccess />} />
          <Route path="/admin/booking" element={<Booking />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
