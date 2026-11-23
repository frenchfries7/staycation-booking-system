import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { handlePayMongoWebhook } from "./controllers/webhookController.js";
import passport from "passport";
import crypto from "crypto";

import connectDB from "./config/db.js";
import expirePendingBookings from "./utils/expirePendingBookings.js";
import csrfMiddleware from "./middleware/csrfMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import accommodationRoutes from "./routes/accommodationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import initializeDoorAccess from "./utils/initializeDoorAccess.js";
import doorAccessRoutes from "./routes/doorAccessRoutes.js";

const app = express();

app.use(helmet());
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handlePayMongoWebhook,
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/api/csrf-token", (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });

  res.status(200).json({
    success: true,
    csrfToken,
  });
});
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/bookings", csrfMiddleware, bookingRoutes);
app.use("/api/accommodation", accommodationRoutes);
app.use("/api/payments", csrfMiddleware, paymentRoutes);
app.use("/api/door-access", doorAccessRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Staycation Booking System API is running!",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initializeDoorAccess();

    // Automatically expire unpaid bookings every minute
    cron.schedule("* * * * *", async () => {
      try {
        const result = await expirePendingBookings();

        if (result.modifiedCount > 0) {
          console.log(`${result.modifiedCount} booking(s) expired.`);
        }
      } catch (error) {
        console.error("Booking expiration error:", error.message);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
