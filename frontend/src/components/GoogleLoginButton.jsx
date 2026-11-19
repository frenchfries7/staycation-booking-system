function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  return (
    <button
      type="button"
      className="google-login-button"
      onClick={handleGoogleLogin}
    >
      <span className="google-icon">G</span>
      Continue with Google
    </button>
  );
}

export default GoogleLoginButton;
