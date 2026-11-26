import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function GoogleSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const verifyGoogleLogin = async () => {
      try {
        const hash = window.location.hash;

        if (!hash.startsWith("#token=")) {
          throw new Error("Google authentication token is missing.");
        }

        const token = decodeURIComponent(hash.substring("#token=".length));

        // Remove the token from the browser URL.
        window.history.replaceState(null, "", window.location.pathname);

        // Save token and verify the authenticated user.
        const success = await login(token);

        if (!success) {
          throw new Error("Unable to verify Google authentication.");
        }

        navigate("/", { replace: true });
      } catch (error) {
        console.error("Google login verification failed:", error);

        navigate("/?error=google_auth_failed", {
          replace: true,
        });
      }
    };

    verifyGoogleLogin();
  }, [login, navigate]);

  return <h2>Completing Google Sign-In...</h2>;
}

export default GoogleSuccess;
