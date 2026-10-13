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
  purpose = "verification",
}: {
  email: string;
  otp: string;
  purpose?: "verification" | "password-reset";
}) => {
  const isReset = purpose === "password-reset";
  const title = isReset ? "Reset Your Password / ตั้งรหัสผ่านใหม่" : "Verify Your Email";
  const description = isReset
    ? "Use this code to reset your StockMarket password.<br>ใช้รหัสนี้เพื่อตั้งรหัสผ่าน StockMarket ใหม่"
    : "Please use the verification code below to complete your sign-up.";
  const expiry = isReset
    ? "This code expires in 5 minutes. Never share it. If you did not request a password reset, ignore this email; your password will not change.<br>รหัสมีอายุ 5 นาที ห้ามบอกรหัสแก่ผู้อื่น หากไม่ได้ขอตั้งรหัสผ่านใหม่ ให้ละเว้นอีเมลนี้ รหัสผ่านของคุณจะไม่เปลี่ยน"
    : "This code will expire in 5 minutes. If you didn't request this code, you can safely ignore this email.";
  const htmlTemplate = OTP_EMAIL_TEMPLATE.replace("{{otp}}", otp)
    .replaceAll("{{title}}", title)
    .replace("{{description}}", description)
    .replace("{{expiry}}", expiry);

  const mailOptions = {
    from: `"StockMarket" <no-reply@stockmarket.com>`,
    to: email,
    subject: isReset ? "Reset Your Password / ตั้งรหัสผ่านใหม่ - StockMarket" : "Verify Your Email - StockMarket",
    text: `${title}\n${isReset ? "Your password reset code / รหัสตั้งรหัสผ่านใหม่" : "Your verification code"}: ${otp}\n${expiry.replace("<br>", "\n")}`,
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};
