const bcrypt = require("bcryptjs");
const db = require("../../models");
const HttpError = require("../../utils/httpError");
const { adminToken } = require("../../utils/tokens");
const { ROLE } = require("../../utils/constants");

async function sessionAdmin(id) {
  const admin = await db.Admin.findByPk(id, {
    include: [{ model: db.Warehouse, as: "warehouse", attributes: ["id", "warehouse_name"] }],
  });
  if (!admin) return null;
  return {
    id: admin.id,
    username: admin.username,
    first_name: admin.first_name,
    last_name: admin.last_name,
    role: admin.role_id === ROLE.SUPER_ADMIN ? "super" : "warehouse",
    warehouse: admin.warehouse ? { id: admin.warehouse.id, name: admin.warehouse.warehouse_name } : null,
  };
}

module.exports = {
  // POST /api/admin/auth/login
  async login(req, res) {
    const admin = await db.Admin.findOne({ where: { username: req.body.username } });
    if (!admin || !(await bcrypt.compare(req.body.password, admin.password))) {
      throw new HttpError(401, "Wrong username or password.");
    }
    res.json({ message: "Logged in", token: adminToken(admin), admin: await sessionAdmin(admin.id) });
  },

  // GET /api/admin/auth/me
  async me(req, res) {
    const admin = await sessionAdmin(req.admin.id);
    if (!admin) throw new HttpError(401, "Please log in again.");
    res.json({ data: admin });
  },
};
