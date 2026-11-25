import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  updateInformation,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.get("/me", authMiddleware, getMe);

router.post("/logout", csrfMiddleware, logout);

router.put("/:id", authMiddleware, adminMiddleware, updateInformation);

export default router;
