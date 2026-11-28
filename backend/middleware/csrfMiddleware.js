import crypto from "crypto";

const csrfMiddleware = (req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL;
  const requestOrigin = req.headers.origin;

  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  // Always validate the origin for requests that provide one.
  if (requestOrigin && requestOrigin !== allowedOrigin) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Invalid request origin.",
    });
  }

  // Safe requests do not need CSRF validation.
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bearer authentication is validated by authMiddleware
  // on the individual protected routes.
  const authHeader = req.headers.authorization || "";
  if (
    req.authMethod === "bearer" ||
    (authHeader.startsWith("Bearer ") && authHeader.slice(7).trim())
  ) {
    return next();
  }

  // Cookie-authenticated requests must pass CSRF validation.
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token missing.",
    });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid token, please log-in again.",
    });
  }

  next();
};

export default csrfMiddleware;
