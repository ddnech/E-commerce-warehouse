const { Op } = require("sequelize");
const db = require("../models");
const { STATUS } = require("../utils/constants");

// SQL snippets used inside product queries. `Product` is the alias Sequelize gives the main table.
const STOCK_SQL =
  "(SELECT COALESCE(SUM(ws.product_stock), 0) FROM Warehouse_stocks ws WHERE ws.product_id = `Product`.`id` AND ws.deletedAt IS NULL)";
const RESERVED_SQL =
  "(SELECT COALESCE(SUM(rs.reserve_quantity), 0) FROM Reserved_stocks rs JOIN Warehouse_stocks ws2 ON ws2.id = rs.warehouse_stock_id WHERE ws2.product_id = `Product`.`id`)";
const AVAILABLE_SQL = `(${STOCK_SQL} - ${RESERVED_SQL})`;
const SOLD_SQL = `(SELECT COALESCE(SUM(od.quantity), 0) FROM Order_details od
  JOIN Warehouse_stocks ws3 ON ws3.id = od.warehouse_stock_id
  JOIN Orders o ON o.id = od.order_id
  WHERE ws3.product_id = \`Product\`.\`id\` AND o.order_status_id IN (${STATUS.PROCESSING}, ${STATUS.SHIPPED}, ${STATUS.COMPLETED}))`;

const literal = (sql) => db.sequelize.literal(sql);

const productIncludes = (paranoid = true) => [
  { model: db.Category, as: "category", attributes: ["id", "name"], paranoid: false },
  {
    model: db.Image_product,
    attributes: ["id", "img_product"],
    separate: true,
    order: [["id", "ASC"]],
    paranoid,
  },
];

const productAttributes = {
  include: [
    [literal(AVAILABLE_SQL), "available"],
    [literal(SOLD_SQL), "sold"],
  ],
};

/** Plain object sent to the client. */
function serializeProduct(product) {
  const p = product.toJSON ? product.toJSON() : product;
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    weight: p.weight,
    description: p.description,
    is_active: !!p.is_active,
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    images: (p.Image_products || []).map((img) => ({ id: img.id, url: img.img_product })),
    available: Math.max(0, Number(p.available ?? 0)),
    sold: Number(p.sold ?? 0),
    createdAt: p.createdAt,
    deletedAt: p.deletedAt ?? null,
  };
}

const SORTS = {
  newest: [["createdAt", "DESC"]],
  price_asc: [["price", "ASC"]],
  price_desc: [["price", "DESC"]],
  name: [["name", "ASC"]],
  popular: [[literal(SOLD_SQL), "DESC"], ["createdAt", "DESC"]],
};

/** Builds the where clause for product lists from query string filters. */
function productFilters(query, { onlyActive = true } = {}) {
  const where = {};
  if (onlyActive) where.is_active = true;
  if (query.q) where.name = { [Op.like]: `%${String(query.q).trim()}%` };
  if (query.category) where.category_id = Number(query.category);
  const min = Number(query.min);
  const max = Number(query.max);
  if (min > 0 || max > 0) {
    where.price = {};
    if (min > 0) where.price[Op.gte] = min;
    if (max > 0) where.price[Op.lte] = max;
  }
  if (query.in_stock === "true") where[Op.and] = [db.sequelize.where(literal(AVAILABLE_SQL), Op.gt, 0)];
  return where;
}

module.exports = { productIncludes, productAttributes, serializeProduct, SORTS, productFilters, AVAILABLE_SQL, SOLD_SQL };
