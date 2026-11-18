import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { handlePayMongoWebhook } from "./controllers/webhookController.js";

import connectDB from "./config/db.js";
import expirePendingBookings from "./utils/expirePendingBookings.js";

import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import accommodationRoutes from "./routes/accommodationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

dotenv.config();

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

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/accommodation", accommodationRoutes);
app.use("/api/payments", paymentRoutes);

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
