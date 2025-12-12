import { Schema, model, models, type Document, type Model } from "mongoose";

export interface RateLimitRecord extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<RateLimitRecord>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// TTL index - MongoDB จะลบ document อัตโนมัติเมื่อหมดอายุ
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitRecord> =
  (models?.RateLimit as Model<RateLimitRecord>) ||
  model<RateLimitRecord>("RateLimit", RateLimitSchema);

// =============================================
// Rate Limit Configuration - แก้ไขค่าได้ที่นี่
// =============================================
const MAX_ATTEMPTS = 3; // จำนวนครั้งสูงสุดก่อน block
const COOLDOWN_SECONDS = 10; // รอ 10 วินาที ระหว่างแต่ละครั้ง
const BLOCK_SECONDS = 5 * 60; // block 5 นาที หลังครบ MAX_ATTEMPTS ครั้ง
const INITIAL_COUNT = 1; // count เริ่มต้น

/**
 * Check and update rate limit for a given key
 * @param key - Unique identifier (e.g., "otp:user@email.com")
 * @returns { allowed, remaining, retryAfter, isBlocked }
 */
export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  isBlocked?: boolean;
}> {
  const now = new Date();
  const cooldownEnd = new Date(now.getTime() + COOLDOWN_SECONDS * 1000);
  const blockEnd = new Date(now.getTime() + BLOCK_SECONDS * 1000);

  // หา record ที่มีอยู่
  const record = await RateLimit.findOne({ key });

  // ถ้าไม่เจอ record → สร้างใหม่ (ครั้งแรก)
  if (!record) {
    await RateLimit.create({
      key,
      count: INITIAL_COUNT,
      expiresAt: cooldownEnd,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - INITIAL_COUNT };
  }

  // ถ้าถูก block (เกิน MAX_ATTEMPTS แล้ว) และยังไม่หมดเวลา block
  if (record.count > MAX_ATTEMPTS && record.expiresAt > now) {
    const retryAfter = Math.ceil(
      (record.expiresAt.getTime() - now.getTime()) / 1000
    );
    return { allowed: false, remaining: 0, retryAfter, isBlocked: true };
  }

  // ถ้า block หมดอายุแล้ว → reset
  if (record.count > MAX_ATTEMPTS && record.expiresAt <= now) {
    await RateLimit.updateOne(
      { _id: record._id },
      { count: INITIAL_COUNT, expiresAt: cooldownEnd }
    );
    return { allowed: true, remaining: MAX_ATTEMPTS - INITIAL_COUNT };
  }

  // ถ้ายังอยู่ใน cooldown
  if (record.expiresAt > now) {
    const retryAfter = Math.ceil(
      (record.expiresAt.getTime() - now.getTime()) / 1000
    );
    return {
      allowed: false,
      remaining: MAX_ATTEMPTS - record.count,
      retryAfter,
      isBlocked: false,
    };
  }

  // cooldown หมดแล้ว → เช็คว่าครบ MAX_ATTEMPTS ยัง
  const newCount = record.count + 1;

  // ถ้าครั้งนี้จะทำให้เกิน MAX_ATTEMPTS → block ทันที ไม่ให้ส่ง และเริ่มนับ BLOCK time
  if (newCount > MAX_ATTEMPTS) {
    await RateLimit.updateOne(
      { _id: record._id },
      { count: newCount, expiresAt: blockEnd }
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfter: BLOCK_SECONDS,
      isBlocked: true,
    };
  }

  // ยังไม่เกิน MAX → อนุญาต และ set cooldown ปกติ
  await RateLimit.updateOne(
    { _id: record._id },
    { count: newCount, expiresAt: cooldownEnd }
  );

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - newCount,
  };
}
