import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { emailOTP } from "better-auth/plugins";

function load(path, modules, context = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Request, Response, console, ...context,
    require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; },
  });
  return exports;
}

async function configuration(send = async () => {}) {
  let config;
  let otpOptions;
  const background = [];
  const api = load("../lib/better-auth/auth.ts", {
    "better-auth": { betterAuth: options => { config = options; return {}; } },
    "better-auth/adapters/mongodb": { mongodbAdapter: () => ({}) },
    "@/database/mongoose": { connecttoDatabase: async () => ({ connection: { db: {} } }) },
    "better-auth/next-js": { nextCookies: () => ({ id: "test-cookies" }) },
    "better-auth/plugins": { emailOTP: options => { otpOptions = options; return { id: "test-email-otp" }; } },
    "../nodemailer": { sendOTPEmail: send },
    "next/server": { after: task => background.push(task) },
  }, { process: { env: { BETTER_AUTH_URL: "https://stocks.example", BETTER_AUTH_SECRET: "test-secret-at-least-thirty-two-characters" } } });
  await api.getAuth();
  return { config, otpOptions, background };
}

async function fixture() {
  const sent = [];
  const { config, otpOptions, background } = await configuration(async data => { sent.push(data); });
  const db = { user: [], session: [], account: [], verification: [], rateLimit: [] };
  let sequence = 123450;
  const create = () => betterAuth({
    ...config, logger: { level: "error" }, database: memoryAdapter(db),
    plugins: [emailOTP({ ...otpOptions, generateOTP: () => String(++sequence) })],
  });
  const auth = create();
  const { user } = await auth.api.signUpEmail({ body: { email: "owner@example.com", password: "old-test-password", name: "Test Owner" } });
  await (await auth.$context).internalAdapter.updateUser(user.id, { emailVerified: true });
  const route = (instance = auth) => load("../app/api/auth/[...all]/route.ts", {
    "@/lib/better-auth/auth": { getAuth: async () => instance },
    "better-auth/next-js": { toNextJsHandler: instance => ({ POST: instance.handler, GET: instance.handler }) },
  });
  const call = async (path, body, ip = "203.0.113.10", instance = auth) => {
    const response = await route(instance).POST(new Request(`https://stocks.example/api/auth/${path}`, {
      method: "POST", headers: { "content-type": "application/json", origin: "https://stocks.example", "x-forwarded-for": ip }, body: JSON.stringify(body),
    }));
    await Promise.all(background.splice(0).map(task => task()));
    return { status: response.status, body: await response.json(), response };
  };
  const requestCode = (email = "owner@example.com", ip) => call("email-otp/request-password-reset", { email }, ip);
  const resetPassword = (otp, ip, email = "owner@example.com") => call("email-otp/reset-password", { email, otp, password: "new-test-password" }, ip);
  return { auth, db, sent, create, call, requestCode, resetPassword };
}

test("password reset config hashes OTPs, bounds lifetime/attempts, persists rate limits and revokes sessions", async () => {
  const mails = [];
  const { config, otpOptions, background } = await configuration(async mail => mails.push(mail));
  assert.equal(config.rateLimit.enabled, true);
  assert.equal(config.rateLimit.storage, "database");
  assert.equal(config.emailAndPassword.revokeSessionsOnPasswordReset, true);
  assert.equal(otpOptions.otpLength, 6);
  assert.equal(otpOptions.expiresIn, 300);
  assert.equal(otpOptions.allowedAttempts, 3);
  assert.equal(otpOptions.storeOTP, "hashed");
  assert.equal(otpOptions.rateLimit.window, 60);
  assert.equal(otpOptions.rateLimit.max, 3);
  await otpOptions.sendVerificationOTP({ email: "owner@example.com", otp: "123456", type: "forget-password" });
  await otpOptions.sendVerificationOTP({ email: "owner@example.com", otp: "654321", type: "email-verification" });
  assert.equal(mails[0].purpose, "password-reset");
  assert.equal(mails[1].purpose, "verification");
  config.advanced.backgroundTasks.handler(Promise.resolve());
  assert.equal(background.length, 1);
  await background[0]();
  const failing = await configuration(async () => { throw new Error("SMTP unavailable"); });
  await assert.rejects(failing.otpOptions.sendVerificationOTP({ email: "owner@example.com", otp: "123456", type: "forget-password" }), /SMTP unavailable/);
});

test("reset API rejects malformed email/code/password before initializing auth; other routes are unchanged", async () => {
  let initialized = 0;
  const route = load("../app/api/auth/[...all]/route.ts", {
    "@/lib/better-auth/auth": { getAuth: async () => { initialized++; return {}; } },
    "better-auth/next-js": { toNextJsHandler: () => ({ POST: async () => Response.json({ passed: true }), GET: async () => Response.json({ passed: true }) }) },
  });
  for (const path of ["email-otp/request-password-reset", "forget-password/email-otp", "email-otp/reset-password"]) {
    for (const body of [null, [], {}, { email: 42 }, { email: "not-email" }, { email: `${"a".repeat(250)}@example.com` }]) {
      const response = await route.POST(new Request(`https://stocks.example/api/auth/${path}`, { method: "POST", body: JSON.stringify(body) }));
      assert.equal(response.status, 400);
    }
  }
  for (const overrides of [{ otp: "12" }, { otp: "ABCDEF" }, { otp: 123456 }, { password: "short" }, { password: "a".repeat(129) }, { password: null }]) {
    const response = await route.POST(new Request("https://stocks.example/api/auth/email-otp/reset-password", {
      method: "POST", body: JSON.stringify({ email: "owner@example.com", otp: "123456", password: "a-valid-password", ...overrides }),
    }));
    assert.equal(response.status, 400);
  }
  const malformed = await route.POST(new Request("https://stocks.example/api/auth/email-otp/request-password-reset", { method: "POST", body: "{" }));
  assert.equal(malformed.status, 400);
  assert.equal(initialized, 0);
  await route.POST(new Request("https://stocks.example/api/auth/sign-in/email", { method: "POST", body: "{}" }));
  assert.equal(initialized, 1);
  const proxy = load("../proxy.ts", { "next/server": {}, "better-auth/cookies": {} });
  assert.equal(new RegExp(`^${proxy.config.matcher[0]}$`).test("/forgot-password"), false);
  assert.equal(new RegExp(`^${proxy.config.matcher[0]}$`).test("/watchlist"), true);
});

test("OTP email distinguishes recovery from verification, includes both reset languages and accurate expiry", async () => {
  const templates = load("../lib/nodemailer/templates.ts", {});
  const sent = [];
  let fail = false;
  const mailer = load("../lib/nodemailer/index.ts", {
    nodemailer: { default: { createTransport: () => ({ sendMail: async mail => { if (fail) throw new Error("SMTP unavailable"); sent.push(mail); } }) } },
    "./templates": templates,
  }, { process: { env: {} } });
  await mailer.sendOTPEmail({ email: "owner@example.com", otp: "123456", purpose: "password-reset" });
  assert.match(sent[0].subject, /Reset Your Password/);
  assert.match(sent[0].subject, /ตั้งรหัสผ่านใหม่/);
  assert.match(sent[0].html, /123456/);
  assert.match(sent[0].html, /5 minutes/);
  assert.match(sent[0].text, /5 นาที/);
  assert.doesNotMatch(sent[0].html, /\{\{|complete your sign-up|10 minutes/);
  await mailer.sendOTPEmail({ email: "owner@example.com", otp: "654321" });
  assert.equal(sent[1].subject, "Verify Your Email - StockMarket");
  assert.match(sent[1].html, /complete your sign-up/);
  fail = true;
  await assert.rejects(mailer.sendOTPEmail({ email: "owner@example.com", otp: "123456" }), /SMTP unavailable/);
});

test("real Better Auth reset hides missing accounts, stores hashes, consumes codes once and revokes old sessions", async () => {
  const f = await fixture();
  const login = await f.call("sign-in/email", { email: "owner@example.com", password: "old-test-password" });
  assert.equal(login.status, 200);
  const sessionCookie = login.response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  const session = async () => (await f.auth.handler(new Request("https://stocks.example/api/auth/get-session", { headers: { cookie: sessionCookie } }))).json();
  assert.ok((await session()).user);
  const registered = await f.requestCode();
  const unknown = await f.requestCode("missing@example.com", "203.0.113.11");
  assert.equal(registered.status, 200);
  assert.deepEqual(unknown.body, registered.body);
  assert.equal(f.sent.length, 1);
  const code = f.sent[0].otp;
  assert.match(code, /^\d{6}$/);
  const record = f.db.verification.find(item => item.identifier.includes("forget-password"));
  assert.ok(record);
  assert.ok(!record.value.includes(code));
  assert.ok(record.expiresAt.getTime() - Date.now() <= 300_000);
  assert.equal(f.db.verification.some(item => item.identifier.includes("missing@example.com")), false);
  const wrongAccount = await f.resetPassword(code, "203.0.113.12", "missing@example.com");
  assert.notEqual(wrongAccount.status, 200);
  assert.equal((await f.resetPassword(code)).status, 200);
  assert.equal(await session(), null);
  assert.notEqual((await f.resetPassword(code, "203.0.113.13")).status, 200);
  assert.notEqual((await f.call("sign-in/email", { email: "owner@example.com", password: "old-test-password" }, "203.0.113.14")).status, 200);
  assert.equal((await f.call("sign-in/email", { email: "owner@example.com", password: "new-test-password" }, "203.0.113.15")).status, 200);
});

test("real OTP reset rejects expired codes and locks out codes after three incorrect attempts", async () => {
  const expired = await fixture();
  await expired.requestCode();
  expired.db.verification[0].expiresAt = new Date(Date.now() - 1_000);
  assert.notEqual((await expired.resetPassword(expired.sent[0].otp)).status, 200);
  const locked = await fixture();
  await locked.requestCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.notEqual((await locked.resetPassword("000000", `203.0.113.${20 + attempt}`)).status, 200);
  }
  const result = await locked.resetPassword(locked.sent[0].otp, "203.0.113.30");
  assert.notEqual(result.status, 200);
  assert.equal(result.body.code, "TOO_MANY_ATTEMPTS");
});

test("resending rotates old codes and API rate limits persist across auth instances", async () => {
  const f = await fixture();
  await f.requestCode();
  const oldCode = f.sent[0].otp;
  await f.requestCode();
  const newCode = f.sent[1].otp;
  assert.notEqual(oldCode, newCode);
  assert.notEqual((await f.resetPassword(oldCode)).status, 200);
  assert.equal((await f.resetPassword(newCode)).status, 200);
  await f.requestCode();
  const blocked = await f.call("email-otp/request-password-reset", { email: "owner@example.com" }, "203.0.113.10", f.create());
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.response.headers.get("X-Retry-After")) > 0);
  assert.equal(f.sent.length, 3);
});
