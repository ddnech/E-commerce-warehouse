const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../../models");
const HttpError = require("../../utils/httpError");
const { ROLE } = require("../../utils/constants");
const { getPaging, paginationInfo } = require("../../utils/pagination");

const adminView = (a) => ({
  id: a.id,
  username: a.username,
  first_name: a.first_name,
  last_name: a.last_name,
  role: a.role_id === ROLE.SUPER_ADMIN ? "super" : "warehouse",
  warehouse: a.warehouse ? { id: a.warehouse.id, name: a.warehouse.warehouse_name } : null,
  created_at: a.createdAt,
});

const warehouseInclude = { model: db.Warehouse, as: "warehouse", attributes: ["id", "warehouse_name"], paranoid: false };

module.exports = {
  // GET /api/admin/admins?q=&warehouse=
  async admins(req, res) {
    const where = {};
    if (req.query.q) where[Op.or] = ["username", "first_name", "last_name"].map((f) => ({ [f]: { [Op.like]: `%${req.query.q}%` } }));
    if (req.query.warehouse) where.warehouse_id = Number(req.query.warehouse);
    const admins = await db.Admin.findAll({ where, include: [warehouseInclude], order: [["role_id", "ASC"], ["first_name", "ASC"]] });
    res.json({ data: admins.map(adminView) });
  },

  // POST /api/admin/admins  -> always a warehouse admin
  async createAdmin(req, res) {
    const { username, first_name, last_name, password, warehouse_id } = req.body;
    if (await db.Admin.findOne({ where: { username }, paranoid: false })) throw new HttpError(409, "That username is taken.");
    if (!(await db.Warehouse.findByPk(warehouse_id))) throw new HttpError(400, "That warehouse doesn't exist.");
    const admin = await db.Admin.create({ username, first_name, last_name, password: await bcrypt.hash(password, 10), warehouse_id, role_id: ROLE.ADMIN });
    await admin.reload({ include: [warehouseInclude] });
    res.status(201).json({ message: `${first_name} can now log in as ${username}.`, data: adminView(admin) });
  },

  // PATCH /api/admin/admins/:id  { first_name, last_name, warehouse_id, password }
  async updateAdmin(req, res) {
    const admin = await db.Admin.findByPk(req.params.id);
    if (!admin) throw new HttpError(404, "Admin not found.");
    const changes = {};
    for (const field of ["first_name", "last_name"]) if (req.body[field]) changes[field] = req.body[field];
    if (req.body.warehouse_id) {
      if (admin.role_id === ROLE.SUPER_ADMIN) throw new HttpError(400, "The super admin isn't tied to a warehouse.");
      if (!(await db.Warehouse.findByPk(req.body.warehouse_id))) throw new HttpError(400, "That warehouse doesn't exist.");
      changes.warehouse_id = req.body.warehouse_id;
    }
    if (req.body.password) changes.password = await bcrypt.hash(req.body.password, 10);
    await admin.update(changes);
    await admin.reload({ include: [warehouseInclude] });
    res.json({ message: "Admin saved.", data: adminView(admin) });
  },

  // DELETE /api/admin/admins/:id
  async deleteAdmin(req, res) {
    const admin = await db.Admin.findByPk(req.params.id);
    if (!admin) throw new HttpError(404, "Admin not found.");
    if (admin.role_id === ROLE.SUPER_ADMIN) throw new HttpError(400, "The super admin can't be deleted.");
    await admin.destroy();
    res.json({ message: `${admin.username} can no longer log in.` });
  },

  // GET /api/admin/users?q=&page=
  async users(req, res) {
    const paging = getPaging(req.query, 20);
    const where = {};
    if (req.query.q) where[Op.or] = [{ username: { [Op.like]: `%${req.query.q}%` } }, { email: { [Op.like]: `%${req.query.q}%` } }];
    const { rows, count } = await db.User.findAndCountAll({
      where,
      attributes: {
        exclude: ["password", "verify_token", "reset_password_token"],
        include: [[db.sequelize.literal("(SELECT COUNT(*) FROM Orders o WHERE o.user_id = `User`.`id`)"), "order_count"]],
      },
      include: [{ model: db.User_detail, attributes: ["first_name", "last_name", "phone"] }],
      order: [["createdAt", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
    });
    res.json({
      data: rows.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.User_detail ? `${u.User_detail.first_name} ${u.User_detail.last_name || ""}`.trim() : "",
        phone: u.User_detail?.phone || null,
        verified: !!u.is_verify,
        signed_up_with: u.by_form ? "email" : "google",
        orders: Number(u.get("order_count")),
        joined: u.createdAt,
      })),
      pagination: paginationInfo(paging, count),
    });
  },
};
