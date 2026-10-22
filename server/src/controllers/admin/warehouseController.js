const { Op } = require("sequelize");
const db = require("../../models");
const HttpError = require("../../utils/httpError");
const { getPaging, paginationInfo } = require("../../utils/pagination");
const { removeUpload } = require("../../middleware/upload");
const { coordinatesFor } = require("../../services/geocode");
const stock = require("../../services/stock");
const { warehouseScope, assertWarehouse } = require("./scope");

const warehouseIncludes = [
  { model: db.City, attributes: ["id", "name"] },
  { model: db.Province, attributes: ["id", "name"] },
];

async function regionFor(provinceId, cityId) {
  const city = await db.City.findOne({ where: { id: cityId, province_id: provinceId }, include: [db.Province] });
  if (!city) throw new HttpError(400, "That city isn't in the selected province.");
  return city;
}

module.exports = {
  // ---------- warehouses ----------

  // GET /api/admin/warehouses
  async warehouses(req, res) {
    const warehouses = await db.Warehouse.findAll({
      include: warehouseIncludes,
      attributes: {
        include: [
          [db.sequelize.literal("(SELECT COUNT(*) FROM Admins a WHERE a.warehouse_id = `Warehouse`.`id` AND a.deletedAt IS NULL)"), "admin_count"],
          [db.sequelize.literal("(SELECT COALESCE(SUM(ws.product_stock), 0) FROM Warehouse_stocks ws WHERE ws.warehouse_id = `Warehouse`.`id` AND ws.deletedAt IS NULL)"), "total_stock"],
        ],
      },
      order: [["warehouse_name", "ASC"]],
    });
    res.json({ data: warehouses });
  },

  // POST /api/admin/warehouses  (multipart, optional "image")
  async createWarehouse(req, res) {
    const { warehouse_name, address_warehouse, province_id, city_id, warehouse_contact } = req.body;
    let city;
    try {
      city = await regionFor(province_id, city_id);
      if (await db.Warehouse.findOne({ where: { warehouse_name } })) throw new HttpError(409, "A warehouse with that name already exists.");
    } catch (error) {
      removeUpload(req.uploadedPath);
      throw error;
    }
    const point = await coordinatesFor({ address: address_warehouse, city, province: city.Province });
    const warehouse = await db.Warehouse.create({
      warehouse_name,
      address_warehouse,
      province_id,
      city_id,
      warehouse_contact,
      latitude: point.latitude,
      longitude: point.longitude,
      warehouse_img: req.uploadedPath || null,
    });
    res.status(201).json({ message: `${warehouse_name} was added.`, data: warehouse });
  },

  // PATCH /api/admin/warehouses/:id
  async updateWarehouse(req, res) {
    const warehouse = await db.Warehouse.findByPk(req.params.id);
    if (!warehouse) {
      removeUpload(req.uploadedPath);
      throw new HttpError(404, "Warehouse not found.");
    }
    const changes = {};
    for (const field of ["warehouse_name", "address_warehouse", "province_id", "city_id", "warehouse_contact"]) {
      if (req.body[field] !== undefined && req.body[field] !== "") changes[field] = req.body[field];
    }
    if (changes.warehouse_name && changes.warehouse_name !== warehouse.warehouse_name && (await db.Warehouse.findOne({ where: { warehouse_name: changes.warehouse_name } }))) {
      removeUpload(req.uploadedPath);
      throw new HttpError(409, "A warehouse with that name already exists.");
    }
    if (changes.address_warehouse || changes.city_id) {
      const city = await regionFor(changes.province_id || warehouse.province_id, changes.city_id || warehouse.city_id);
      const point = await coordinatesFor({ address: changes.address_warehouse || warehouse.address_warehouse, city, province: city.Province });
      changes.latitude = point.latitude;
      changes.longitude = point.longitude;
    }
    const oldImage = req.uploadedPath ? warehouse.warehouse_img : null;
    if (req.uploadedPath) changes.warehouse_img = req.uploadedPath;
    await warehouse.update(changes);
    removeUpload(oldImage);
    res.json({ message: "Warehouse saved.", data: warehouse });
  },

  // DELETE /api/admin/warehouses/:id
  async deleteWarehouse(req, res) {
    const warehouse = await db.Warehouse.findByPk(req.params.id);
    if (!warehouse) throw new HttpError(404, "Warehouse not found.");
    const stockLeft = (await db.Warehouse_stock.sum("product_stock", { where: { warehouse_id: warehouse.id } })) || 0;
    if (stockLeft > 0) throw new HttpError(400, `This warehouse still holds ${stockLeft} items. Transfer them out first.`);
    const openOrders = await db.Order.count({ where: { warehouse_id: warehouse.id, order_status_id: { [Op.in]: [1, 2, 4, 7] } } });
    if (openOrders) throw new HttpError(400, `This warehouse has ${openOrders} open order(s).`);
    const admins = await db.Admin.count({ where: { warehouse_id: warehouse.id } });
    if (admins) throw new HttpError(400, `Move the ${admins} admin(s) of this warehouse to another one first.`);
    await warehouse.destroy();
    res.json({ message: `${warehouse.warehouse_name} was deleted.` });
  },

  // ---------- stock ----------

  // GET /api/admin/stocks?warehouse=&q=&category=&low=true&page=
  async stocks(req, res) {
    const paging = getPaging(req.query, 20);
    const where = {};
    const warehouse = warehouseScope(req);
    if (warehouse) where.warehouse_id = warehouse;
    if (req.query.low === "true") where.product_stock = { [Op.lte]: 5 };
    const productWhere = {};
    if (req.query.q) productWhere.name = { [Op.like]: `%${String(req.query.q).trim()}%` };
    if (req.query.category) productWhere.category_id = Number(req.query.category);

    const { rows, count } = await db.Warehouse_stock.findAndCountAll({
      where,
      attributes: {
        include: [[db.sequelize.literal("(SELECT COALESCE(SUM(rs.reserve_quantity), 0) FROM Reserved_stocks rs WHERE rs.warehouse_stock_id = `Warehouse_stock`.`id`)"), "reserved"]],
      },
      include: [
        {
          model: db.Product,
          where: productWhere,
          attributes: ["id", "name", "price", "is_active"],
          include: [
            { model: db.Category, as: "category", attributes: ["name"], paranoid: false },
            { model: db.Image_product, attributes: ["img_product"], separate: true, order: [["id", "ASC"]] },
          ],
        },
        { model: db.Warehouse, as: "Warehouse", attributes: ["id", "warehouse_name"] },
      ],
      order: [[db.Product, "name", "ASC"], [{ model: db.Warehouse, as: "Warehouse" }, "warehouse_name", "ASC"]],
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });

    res.json({
      data: rows.map((r) => {
        const reserved = Number(r.get("reserved")) || 0;
        return {
          id: r.id,
          quantity: r.product_stock,
          reserved,
          free: r.product_stock - reserved,
          warehouse: { id: r.Warehouse?.id, name: r.Warehouse?.warehouse_name },
          product: {
            id: r.Product.id,
            name: r.Product.name,
            category: r.Product.category?.name,
            is_active: r.Product.is_active,
            image: r.Product.Image_products?.[0]?.img_product || null,
          },
        };
      }),
      pagination: paginationInfo(paging, count),
    });
  },

  // POST /api/admin/stocks  { warehouse_id, product_id, quantity }
  async createStock(req, res) {
    const { warehouse_id, product_id, quantity } = req.body;
    assertWarehouse(req, warehouse_id);
    if (!(await db.Warehouse.findByPk(warehouse_id))) throw new HttpError(404, "Warehouse not found.");
    if (!(await db.Product.findByPk(product_id))) throw new HttpError(404, "Product not found.");
    if (await db.Warehouse_stock.findOne({ where: { warehouse_id, product_id } })) {
      throw new HttpError(409, "This product is already stocked in that warehouse. Adjust the existing row instead.");
    }

    const row = await db.sequelize.transaction(async (transaction) => {
      const created = await stock.ensureRow(warehouse_id, product_id, { transaction });
      if (quantity > 0) await stock.adjust(created, quantity, { adminId: req.admin.id, journal: "Initial stock", transaction });
      return created;
    });
    res.status(201).json({ message: "Stock added.", data: row });
  },

  // PATCH /api/admin/stocks/:id  { change: +5 or -3, note }
  async adjustStock(req, res) {
    const { change, note } = req.body;
    const row = await db.sequelize.transaction(async (transaction) => {
      const found = await db.Warehouse_stock.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!found) throw new HttpError(404, "Stock row not found.");
      assertWarehouse(req, found.warehouse_id);
      if (change < 0) {
        const free = await stock.freeInRow(found, { transaction });
        if (free + change < 0) throw new HttpError(400, `Only ${Math.max(0, free)} can be removed. The rest is reserved for orders.`);
      }
      return stock.adjust(found, change, { adminId: req.admin.id, journal: note || (change > 0 ? "Stock added" : "Stock removed"), transaction });
    });
    res.json({ message: `Stock is now ${row.product_stock}.`, data: row });
  },

  // DELETE /api/admin/stocks/:id  -> only when it's empty
  async deleteStock(req, res) {
    const row = await db.Warehouse_stock.findByPk(req.params.id);
    if (!row) throw new HttpError(404, "Stock row not found.");
    assertWarehouse(req, row.warehouse_id);
    if (row.product_stock > 0) throw new HttpError(400, "Remove or transfer the remaining stock first.");
    if (await db.Reserved_stock.count({ where: { warehouse_stock_id: row.id } })) throw new HttpError(400, "This row is reserved for open orders.");
    await row.destroy();
    res.json({ message: "Stock row removed." });
  },

  // ---------- transfers ----------

  // GET /api/admin/transfers?status=Pending&direction=in|out&page=
  async transfers(req, res) {
    const paging = getPaging(req.query, 15);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const warehouse = warehouseScope(req);
    if (warehouse) {
      if (req.query.direction === "in") where.to_warehouse_id = warehouse;
      else if (req.query.direction === "out") where.from_warehouse_id = warehouse;
      else where[Op.or] = [{ from_warehouse_id: warehouse }, { to_warehouse_id: warehouse }];
    }

    const { rows, count } = await db.Inventory_transfer.findAndCountAll({
      where,
      include: [
        { model: db.Warehouse, as: "FromWarehouse", attributes: ["id", "warehouse_name"], paranoid: false },
        { model: db.Warehouse, as: "ToWarehouse", attributes: ["id", "warehouse_name"], paranoid: false },
        { model: db.Warehouse_stock, paranoid: false, include: [{ model: db.Product, attributes: ["id", "name"], paranoid: false }] },
      ],
      order: [["createdAt", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
    });

    res.json({
      data: rows.map((t) => ({
        id: t.id,
        code: t.transaction_code,
        status: t.status,
        quantity: t.quantity,
        product: t.Warehouse_stock?.Product ? { id: t.Warehouse_stock.Product.id, name: t.Warehouse_stock.Product.name } : null,
        from: { id: t.from_warehouse_id, name: t.FromWarehouse?.warehouse_name },
        to: { id: t.to_warehouse_id, name: t.ToWarehouse?.warehouse_name },
        automatic: String(t.transaction_code).startsWith("AUTO"),
        created_at: t.createdAt,
        can_decide: t.status === "Pending" && (req.admin.isSuper || t.to_warehouse_id === req.admin.warehouse_id),
      })),
      pagination: paginationInfo(paging, count),
    });
  },

  // POST /api/admin/transfers  { from_warehouse_id, to_warehouse_id, product_id, quantity }
  // The sending warehouse starts the transfer, the receiving warehouse approves it.
  async createTransfer(req, res) {
    const { from_warehouse_id, to_warehouse_id, product_id, quantity } = req.body;
    if (from_warehouse_id === to_warehouse_id) throw new HttpError(400, "Pick two different warehouses.");
    assertWarehouse(req, from_warehouse_id);

    const source = await db.Warehouse_stock.findOne({ where: { warehouse_id: from_warehouse_id, product_id } });
    if (!source) throw new HttpError(400, "The sending warehouse doesn't stock this product.");
    if (!(await db.Warehouse.findByPk(to_warehouse_id))) throw new HttpError(404, "Destination warehouse not found.");
    const free = await stock.freeInRow(source);
    if (free < quantity) throw new HttpError(400, `Only ${Math.max(0, free)} can be sent. The rest is reserved for orders.`);

    const transfer = await db.Inventory_transfer.create({
      warehouse_stock_id: source.id,
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      status: "Pending",
      transaction_code: `TRF-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json({ message: "Transfer requested. The receiving warehouse needs to approve it.", data: transfer });
  },

  // POST /api/admin/transfers/:id/approve
  async approveTransfer(req, res) {
    await db.sequelize.transaction(async (transaction) => {
      const transfer = await db.Inventory_transfer.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!transfer || transfer.status !== "Pending") throw new HttpError(400, "This transfer isn't waiting for approval.");
      assertWarehouse(req, transfer.to_warehouse_id);

      const source = await db.Warehouse_stock.findByPk(transfer.warehouse_stock_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!source) throw new HttpError(400, "The source stock no longer exists.");
      const free = await stock.freeInRow(source, { transaction });
      if (free < transfer.quantity) throw new HttpError(400, `The sending warehouse only has ${Math.max(0, free)} free now. Reject this transfer instead.`);

      const target = await stock.ensureRow(transfer.to_warehouse_id, source.product_id, { transaction });
      const [from, to] = await Promise.all([
        db.Warehouse.findByPk(transfer.from_warehouse_id, { transaction, paranoid: false }),
        db.Warehouse.findByPk(transfer.to_warehouse_id, { transaction, paranoid: false }),
      ]);
      await stock.adjust(source, -transfer.quantity, { adminId: req.admin.id, journal: `Sent to ${to.warehouse_name} (${transfer.transaction_code})`, transaction });
      await stock.adjust(target, transfer.quantity, { adminId: req.admin.id, journal: `Received from ${from.warehouse_name} (${transfer.transaction_code})`, transaction });
      await transfer.update({ status: "Approve" }, { transaction });
    });
    res.json({ message: "Transfer approved. Stock has moved." });
  },

  // POST /api/admin/transfers/:id/reject
  async rejectTransfer(req, res) {
    const transfer = await db.Inventory_transfer.findByPk(req.params.id);
    if (!transfer || transfer.status !== "Pending") throw new HttpError(400, "This transfer isn't waiting for approval.");
    assertWarehouse(req, transfer.to_warehouse_id);
    await transfer.update({ status: "Reject" });
    res.json({ message: "Transfer rejected." });
  },

  // ---------- history ----------

  // GET /api/admin/stock-history?warehouse=&product=&year=&month=&page=
  async history(req, res) {
    const paging = getPaging(req.query, 25);
    const where = {};
    const warehouse = warehouseScope(req);
    if (warehouse) where.warehouse_id = warehouse;
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (year) {
      const start = new Date(year, month ? month - 1 : 0, 1);
      const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
      where.timestamp = { [Op.gte]: start, [Op.lt]: end };
    }
    const stockWhere = req.query.product ? { product_id: Number(req.query.product) } : undefined;

    const query = {
      where,
      include: [
        {
          model: db.Warehouse_stock,
          paranoid: false,
          where: stockWhere,
          required: !!stockWhere,
          include: [{ model: db.Product, attributes: ["id", "name"], paranoid: false }],
        },
        { model: db.Warehouse, attributes: ["warehouse_name"], paranoid: false },
        { model: db.Admin, attributes: ["username", "first_name"], paranoid: false },
      ],
    };

    const { rows, count } = await db.History_stock.findAndCountAll({
      ...query,
      order: [["timestamp", "DESC"], ["id", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
    });
    const totals = await db.History_stock.findAll({
      ...query,
      attributes: ["increment_decrement", [db.sequelize.fn("SUM", db.sequelize.col("History_stock.quantity")), "total"]],
      include: query.include.map((inc) => ({ ...inc, attributes: [], include: inc.include?.map((i) => ({ ...i, attributes: [] })) })),
      group: ["increment_decrement"],
      raw: true,
    });

    res.json({
      data: rows.map((h) => ({
        id: h.id,
        at: h.timestamp,
        product: h.Warehouse_stock?.Product?.name || "Removed product",
        warehouse: h.Warehouse?.warehouse_name,
        admin: h.Admin ? h.Admin.first_name || h.Admin.username : "System",
        before: h.stock_before_transfer,
        after: h.stock_after_transfer,
        change: h.increment_decrement === "Decrement" ? -h.quantity : h.quantity,
        note: h.journal,
      })),
      totals: {
        in: Number(totals.find((t) => t.increment_decrement === "Increment")?.total || 0),
        out: Number(totals.find((t) => t.increment_decrement === "Decrement")?.total || 0),
      },
      pagination: paginationInfo(paging, count),
    });
  },
};
