import User from "../models/user.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
      );
    }
    const { id, displayName, emails, photos } = req.user;

    const email = emails?.[0]?.value?.toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email is required.",
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = id;
        user.profilePicture = photos?.[0]?.value || "";
        await user.save();
      }
    } else {
      user = await User.create({
        name: displayName,
        email,
        googleId: id,
        profilePicture: photos?.[0]?.value || "",
      });
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, cookieOptions);

    return res.redirect(
      `${process.env.FRONTEND_URL}/google-success#token=${token}`,
    );
  } catch (error) {
    console.error("Google authentication error:", error.message);

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    );
  }
};
