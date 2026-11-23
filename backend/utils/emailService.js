import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 3,
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId, "to:", to);
    return info;
  } catch (err) {
    console.error("Nodemailer sendMail error:", err);
    throw err;
  }
};

export default sendEmail;
