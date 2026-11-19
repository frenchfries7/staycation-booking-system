import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function GoogleSuccess() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const verifyGoogleLogin = async () => {
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
