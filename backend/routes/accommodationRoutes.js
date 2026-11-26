import express from "express";
import {
  saveAccommodation,
  getAccommodation,
} from "../controllers/accommodationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import csrfMiddleware from "../middleware/csrfMiddleware.js";

const router = express.Router();

router.get("/", getAccommodation);
router.put(
  "/",
  authMiddleware,
  adminMiddleware,
  csrfMiddleware,
  saveAccommodation,
);
export default router;
