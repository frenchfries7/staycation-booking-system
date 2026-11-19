import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import LoginModal from "../components/LoginModal";
import "./Home.css";

function Home() {
  const { user, isLoggedIn, logout, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="home-page">
      {/* Navigation */}
      <header className="home-navbar">
        <h2 className="home-logo">
          Staycation<span>.</span>
        </h2>

        <nav className="home-nav-actions">
          {!loading &&
            (isLoggedIn ? (
              <div className="nav-user">
                <span>Hello, {user?.name?.split(" ")[0]}</span>
                <button className="logout-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="signin-btn" onClick={() => setShowLogin(true)}>
                Sign In
              </button>
            ))}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="home-hero">
        <div className="hero-content">
          <span className="hero-label">YOUR PERFECT GETAWAY</span>

          <h1>
            Relax, Recharge & <br />
            <span>Stay Awhile.</span>
          </h1>

          <p>
            Escape from your busy routine and experience comfort, relaxation,
            and unforgettable moments with Staycation.
          </p>

          {loading ? (
            <p>Loading account...</p>
          ) : isLoggedIn ? (
            <div className="welcome-card">
              <h3>Welcome, {user?.name}!</h3>
              <p>{user?.email}</p>
              <p>You are successfully signed in.</p>
            </div>
          ) : (
            <button
              className="get-started-btn"
              onClick={() => setShowLogin(true)}
            >
              Get Started <span>→</span>
            </button>
          )}
        </div>

        <div className="hero-decoration">
          <div className="decoration-circle">
            <span>STAY</span>
            <strong>Relax.</strong>
            <span>REPEAT</span>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="home-features">
        <div>
          <span>01</span>
          <h3>Comfortable Stay</h3>
          <p>Enjoy a relaxing and comfortable accommodation.</p>
        </div>

        <div>
          <span>02</span>
          <h3>Easy Booking</h3>
          <p>Book your stay with a simple online process.</p>
        </div>

        <div>
          <span>03</span>
          <h3>Secure Payment</h3>
          <p>Convenient online payment for your reservation.</p>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}

export default Home;
