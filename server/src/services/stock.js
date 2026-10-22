const { Op } = require("sequelize");
const db = require("../models");
const HttpError = require("../utils/httpError");
const { sortByDistance } = require("../utils/geo");

/**
 * How much of each product can still be sold: stock in every warehouse minus what
 * unpaid / unshipped orders have reserved. Returns Map(productId -> { stock, reserved, available }).
 */
async function availability(productIds, { transaction } = {}) {
  const ids = [...new Set(productIds.map(Number))].filter(Boolean);
  const result = new Map(ids.map((id) => [id, { stock: 0, reserved: 0, available: 0 }]));
  if (!ids.length) return result;

  const stocks = await db.Warehouse_stock.findAll({
    where: { product_id: { [Op.in]: ids } },
    attributes: ["product_id", [db.sequelize.fn("SUM", db.sequelize.col("product_stock")), "total"]],
    group: ["product_id"],
    raw: true,
    transaction,
  });
  const reserved = await db.Reserved_stock.findAll({
    attributes: [
      [db.sequelize.col("WarehouseProductReservation.product_id"), "product_id"],
      [db.sequelize.fn("SUM", db.sequelize.col("reserve_quantity")), "total"],
    ],
    include: [{ model: db.Warehouse_stock, as: "WarehouseProductReservation", attributes: [], where: { product_id: { [Op.in]: ids } } }],
    group: ["WarehouseProductReservation.product_id"],
    raw: true,
    transaction,
  });

  for (const row of stocks) result.get(Number(row.product_id)).stock = Number(row.total) || 0;
  for (const row of reserved) result.get(Number(row.product_id)).reserved = Number(row.total) || 0;
  for (const value of result.values()) value.available = Math.max(0, value.stock - value.reserved);
  return result;
}

/** Units in one warehouse stock row that aren't promised to another order. */
async function freeInRow(warehouseStock, { excludeOrderId, transaction } = {}) {
  const where = { warehouse_stock_id: warehouseStock.id };
  if (excludeOrderId) where.order_id = { [Op.ne]: excludeOrderId };
  const reserved = (await db.Reserved_stock.sum("reserve_quantity", { where, transaction })) || 0;
  return warehouseStock.product_stock - reserved;
}

/** Finds the stock row for a product in a warehouse, creating (or restoring) it with 0 if needed. */
async function ensureRow(warehouseId, productId, { transaction } = {}) {
  let row = await db.Warehouse_stock.findOne({
    where: { warehouse_id: warehouseId, product_id: productId },
    paranoid: false,
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (row && row.deletedAt) await row.restore({ transaction });
  if (!row) row = await db.Warehouse_stock.create({ warehouse_id: warehouseId, product_id: productId, product_stock: 0 }, { transaction });
  return row;
}

/** Writes one line in the stock journal. */
function recordHistory({ row, adminId, before, after, journal, transaction }) {
  return db.History_stock.create(
    {
      warehouse_stock_id: row.id,
      warehouse_id: row.warehouse_id,
      admin_id: adminId,
      stock_before_transfer: before,
      stock_after_transfer: after,
      increment_decrement: after >= before ? "Increment" : "Decrement",
      quantity: Math.abs(after - before),
      journal,
      timestamp: new Date(),
    },
    { transaction }
  );
}

/** Changes a stock row by `change` units and journals it. */
async function adjust(row, change, { adminId, journal, transaction }) {
  const before = row.product_stock;
  const after = before + change;
  if (after < 0) throw new HttpError(400, `Not enough stock. Only ${before} left in this warehouse.`);
  await row.update({ product_stock: after }, { transaction });
  await recordHistory({ row, adminId, before, after, journal, transaction });
  return row;
}

/**
 * Makes sure `target` (a stock row) has `needed` free units by pulling stock from the nearest
 * other warehouses. Every move is saved as an approved stock transfer and journalled.
 */
async function pullFromNearest(target, needed, { adminId, excludeOrderId, reason, transaction }) {
  let missing = needed - (await freeInRow(target, { excludeOrderId, transaction }));
  if (missing <= 0) return [];

  const destination = await db.Warehouse.findByPk(target.warehouse_id, { transaction });
  const candidates = await db.Warehouse_stock.findAll({
    where: { product_id: target.product_id, warehouse_id: { [Op.ne]: target.warehouse_id }, product_stock: { [Op.gt]: 0 } },
    include: [{ model: db.Warehouse, as: "Warehouse" }],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const places = candidates.map((row) => ({
    row,
    name: row.Warehouse.warehouse_name,
    latitude: row.Warehouse.latitude,
    longitude: row.Warehouse.longitude,
    city_id: row.Warehouse.city_id,
    province_id: row.Warehouse.province_id,
  }));

  const moves = [];
  for (const { warehouse: place } of sortByDistance(places, destination)) {
    if (missing <= 0) break;
    const source = place.row;
    const free = await freeInRow(source, { transaction });
    if (free <= 0) continue;
    const qty = Math.min(free, missing);

    await adjust(source, -qty, { adminId, journal: `Sent to ${destination.warehouse_name} (${reason})`, transaction });
    await adjust(target, qty, { adminId, journal: `Received from ${place.name} (${reason})`, transaction });
    const transfer = await db.Inventory_transfer.create(
      {
        warehouse_stock_id: source.id,
        from_warehouse_id: source.warehouse_id,
        to_warehouse_id: target.warehouse_id,
        quantity: qty,
        transaction_code: `AUTO-${Date.now()}-${source.id}`,
        timestamp: new Date().toISOString(),
        status: "Approve",
      },
      { transaction }
    );
    moves.push(transfer);
    missing -= qty;
  }

  if (missing > 0) throw new HttpError(409, "There isn't enough stock across all warehouses to fulfil this order.");
  return moves;
}

module.exports = { availability, freeInRow, ensureRow, recordHistory, adjust, pullFromNearest };
