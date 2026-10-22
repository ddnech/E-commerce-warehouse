const { Op } = require("sequelize");
const db = require("../models");
const env = require("../config/env");
const HttpError = require("../utils/httpError");
const { COURIERS } = require("../utils/constants");
const { getPaging, paginationInfo } = require("../utils/pagination");
const { productIncludes, productAttributes, serializeProduct, SORTS, productFilters } = require("../services/catalog");

/** Adds in_wishlist to each product for a logged-in shopper. */
async function withWishlist(products, user) {
  if (!user || !products.length) return products.map((p) => ({ ...p, in_wishlist: false }));
  const liked = await db.Wishlist.findAll({
    where: { user_id: user.id, product_id: products.map((p) => p.id) },
    attributes: ["product_id"],
  });
  const ids = new Set(liked.map((w) => w.product_id));
  return products.map((p) => ({ ...p, in_wishlist: ids.has(p.id) }));
}

module.exports = {
  // GET /api/config  -> what the client needs to know about this server
  config(req, res) {
    res.json({
      data: {
        googleClientId: env.googleClientId || null,
        shipping: env.rajaongkirKey ? "live" : "flat",
        geocoding: !!env.opencageKey,
        couriers: COURIERS,
        paymentWindowHours: env.paymentWindowHours,
        bankAccount: env.bankAccount,
      },
    });
  },

  // GET /api/categories
  async categories(req, res) {
    const categories = await db.Category.findAll({
      attributes: {
        include: [
          [
            db.sequelize.literal("(SELECT COUNT(*) FROM Products p WHERE p.category_id = `Category`.`id` AND p.is_active = 1 AND p.deletedAt IS NULL)"),
            "product_count",
          ],
        ],
      },
      order: [["name", "ASC"]],
    });
    res.json({ data: categories });
  },

  // GET /api/products?q=&category=&min=&max=&in_stock=true&sort=newest&page=1&size=12
  async products(req, res) {
    const paging = getPaging(req.query, 12);
    const { rows, count } = await db.Product.findAndCountAll({
      where: productFilters(req.query),
      attributes: productAttributes,
      include: productIncludes(),
      order: SORTS[req.query.sort] || SORTS.newest,
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });
    res.json({ data: await withWishlist(rows.map(serializeProduct), req.user), pagination: paginationInfo(paging, count) });
  },

  // GET /api/products/suggest?q=  -> a handful of names for the search box
  async suggest(req, res) {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ data: [] });
    const products = await db.Product.findAll({
      where: { is_active: true, name: { [Op.like]: `%${q}%` } },
      attributes: ["id", "name", "price"],
      include: [{ model: db.Category, as: "category", attributes: ["name"] }],
      limit: 6,
      order: [["name", "ASC"]],
    });
    res.json({ data: products.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category?.name })) });
  },

  // GET /api/products/:id
  async product(req, res) {
    const product = await db.Product.findOne({
      where: { id: req.params.id, is_active: true },
      attributes: productAttributes,
      include: productIncludes(),
    });
    if (!product) throw new HttpError(404, "We couldn't find that product. It may have been removed.");

    const related = await db.Product.findAll({
      where: { is_active: true, category_id: product.category_id, id: { [Op.ne]: product.id } },
      attributes: productAttributes,
      include: productIncludes(),
      order: db.sequelize.random(),
      limit: 4,
    });

    let inWishlist = false;
    if (req.user) {
      inWishlist = !!(await db.Wishlist.findOne({ where: { user_id: req.user.id, product_id: product.id } }));
    }

    res.json({ data: { ...serializeProduct(product), in_wishlist: inWishlist }, related: await withWishlist(related.map(serializeProduct), req.user) });
  },

  // GET /api/regions/provinces
  async provinces(req, res) {
    res.json({ data: await db.Province.findAll({ order: [["name", "ASC"]] }) });
  },

  // GET /api/regions/cities?province=31
  async cities(req, res) {
    const where = req.query.province ? { province_id: Number(req.query.province) } : {};
    res.json({ data: await db.City.findAll({ where, attributes: ["id", "name", "province_id"], order: [["name", "ASC"]] }) });
  },

  // GET /api/stores  -> warehouses, shown on the "Our stores" page
  async stores(req, res) {
    const warehouses = await db.Warehouse.findAll({
      attributes: ["id", "warehouse_name", "address_warehouse", "warehouse_contact", "warehouse_img", "latitude", "longitude"],
      include: [
        { model: db.City, attributes: ["name"] },
        { model: db.Province, attributes: ["name"] },
      ],
      order: [["warehouse_name", "ASC"]],
    });
    res.json({ data: warehouses });
  },
};
