const { Op } = require("sequelize");
const db = require("../../models");
const env = require("../../config/env");
const HttpError = require("../../utils/httpError");
const { STATUS } = require("../../utils/constants");
const { getPaging, paginationInfo } = require("../../utils/pagination");
const { sendMail } = require("../../utils/mailer");
const stock = require("../../services/stock");
const { orderIncludes, serializeOrder, cancel, STATUS_KEY } = require("../../services/orders");
const { warehouseScope, assertWarehouse } = require("./scope");

const KEY_TO_ID = Object.fromEntries(Object.entries(STATUS_KEY).map(([id, key]) => [key, Number(id)]));

/** Loads an order the admin is allowed to touch, locked for the transaction. */
async function loadOrder(req, transaction) {
  const order = await db.Order.findByPk(req.params.id, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!order) throw new HttpError(404, "Order not found.");
  assertWarehouse(req, order.warehouse_id);
  order.User = await db.User.findByPk(order.user_id, { include: [db.User_detail], transaction });
  return order;
}

function notify(order, subject, paragraphs) {
  const user = order.User;
  if (!user) return;
  sendMail({
    to: user.email,
    subject,
    name: user.User_detail?.first_name || user.username,
    paragraphs,
    button: { label: "View my order", url: `${env.appUrl}/account/orders/${order.no_invoice}` },
  });
}

async function respond(res, id, message) {
  const order = await db.Order.findByPk(id, { include: orderIncludes({ withUser: true }) });
  res.json({ message, data: serializeOrder(order) });
}

function requireStatus(order, allowed, message) {
  if (!allowed.includes(order.order_status_id)) throw new HttpError(400, message);
}

module.exports = {
  // GET /api/admin/orders?status=waiting_confirmation&warehouse=&q=&from=&to=&page=
  async list(req, res) {
    const paging = getPaging(req.query, 15);
    const where = {};
    const warehouse = warehouseScope(req);
    if (warehouse) where.warehouse_id = warehouse;
    const status = KEY_TO_ID[req.query.status] || Number(req.query.status);
    if (status) where.order_status_id = status;
    if (req.query.q) where.no_invoice = { [Op.like]: `%${String(req.query.q).trim()}%` };
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(`${req.query.from}T00:00:00`);
      if (req.query.to) where.createdAt[Op.lte] = new Date(`${req.query.to}T23:59:59`);
    }

    const { rows, count } = await db.Order.findAndCountAll({
      where,
      include: orderIncludes({ withUser: true }),
      order: [["createdAt", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });

    // Counts per status for the tabs, within the same warehouse scope.
    const countWhere = warehouse ? { warehouse_id: warehouse } : {};
    const counts = await db.Order.findAll({
      where: countWhere,
      attributes: ["order_status_id", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      group: ["order_status_id"],
      raw: true,
    });

    res.json({
      data: rows.map(serializeOrder),
      pagination: paginationInfo(paging, count),
      counts: Object.fromEntries(counts.map((c) => [STATUS_KEY[c.order_status_id], Number(c.count)])),
    });
  },

  // GET /api/admin/orders/:id
  async detail(req, res) {
    const order = await db.Order.findByPk(req.params.id, { include: orderIncludes({ withUser: true }) });
    if (!order) throw new HttpError(404, "Order not found.");
    assertWarehouse(req, order.warehouse_id);
    res.json({ data: serializeOrder(order) });
  },

  // POST /api/admin/orders/:id/accept  -> payment is fine, start processing
  async accept(req, res) {
    let order;
    await db.sequelize.transaction(async (transaction) => {
      order = await loadOrder(req, transaction);
      requireStatus(order, [STATUS.WAITING_CONFIRMATION], "Only orders waiting for payment confirmation can be accepted.");

      // Make sure the shipping warehouse really has every item. Anything missing is moved in
      // from the nearest warehouses that have it.
      const reservations = await db.Reserved_stock.findAll({
        where: { order_id: order.id },
        include: [{ model: db.Warehouse_stock, as: "WarehouseProductReservation" }],
        transaction,
      });
      for (const r of reservations) {
        await stock.pullFromNearest(r.WarehouseProductReservation, r.reserve_quantity, {
          adminId: req.admin.id,
          excludeOrderId: order.id,
          reason: `order ${order.no_invoice}`,
          transaction,
        });
      }
      await order.update({ order_status_id: STATUS.PROCESSING, cancel_reason: null }, { transaction });
    });

    notify(order, `Payment received for ${order.no_invoice}`, [
      "We've confirmed your payment. Your order is being prepared for shipping.",
    ]);
    await respond(res, order.id, "Payment accepted. The order is now being processed.");
  },

  // POST /api/admin/orders/:id/reject  { reason }  -> receipt isn't valid, customer can upload again
  async reject(req, res) {
    const reason = String(req.body?.reason || "").trim().slice(0, 200) || "The transfer receipt couldn't be verified.";
    const order = await loadOrder(req);
    requireStatus(order, [STATUS.WAITING_CONFIRMATION], "Only orders waiting for payment confirmation can be rejected.");
    await order.update({ order_status_id: STATUS.PAYMENT_REJECTED, cancel_reason: reason });

    notify(order, `We couldn't confirm the payment for ${order.no_invoice}`, [
      `Reason: ${reason}`,
      `Please upload a clearer receipt from your order page within ${env.paymentWindowHours} hours of placing the order.`,
    ]);
    await respond(res, order.id, "Payment rejected. The customer can upload a new receipt.");
  },

  // POST /api/admin/orders/:id/ship  -> takes the stock out of the warehouse
  async ship(req, res) {
    let order;
    await db.sequelize.transaction(async (transaction) => {
      order = await loadOrder(req, transaction);
      requireStatus(order, [STATUS.PROCESSING], "Only orders that are being processed can be shipped.");

      const reservations = await db.Reserved_stock.findAll({
        where: { order_id: order.id },
        include: [{ model: db.Warehouse_stock, as: "WarehouseProductReservation" }],
        transaction,
      });
      for (const r of reservations) {
        const row = r.WarehouseProductReservation;
        await row.reload({ transaction, lock: transaction.LOCK.UPDATE });
        // In case stock changed since the payment was accepted.
        await stock.pullFromNearest(row, r.reserve_quantity, { adminId: req.admin.id, excludeOrderId: order.id, reason: `order ${order.no_invoice}`, transaction });
        await stock.adjust(row, -r.reserve_quantity, { adminId: req.admin.id, journal: `Shipped order ${order.no_invoice}`, transaction });
      }
      await db.Reserved_stock.destroy({ where: { order_id: order.id }, transaction });

      const tracking = `${order.delivery_courier.toUpperCase()}${Date.now().toString().slice(-10)}`;
      await order.update({ order_status_id: STATUS.SHIPPED, tracking_code: tracking, delivery_time: new Date() }, { transaction });
    });

    notify(order, `${order.no_invoice} is on its way`, [
      `Your order has been shipped with ${order.delivery_courier.toUpperCase()}. Tracking number: ${order.tracking_code}.`,
      `When it arrives, please confirm on your order page. Otherwise it's marked as received after ${env.autoCompleteDays} days.`,
    ]);
    await respond(res, order.id, "Order shipped.");
  },

  // POST /api/admin/orders/:id/cancel  { reason }
  async cancel(req, res) {
    const reason = String(req.body?.reason || "").trim().slice(0, 200) || "Cancelled by the shop";
    let order;
    await db.sequelize.transaction(async (transaction) => {
      order = await loadOrder(req, transaction);
      requireStatus(
        order,
        [STATUS.WAITING_PAYMENT, STATUS.WAITING_CONFIRMATION, STATUS.PAYMENT_REJECTED],
        "Orders that are already being processed or shipped can't be cancelled."
      );
      await cancel(order, reason, transaction);
    });

    notify(order, `Order ${order.no_invoice} was cancelled`, [
      `Reason: ${reason}`,
      "If you already paid, we'll contact you about a refund.",
    ]);
    await respond(res, order.id, "Order cancelled.");
  },
};
