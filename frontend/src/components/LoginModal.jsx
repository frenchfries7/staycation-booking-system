import GoogleLoginButton from "./GoogleLoginButton";
import "./LoginModal.css";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token) {
        throw new Error(
          "Login succeeded, but no authentication token was received.",
        );
      }

      // Save JWT and update authentication state.
      const authenticated = await login(data.token);

      if (!authenticated) {
        throw new Error(
          "Login succeeded, but your account could not be authenticated.",
        );
      }

      // Redirect based on the authenticated user's role.
      onClose();

      window.location.href =
        data.user?.role === "admin" ? "/admin/dashboard" : "/";
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="login-close"
          type="button"
          onClick={onClose}
          aria-label="Close login"
        >
          &times;
        </button>

        <div className="login-content">
          <img
            src="/images/unit/logo.png"
            alt="B&R Hideaway logo"
            className="login-logo"
          />

          <p className="login-brand">B&amp;R Hideaway</p>

          <p className="login-description">
            Sign in to your account and start planning your perfect stay.
          </p>

          <form onSubmit={handleLogin}>
            <div className="login-form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <GoogleLoginButton />

          <div className="login-divider">
            <span>SECURE SIGN IN</span>
          </div>

          <p className="login-footer">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
