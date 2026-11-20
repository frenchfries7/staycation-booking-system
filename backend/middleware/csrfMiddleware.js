import crypto from "crypto";

const csrfMiddleware = (req, res, next) => {
  const allowedOrigin = process.env.FRONTEND_URL;
  const requestOrigin = req.headers.origin;

  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  // Allow safe methods
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Validate request origin
  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Invalid request origin.",
    });
  }

  // Get CSRF token from cookie and request header
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  // Validate token presence and matching
  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token missing.",
    });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  // Prevent unequal buffer lengths from causing comparison errors
  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token.",
    });
  }

  next();
};

export default csrfMiddleware;
