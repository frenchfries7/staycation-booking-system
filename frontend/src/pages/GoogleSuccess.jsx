import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function GoogleSuccess() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const verifyGoogleLogin = async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#token=")) {
        const token = hash.replace("#token=", "");
        localStorage.setItem("token", token);
        window.history.replaceState(null, "", window.location.pathname);
      }

      const success = await checkAuth();

      if (success) {
        navigate("/", { replace: true });
      } else {
        navigate("/?error=google_auth_failed", {
          replace: true,
        });
      }
    };

    verifyGoogleLogin();
  }, [checkAuth, navigate]);

  return <h2>Completing Google Sign-In...</h2>;
}

export default GoogleSuccess;
