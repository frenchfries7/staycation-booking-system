import GoogleLoginButton from "./GoogleLoginButton";
import "./LoginModal.css";

function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
          <div className="login-logo">S</div>

          <p className="login-brand">STAYCATION</p>

          <h2 id="login-title">Welcome back!</h2>

          <p className="login-description">
            Sign in to your account and start planning your perfect stay.
          </p>

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
