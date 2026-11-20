import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");

  // CHECK AUTHENTICATION
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setUser(null);
        return false;
      }

      setUser(data.user);
      return true;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGIN
  const login = useCallback(async () => {
    return await checkAuth();
  }, [checkAuth]);

  // LOGOUT
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
    }
  }, []);

  // CHECK USER WHEN APP LOADS
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch(`${API_URL}/csrf-token`, {
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
      }
    };

    fetchCsrfToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        csrfToken,
        login,
        logout,
        checkAuth,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
