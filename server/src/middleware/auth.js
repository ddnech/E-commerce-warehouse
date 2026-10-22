const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { ROLE } = require("../utils/constants");

function readToken(req, res) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    res.status(401).json({ message: "Please log in first." });
    return null;
  }
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({
      message: error.name === "TokenExpiredError" ? "Your session has expired. Please log in again." : "Invalid token. Please log in again.",
    });
    return null;
  }
}

/** Shoppers only. */
function requireUser(req, res, next) {
  const payload = readToken(req, res);
  if (!payload) return;
  if (payload.type !== "user") return res.status(403).json({ message: "This is for shoppers only." });
  req.user = payload;
  next();
}

/** Any admin. Pass `superOnly` for things only the super admin may do. */
function requireAdmin({ superOnly = false } = {}) {
  return (req, res, next) => {
    const payload = readToken(req, res);
    if (!payload) return;
    if (payload.type !== "admin") return res.status(403).json({ message: "Admins only." });
    if (superOnly && payload.role_id !== ROLE.SUPER_ADMIN) {
      return res.status(403).json({ message: "Only the super admin can do this." });
    }
    req.admin = payload;
    req.admin.isSuper = payload.role_id === ROLE.SUPER_ADMIN;
    next();
  };
}

/** Logged in shopper if there is one, but don't block anonymous visitors. */
function optionalUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (payload.type === "user") req.user = payload;
    } catch {
      // ignore, treat as anonymous
    }
  }
  next();
}

module.exports = { requireUser, requireAdmin, optionalUser };
