import nodemailer from "nodemailer";
import { WELCOME_EMAIL_TEMPLATE, OTP_EMAIL_TEMPLATE } from "./templates";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL!,
    pass: process.env.NODEMAILER_PASSWORD!,
  },
});

export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", name).replace(
    "{{intro}}",
    intro
  );

  const mailOptions = {
    from: `"StockMarket" <no-reply@stockmarket.com>`,
    to: email,
    subject: "Welcome to StockMarket!",
    text: "Thank you for joining StockMarket!",
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async ({
  email,
  otp,
}: {
  email: string;
  otp: string;
}) => {
  const htmlTemplate = OTP_EMAIL_TEMPLATE.replace("{{otp}}", otp);

  const mailOptions = {
    from: `"StockMarket" <no-reply@stockmarket.com>`,
    to: email,
    subject: "Verify Your Email - StockMarket",
    text: `Your verification code is: ${otp}`,
    html: htmlTemplate,
  };

  try {
    console.log("Nodemailer: Sending OTP email...");
    await transporter.sendMail(mailOptions);
    console.log("Nodemailer: OTP email sent.");
  } catch (error) {
    console.error("Nodemailer: Failed to send OTP email", error);
    throw error;
  }
};
