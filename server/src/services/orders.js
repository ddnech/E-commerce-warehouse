const dayjs = require("dayjs");
const db = require("../models");
const env = require("../config/env");
const { STATUS } = require("../utils/constants");

const STATUS_KEY = {
  [STATUS.WAITING_PAYMENT]: "waiting_payment",
  [STATUS.WAITING_CONFIRMATION]: "waiting_confirmation",
  [STATUS.COMPLETED]: "completed",
  [STATUS.PROCESSING]: "processing",
  [STATUS.CANCELLED]: "cancelled",
  [STATUS.SHIPPED]: "shipped",
  [STATUS.PAYMENT_REJECTED]: "payment_rejected",
};

/** Everything needed to show an order. */
const orderIncludes = ({ withUser = false } = {}) => {
  const includes = [
    { model: db.Order_status, attributes: ["id", "name"] },
    {
      model: db.Address_user,
      paranoid: false,
      include: [
        { model: db.City, attributes: ["id", "name"] },
        { model: db.Province, attributes: ["id", "name"] },
      ],
    },
    { model: db.Warehouse, paranoid: false, attributes: ["id", "warehouse_name", "city_id"], include: [{ model: db.City, attributes: ["name"] }] },
    {
      model: db.Order_detail,
      separate: true,
      order: [["id", "ASC"]],
      include: [
        {
          model: db.Warehouse_stock,
          paranoid: false,
          include: [
            {
              model: db.Product,
              paranoid: false,
              attributes: ["id", "name", "price", "weight"],
              include: [{ model: db.Image_product, paranoid: false, attributes: ["id", "img_product"], separate: true, order: [["id", "ASC"]] }],
            },
          ],
        },
      ],
    },
  ];
  if (withUser) {
    includes.push({
      model: db.User,
      attributes: ["id", "username", "email"],
      include: [{ model: db.User_detail, attributes: ["first_name", "last_name", "phone"] }],
    });
  }
  return includes;
};

function serializeOrder(order) {
  const o = order.toJSON ? order.toJSON() : order;
  const items = (o.Order_details || []).map((d) => {
    const product = d.Warehouse_stock?.Product;
    const price = d.price || product?.price || 0;
    return {
      id: d.id,
      quantity: d.quantity,
      price,
      subtotal: price * d.quantity,
      product: product
        ? { id: product.id, name: product.name, image: product.Image_products?.[0]?.img_product || null }
        : { id: null, name: "Removed product", image: null },
    };
  });
  const address = o.Address_user;

  const result = {
    id: o.id,
    invoice: o.no_invoice,
    status: { id: o.order_status_id, key: STATUS_KEY[o.order_status_id], name: o.Order_status?.name },
    items,
    total_price: o.total_price,
    delivery_price: o.delivery_price,
    grand_total: o.total_price + o.delivery_price,
    courier: o.delivery_courier,
    service: o.delivery_service,
    tracking_code: o.tracking_code,
    payment_proof: o.img_payment,
    shipped_at: o.delivery_time,
    completed_at: o.completed_at,
    cancel_reason: o.cancel_reason,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    payment_deadline: [STATUS.WAITING_PAYMENT, STATUS.PAYMENT_REJECTED].includes(o.order_status_id)
      ? dayjs(o.createdAt).add(env.paymentWindowHours, "hour").toISOString()
      : null,
    address: address
      ? {
          title: address.address_title,
          details: address.address_details,
          city: address.City?.name,
          province: address.Province?.name,
          postal_code: address.postal_code,
        }
      : null,
    warehouse: o.Warehouse ? { id: o.Warehouse.id, name: o.Warehouse.warehouse_name, city: o.Warehouse.City?.name } : null,
  };

  if (o.User) {
    const detail = o.User.User_detail;
    result.customer = {
      id: o.User.id,
      username: o.User.username,
      email: o.User.email,
      name: detail ? `${detail.first_name} ${detail.last_name || ""}`.trim() : o.User.username,
      phone: detail?.phone || null,
    };
  }
  return result;
}

/** Cancels an order and frees the stock it was holding. Run inside a transaction. */
async function cancel(order, reason, transaction) {
  await db.Reserved_stock.destroy({ where: { order_id: order.id }, transaction });
  await order.update({ order_status_id: STATUS.CANCELLED, cancel_reason: reason }, { transaction });
}

/** Invoice number like FF-20261022-7K3QX9. */
function invoiceNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from(require("crypto").randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
  return `FF-${dayjs().format("YYYYMMDD")}-${random}`;
}

module.exports = { orderIncludes, serializeOrder, cancel, invoiceNumber, STATUS_KEY };
