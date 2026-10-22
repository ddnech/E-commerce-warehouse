const { QueryTypes } = require("sequelize");
const dayjs = require("dayjs");
const db = require("../../models");
const { STATUS } = require("../../utils/constants");
const { orderIncludes, serializeOrder } = require("../../services/orders");
const { warehouseScope } = require("./scope");

// Orders count as sales once the payment is accepted.
const PAID = [STATUS.PROCESSING, STATUS.SHIPPED, STATUS.COMPLETED];

const select = (sql, replacements) => db.sequelize.query(sql, { type: QueryTypes.SELECT, replacements });

/** Builds the shared WHERE for sales queries. Returns { sql, params }. */
function salesWhere({ warehouse, from, to, category, product }) {
  const parts = ["o.order_status_id IN (:paid)", "o.createdAt >= :from", "o.createdAt < :to"];
  const params = { paid: PAID, from, to };
  if (warehouse) {
    parts.push("o.warehouse_id = :warehouse");
    params.warehouse = warehouse;
  }
  if (category) {
    parts.push("p.category_id = :category");
    params.category = category;
  }
  if (product) {
    parts.push("p.id = :product");
    params.product = product;
  }
  return { sql: parts.join(" AND "), params };
}

const SALES_FROM = `FROM Order_details od
  JOIN Orders o ON o.id = od.order_id
  JOIN Warehouse_stocks ws ON ws.id = od.warehouse_stock_id
  JOIN Products p ON p.id = ws.product_id
  LEFT JOIN Categories c ON c.id = p.category_id`;

module.exports = {
  // GET /api/admin/dashboard
  async dashboard(req, res) {
    const warehouse = warehouseScope(req);
    const scope = warehouse ? { warehouse_id: warehouse } : {};
    const monthStart = dayjs().startOf("month").toDate();
    const yearAgo = dayjs().subtract(11, "month").startOf("month").toDate();

    const [revenueRow] = await select(
      `SELECT COALESCE(SUM(o.total_price), 0) AS revenue, COUNT(*) AS orders FROM Orders o
       WHERE o.order_status_id IN (:paid) AND o.createdAt >= :from ${warehouse ? "AND o.warehouse_id = :warehouse" : ""}`,
      { paid: PAID, from: monthStart, warehouse }
    );

    const monthly = await select(
      `SELECT DATE_FORMAT(o.createdAt, '%Y-%m') AS month, COALESCE(SUM(o.total_price), 0) AS revenue, COUNT(*) AS orders
       FROM Orders o WHERE o.order_status_id IN (:paid) AND o.createdAt >= :from ${warehouse ? "AND o.warehouse_id = :warehouse" : ""}
       GROUP BY month ORDER BY month`,
      { paid: PAID, from: yearAgo, warehouse }
    );
    // Fill in months with no sales so the chart has all 12 bars.
    const series = Array.from({ length: 12 }, (_, i) => {
      const key = dayjs(yearAgo).add(i, "month").format("YYYY-MM");
      const row = monthly.find((m) => m.month === key);
      return { month: key, revenue: Number(row?.revenue || 0), orders: Number(row?.orders || 0) };
    });

    const topWhere = salesWhere({ warehouse, from: monthStart, to: dayjs().add(1, "day").toDate() });
    const top = await select(
      `SELECT p.id, p.name, SUM(od.quantity) AS quantity, SUM(od.quantity * od.price) AS revenue ${SALES_FROM}
       WHERE ${topWhere.sql} GROUP BY p.id, p.name ORDER BY quantity DESC LIMIT 5`,
      topWhere.params
    );

    const lowStock = await select(
      `SELECT ws.id, p.name AS product, w.warehouse_name AS warehouse, ws.product_stock AS quantity,
         ws.product_stock - COALESCE((SELECT SUM(rs.reserve_quantity) FROM Reserved_stocks rs WHERE rs.warehouse_stock_id = ws.id), 0) AS free
       FROM Warehouse_stocks ws JOIN Products p ON p.id = ws.product_id AND p.deletedAt IS NULL AND p.is_active = 1
       JOIN Warehouses w ON w.id = ws.warehouse_id
       WHERE ws.deletedAt IS NULL ${warehouse ? "AND ws.warehouse_id = :warehouse" : ""}
       HAVING free <= 5 ORDER BY free ASC LIMIT 6`,
      { warehouse }
    );

    const statusCounts = await db.Order.findAll({
      where: scope,
      attributes: ["order_status_id", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      group: ["order_status_id"],
      raw: true,
    });
    const countFor = (id) => Number(statusCounts.find((s) => s.order_status_id === id)?.count || 0);

    const recent = await db.Order.findAll({ where: scope, include: orderIncludes({ withUser: true }), order: [["createdAt", "DESC"]], limit: 5 });

    res.json({
      data: {
        month: { revenue: Number(revenueRow.revenue), orders: Number(revenueRow.orders) },
        todo: { to_confirm: countFor(STATUS.WAITING_CONFIRMATION), to_ship: countFor(STATUS.PROCESSING), transfers: await db.Inventory_transfer.count({ where: { status: "Pending", ...(warehouse ? { to_warehouse_id: warehouse } : {}) } }) },
        totals: {
          customers: await db.User.count(),
          products: await db.Product.count({ where: { is_active: true } }),
          warehouses: await db.Warehouse.count(),
          categories: await db.Category.count(),
        },
        series,
        top: top.map((t) => ({ id: t.id, name: t.name, quantity: Number(t.quantity), revenue: Number(t.revenue) })),
        low_stock: lowStock.map((l) => ({ ...l, quantity: Number(l.quantity), free: Number(l.free) })),
        recent: recent.map(serializeOrder),
      },
    });
  },

  // GET /api/admin/reports/sales?year=2026&month=10&warehouse=&category=&product=
  async sales(req, res) {
    const warehouse = warehouseScope(req);
    const year = Number(req.query.year) || dayjs().year();
    const month = Number(req.query.month) || null;
    const from = month ? dayjs(`${year}-${String(month).padStart(2, "0")}-01`).toDate() : dayjs(`${year}-01-01`).toDate();
    const to = month ? dayjs(from).add(1, "month").toDate() : dayjs(from).add(1, "year").toDate();
    const filters = { warehouse, from, to, category: Number(req.query.category) || null, product: Number(req.query.product) || null };
    const { sql, params } = salesWhere(filters);

    const [summary] = await select(
      `SELECT COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(od.quantity), 0) AS items, COALESCE(SUM(od.quantity * od.price), 0) AS revenue ${SALES_FROM} WHERE ${sql}`,
      params
    );
    const byProduct = await select(
      `SELECT p.id, p.name, c.name AS category, SUM(od.quantity) AS quantity, SUM(od.quantity * od.price) AS revenue ${SALES_FROM}
       WHERE ${sql} GROUP BY p.id, p.name, c.name ORDER BY revenue DESC LIMIT 50`,
      params
    );
    const byCategory = await select(
      `SELECT c.id, c.name, SUM(od.quantity) AS quantity, SUM(od.quantity * od.price) AS revenue ${SALES_FROM}
       WHERE ${sql} GROUP BY c.id, c.name ORDER BY revenue DESC`,
      params
    );
    const byWarehouse = await select(
      `SELECT w.id, w.warehouse_name AS name, SUM(od.quantity * od.price) AS revenue ${SALES_FROM}
       JOIN Warehouses w ON w.id = o.warehouse_id WHERE ${sql} GROUP BY w.id, w.warehouse_name ORDER BY revenue DESC`,
      params
    );
    const timeline = await select(
      `SELECT ${month ? "DAY(o.createdAt)" : "MONTH(o.createdAt)"} AS bucket, SUM(od.quantity * od.price) AS revenue ${SALES_FROM}
       WHERE ${sql} GROUP BY bucket ORDER BY bucket`,
      params
    );
    const buckets = month ? dayjs(from).daysInMonth() : 12;

    const years = await select("SELECT DISTINCT YEAR(createdAt) AS year FROM Orders ORDER BY year DESC");

    const num = (rows) => rows.map((r) => ({ ...r, quantity: r.quantity !== undefined ? Number(r.quantity) : undefined, revenue: Number(r.revenue) }));
    res.json({
      data: {
        period: { year, month },
        summary: { orders: Number(summary.orders), items: Number(summary.items), revenue: Number(summary.revenue) },
        by_product: num(byProduct),
        by_category: num(byCategory),
        by_warehouse: num(byWarehouse),
        timeline: Array.from({ length: buckets }, (_, i) => ({
          bucket: i + 1,
          revenue: Number(timeline.find((t) => Number(t.bucket) === i + 1)?.revenue || 0),
        })),
        years: [...new Set([dayjs().year(), ...years.map((y) => Number(y.year))])].sort((a, b) => b - a),
      },
    });
  },
};

