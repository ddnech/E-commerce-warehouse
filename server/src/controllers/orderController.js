const { Op } = require("sequelize");
const dayjs = require("dayjs");
const db = require("../models");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const { STATUS } = require("../utils/constants");
const { rupiah } = require("../utils/format");
const { sortByDistance } = require("../utils/geo");
const { getPaging, paginationInfo } = require("../utils/pagination");
const { sendMail } = require("../utils/mailer");
const { removeUpload } = require("../middleware/upload");
const shipping = require("../services/shipping");
const stock = require("../services/stock");
const { orderIncludes, serializeOrder, cancel, invoiceNumber, STATUS_KEY } = require("../services/orders");
const { loadCart } = require("./cartController");

const KEY_TO_ID = Object.fromEntries(Object.entries(STATUS_KEY).map(([id, key]) => [key, Number(id)]));

/** The address (owned by this user) plus the warehouse closest to it. */
async function addressAndWarehouse(userId, addressId) {
  const address = await db.Address_user.findOne({
    where: { id: addressId, user_id: userId },
    include: [db.City, db.Province],
  });
  if (!address) throw new HttpError(404, "Pick one of your saved addresses.");

  const warehouses = await db.Warehouse.findAll({ include: [db.City] });
  if (!warehouses.length) throw new HttpError(503, "The shop has no warehouses set up yet.");

  const [{ warehouse, distanceKm }] = sortByDistance(warehouses, address);
  return { address, warehouse, distanceKm };
}

async function shippingFor(address, warehouse, weight) {
  return shipping.quote(
    {
      city_id: warehouse.city_id,
      province_id: warehouse.province_id,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      cityName: warehouse.City?.name,
    },
    {
      city_id: address.city_id,
      province_id: address.province_id,
      latitude: address.latitude,
      longitude: address.longitude,
      cityName: address.City?.name,
    },
    weight
  );
}

async function findOwnOrder(userId, invoice, transaction) {
  const order = await db.Order.findOne({ where: { user_id: userId, no_invoice: invoice }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!order) throw new HttpError(404, "Order not found.");
  return order;
}

async function fullOrder(id) {
  return serializeOrder(await db.Order.findByPk(id, { include: orderIncludes() }));
}

module.exports = {
  // POST /api/checkout/quote  { address_id }  -> warehouse, totals and delivery options
  async quote(req, res) {
    const cart = await loadCart(req.user.id);
    if (!cart.items.length) throw new HttpError(400, "Your cart is empty.");
    const { address, warehouse, distanceKm } = await addressAndWarehouse(req.user.id, req.body.address_id);
    const options = await shippingFor(address, warehouse, cart.weight);

    res.json({
      data: {
        cart,
        warehouse: { id: warehouse.id, name: warehouse.warehouse_name, city: warehouse.City?.name, distance_km: distanceKm },
        shipping: options,
      },
    });
  },

  // POST /api/orders  { address_id, courier, service }
  async place(req, res) {
    const { address_id, courier, service } = req.body;
    const user = await db.User.findByPk(req.user.id, { include: [db.User_detail] });
    if (!user.is_verify) throw new HttpError(403, "Please confirm your email before placing an order. You can resend the link from your account page.");

    const cart = await loadCart(req.user.id);
    if (!cart.items.length) throw new HttpError(400, "Your cart is empty.");
    if (!cart.can_checkout) throw new HttpError(400, "Some items in your cart need attention before you can check out.");

    // Prices and shipping are always worked out here, never taken from the browser.
    const { address, warehouse } = await addressAndWarehouse(req.user.id, address_id);
    const options = await shippingFor(address, warehouse, cart.weight);
    const option = options.couriers.find((c) => c.code === courier)?.services.find((s) => s.service === service);
    if (!option) throw new HttpError(400, "That delivery option isn't available anymore. Please pick another one.");

    const order = await db.sequelize.transaction(async (transaction) => {
      // Lock the stock rows for these products so two people can't buy the last item at once.
      const productIds = cart.items.map((i) => i.product.id);
      await db.Warehouse_stock.findAll({ where: { product_id: { [Op.in]: productIds } }, transaction, lock: transaction.LOCK.UPDATE });
      const available = await stock.availability(productIds, { transaction });
      for (const item of cart.items) {
        if (available.get(item.product.id).available < item.quantity) {
          throw new HttpError(409, `Someone just bought the last ${item.product.name}. Please update your cart.`);
        }
      }

      const created = await db.Order.create(
        {
          user_id: user.id,
          order_status_id: STATUS.WAITING_PAYMENT,
          total_price: cart.subtotal,
          delivery_price: option.cost,
          delivery_courier: courier,
          delivery_service: service,
          no_invoice: invoiceNumber(),
          address_user_id: address.id,
          warehouse_id: warehouse.id,
        },
        { transaction }
      );

      for (const item of cart.items) {
        // Stock is reserved in the nearest warehouse. If it's short there, the missing units
        // are moved in from other warehouses when the admin confirms the payment.
        const row = await stock.ensureRow(warehouse.id, item.product.id, { transaction });
        await db.Reserved_stock.create({ order_id: created.id, warehouse_stock_id: row.id, reserve_quantity: item.quantity }, { transaction });
        await db.Order_detail.create(
          { order_id: created.id, warehouse_stock_id: row.id, quantity: item.quantity, price: item.product.price },
          { transaction }
        );
      }

      await db.Cart.destroy({ where: { user_id: user.id }, transaction });
      return created;
    });

    const deadline = dayjs().add(env.paymentWindowHours, "hour");
    sendMail({
      to: user.email,
      subject: `Order ${order.no_invoice} is waiting for payment`,
      name: user.User_detail?.first_name || user.username,
      paragraphs: [
        `Thanks for your order! Please transfer ${rupiah(order.total_price + order.delivery_price)} to ${env.bankAccount}.`,
        `Then upload a photo of the transfer receipt before ${deadline.format("D MMMM YYYY, HH:mm")}, or the order is cancelled automatically.`,
      ],
      button: { label: "View my order", url: `${env.appUrl}/account/orders/${order.no_invoice}` },
    });

    res.status(201).json({ message: "Order placed.", data: await fullOrder(order.id) });
  },

  // GET /api/orders?status=waiting_payment&q=FF-2026&page=1
  async list(req, res) {
    const paging = getPaging(req.query, 8);
    const where = { user_id: req.user.id };
    const status = KEY_TO_ID[req.query.status] || Number(req.query.status);
    if (status) where.order_status_id = status;
    if (req.query.q) where.no_invoice = { [Op.like]: `%${String(req.query.q).trim()}%` };

    const { rows, count } = await db.Order.findAndCountAll({
      where,
      include: orderIncludes(),
      order: [["createdAt", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });
    res.json({ data: rows.map(serializeOrder), pagination: paginationInfo(paging, count) });
  },

  // GET /api/orders/:invoice
  async detail(req, res) {
    const order = await db.Order.findOne({ where: { user_id: req.user.id, no_invoice: req.params.invoice }, include: orderIncludes() });
    if (!order) throw new HttpError(404, "Order not found.");
    res.json({ data: serializeOrder(order) });
  },

  // POST /api/orders/:invoice/payment  (multipart "proof")
  async uploadPayment(req, res) {
    if (!req.uploadedPath) throw new HttpError(400, "Choose a photo of your transfer receipt.");
    const order = await findOwnOrder(req.user.id, req.params.invoice);
    if (![STATUS.WAITING_PAYMENT, STATUS.PAYMENT_REJECTED].includes(order.order_status_id)) {
      removeUpload(req.uploadedPath);
      throw new HttpError(400, "This order isn't waiting for payment.");
    }
    const old = order.img_payment;
    await order.update({ img_payment: req.uploadedPath, order_status_id: STATUS.WAITING_CONFIRMATION });
    removeUpload(old);
    res.json({ message: "Receipt uploaded. We'll check it and let you know.", data: await fullOrder(order.id) });
  },

  // POST /api/orders/:invoice/cancel
  async cancel(req, res) {
    await db.sequelize.transaction(async (transaction) => {
      const order = await findOwnOrder(req.user.id, req.params.invoice, transaction);
      if (![STATUS.WAITING_PAYMENT, STATUS.PAYMENT_REJECTED].includes(order.order_status_id)) {
        throw new HttpError(400, "Orders can only be cancelled before the payment is confirmed. Contact us if you need help.");
      }
      await cancel(order, "Cancelled by customer", transaction);
    });
    const order = await findOwnOrder(req.user.id, req.params.invoice);
    res.json({ message: "Order cancelled.", data: await fullOrder(order.id) });
  },

  // POST /api/orders/:invoice/received
  async received(req, res) {
    const order = await findOwnOrder(req.user.id, req.params.invoice);
    if (order.order_status_id !== STATUS.SHIPPED) throw new HttpError(400, "You can confirm delivery once the order has been shipped.");
    await order.update({ order_status_id: STATUS.COMPLETED, completed_at: new Date() });
    res.json({ message: "Thanks! Enjoy your new furniture.", data: await fullOrder(order.id) });
  },
};
