const path = require("path");
const fs = require("fs");

// One .env file at the project root drives everything.
// Inside Docker there is no file, the values come from docker-compose instead.
const rootEnv = path.resolve(__dirname, "..", "..", "..", ".env");
const serverEnv = path.resolve(__dirname, "..", "..", ".env");
const envFile = [serverEnv, rootEnv].find((file) => fs.existsSync(file));
if (envFile) {
  require("dotenv").config({ path: envFile, quiet: true });
}

process.env.TZ = process.env.APP_TIMEZONE || process.env.TZ || "Asia/Jakarta";

function currentOffset() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.API_PORT || process.env.PORT || 8200),
  timezone: process.env.TZ,
  appUrl: (process.env.APP_URL || "http://localhost:5175").replace(/\/$/, ""),
  jwtSecret: process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET,
  userTokenExpiresIn: process.env.USER_TOKEN_EXPIRES_IN || "7d",
  adminTokenExpiresIn: process.env.ADMIN_TOKEN_EXPIRES_IN || "12h",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads")),

  // Shop rules
  paymentWindowHours: Number(process.env.PAYMENT_WINDOW_HOURS || 24),
  autoCompleteDays: Number(process.env.AUTO_COMPLETE_DAYS || 7),
  bankAccount: process.env.BANK_ACCOUNT || "BCA 123 456 7890 a.n. PT Furnifor Indonesia",

  // Optional outside services. Leave a key empty and the app falls back to a built-in version.
  rajaongkirKey: process.env.RAJAONGKIR_API_KEY || process.env.KEY_RAJAONGKIR || "",
  rajaongkirUrl: (process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1").replace(/\/$/, ""),
  opencageKey: process.env.OPENCAGE_API_KEY || process.env.KEY_OPENCAGE || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",

  db: {
    dialect: process.env.DB_DIALECT || "mysql",
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "furnifor",
    username: process.env.DB_USER || "furnifor",
    password: process.env.DB_PASSWORD || "furnifor",
    timezone: process.env.DB_TIMEZONE || currentOffset(),
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM || "Furnifor <no-reply@furnifor.local>",
  },
};

if (!env.jwtSecret) {
  if (env.nodeEnv === "production") {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }
  env.jwtSecret = "dev-only-secret-change-me";
  console.warn("JWT_SECRET is not set, using a throwaway dev secret.");
}

module.exports = env;
