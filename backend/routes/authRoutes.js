import express from "express";
import {
  register,
  login,
  getMe,
  logout,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.get("/me", authMiddleware, getMe);

router.post("/logout", csrfMiddleware, logout);

export default router;
