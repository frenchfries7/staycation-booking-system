import express from "express";
import passport from "../config/passport.js";
import { googleCallback } from "../controllers/googleAuthController.js";
import { googleLimiter } from "../middleware/rateLimitMiddleware.js";
const router = express.Router();

// Start Google OAuth with rate limiting
router.get(
  "/google",
  googleLimiter,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  }),
  googleCallback,
);

export default router;
