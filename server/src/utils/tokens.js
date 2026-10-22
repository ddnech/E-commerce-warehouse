const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

/** Login token for a shopper. */
const userToken = (user) =>
  jwt.sign({ id: user.id, type: "user", role_id: user.role_id }, env.jwtSecret, { expiresIn: env.userTokenExpiresIn });

/** Login token for an admin. Carries the warehouse so routes can limit what they see. */
const adminToken = (admin) =>
  jwt.sign(
    { id: admin.id, type: "admin", role_id: admin.role_id, warehouse_id: admin.warehouse_id ?? null },
    env.jwtSecret,
    { expiresIn: env.adminTokenExpiresIn }
  );

/** Random string for email links. */
const randomToken = () => crypto.randomBytes(32).toString("hex");

module.exports = { userToken, adminToken, randomToken };
