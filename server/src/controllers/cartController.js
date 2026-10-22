const db = require("../models");
const HttpError = require("../utils/httpError");
const { getPaging, paginationInfo } = require("../utils/pagination");
const { productIncludes, productAttributes, serializeProduct } = require("../services/catalog");

const productInclude = { model: db.Product, attributes: productAttributes, include: productIncludes() };

/** The cart as the client shows it, with totals worked out on the server. */
async function loadCart(userId) {
  const rows = await db.Cart.findAll({ where: { user_id: userId }, include: [productInclude], order: [["createdAt", "ASC"]] });
  const items = rows
    .filter((row) => row.Product)
    .map((row) => {
      const product = serializeProduct(row.Product);
      return {
        product,
        quantity: row.quantity,
        subtotal: product.price * row.quantity,
        problem: !product.is_active
          ? "This product isn't sold anymore."
          : product.available < row.quantity
            ? product.available === 0
              ? "Out of stock right now."
              : `Only ${product.available} left.`
            : null,
      };
    });
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.subtotal, 0),
    weight: items.reduce((n, i) => n + i.product.weight * i.quantity, 0),
    can_checkout: items.length > 0 && items.every((i) => !i.problem),
  };
}

async function activeProduct(productId) {
  const product = await db.Product.findOne({ where: { id: productId, is_active: true }, attributes: productAttributes, include: productIncludes() });
  if (!product) throw new HttpError(404, "That product isn't available.");
  return serializeProduct(product);
}

module.exports = {
  loadCart,

  async cart(req, res) {
    res.json({ data: await loadCart(req.user.id) });
  },

  // POST /api/cart  { product_id, quantity }  -> adds to what's already in the cart
  async add(req, res) {
    const { product_id, quantity } = req.body;
    const product = await activeProduct(product_id);
    const existing = await db.Cart.findOne({ where: { user_id: req.user.id, product_id } });
    const wanted = (existing?.quantity || 0) + quantity;

    if (wanted > product.available) {
      throw new HttpError(400, product.available === 0 ? `${product.name} is out of stock.` : `Only ${product.available} of ${product.name} available.`);
    }
    if (existing) await existing.update({ quantity: wanted });
    else await db.Cart.create({ user_id: req.user.id, product_id, quantity });

    res.status(existing ? 200 : 201).json({ message: `${product.name} added to your cart.`, data: await loadCart(req.user.id) });
  },

  // PATCH /api/cart/:productId  { quantity }
  async update(req, res) {
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "Quantity must be between 1 and 99.");

    const row = await db.Cart.findOne({ where: { user_id: req.user.id, product_id: productId } });
    if (!row) throw new HttpError(404, "That product isn't in your cart.");
    const product = await activeProduct(productId);
    if (quantity > product.available) throw new HttpError(400, `Only ${product.available} of ${product.name} available.`);

    await row.update({ quantity });
    res.json({ data: await loadCart(req.user.id) });
  },

  // DELETE /api/cart/:productId
  async remove(req, res) {
    await db.Cart.destroy({ where: { user_id: req.user.id, product_id: Number(req.params.productId) } });
    res.json({ message: "Removed from your cart.", data: await loadCart(req.user.id) });
  },

  // GET /api/wishlist?page=
  async wishlist(req, res) {
    const paging = getPaging(req.query, 12);
    const { rows, count } = await db.Wishlist.findAndCountAll({
      where: { user_id: req.user.id },
      include: [{ ...productInclude, where: { is_active: true } }],
      order: [["createdAt", "DESC"]],
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });
    res.json({ data: rows.map((r) => serializeProduct(r.Product)), pagination: paginationInfo(paging, count) });
  },

  // POST /api/wishlist/:productId
  async like(req, res) {
    const product = await activeProduct(req.params.productId);
    await db.Wishlist.findOrCreate({ where: { user_id: req.user.id, product_id: product.id } });
    res.status(201).json({ message: `${product.name} saved to your wishlist.` });
  },

  // DELETE /api/wishlist/:productId
  async unlike(req, res) {
    await db.Wishlist.destroy({ where: { user_id: req.user.id, product_id: Number(req.params.productId) } });
    res.json({ message: "Removed from your wishlist." });
  },
};
