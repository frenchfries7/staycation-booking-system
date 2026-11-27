import jwt from "jsonwebtoken";
import User from "../models/user.js";

const authMiddleware = async (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured.",
    });
  }

  // Identify authentication method.
  const authHeader = req.headers.authorization;

  let token;
  let authMethod;

  if (authHeader !== undefined) {
    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ") ||
      !authHeader.slice(7).trim()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header.",
      });
    }

    token = authHeader.slice(7).trim();
    authMethod = "bearer";
  } else {
    token = req.cookies?.token;
    authMethod = "cookie";
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    // Always retrieve the latest user information from MongoDB.
    const user = await User.findById(decoded.userId).select("_id role email");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    // Do not trust the role stored in the JWT.
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    req.authMethod = authMethod;

    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export default authMiddleware;
