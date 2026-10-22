const { Op } = require("sequelize");
const db = require("../../models");
const HttpError = require("../../utils/httpError");
const { getPaging, paginationInfo } = require("../../utils/pagination");
const { removeUpload } = require("../../middleware/upload");
const { productIncludes, productAttributes, serializeProduct, SORTS } = require("../../services/catalog");

const MAX_IMAGES = 6;

async function loadProduct(id) {
  const product = await db.Product.findByPk(id, { attributes: productAttributes, include: productIncludes() });
  if (!product) throw new HttpError(404, "Product not found.");
  return product;
}

async function assertUniqueName(name, exceptId) {
  const where = { name };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await db.Product.findOne({ where, paranoid: false })) throw new HttpError(409, "Another product already has that name.");
}

async function assertCategory(id) {
  if (!(await db.Category.findByPk(id))) throw new HttpError(400, "That category doesn't exist.");
}

module.exports = {
  // ---------- products ----------

  // GET /api/admin/products?q=&category=&status=active|inactive&sort=&page=
  async products(req, res) {
    const paging = getPaging(req.query, 15);
    const where = {};
    if (req.query.q) where.name = { [Op.like]: `%${String(req.query.q).trim()}%` };
    if (req.query.category) where.category_id = Number(req.query.category);
    if (req.query.status === "active") where.is_active = true;
    if (req.query.status === "inactive") where.is_active = false;

    const { rows, count } = await db.Product.findAndCountAll({
      where,
      attributes: productAttributes,
      include: productIncludes(),
      order: SORTS[req.query.sort] || SORTS.newest,
      limit: paging.limit,
      offset: paging.offset,
      distinct: true,
    });
    res.json({ data: rows.map(serializeProduct), pagination: paginationInfo(paging, count) });
  },

  // GET /api/admin/products/options  -> id + name for dropdowns
  async productOptions(req, res) {
    const products = await db.Product.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] });
    res.json({ data: products });
  },

  // GET /api/admin/products/:id
  async product(req, res) {
    const product = await loadProduct(req.params.id);
    const perWarehouse = await db.Warehouse_stock.findAll({
      where: { product_id: product.id },
      include: [{ model: db.Warehouse, as: "Warehouse", attributes: ["id", "warehouse_name"] }],
    });
    res.json({
      data: {
        ...serializeProduct(product),
        stock: perWarehouse.map((s) => ({ warehouse: s.Warehouse?.warehouse_name, warehouse_id: s.warehouse_id, quantity: s.product_stock })),
      },
    });
  },

  // POST /api/admin/products  (multipart: fields + up to 6 "images")
  async createProduct(req, res) {
    const { name, price, weight, category_id, description } = req.body;
    try {
      await assertUniqueName(name);
      await assertCategory(category_id);
    } catch (error) {
      removeUpload(req.uploadedPaths);
      throw error;
    }

    const product = await db.sequelize.transaction(async (transaction) => {
      const created = await db.Product.create({ name, price, weight, category_id, description, is_active: true }, { transaction });
      for (const url of req.uploadedPaths || []) {
        await db.Image_product.create({ product_id: created.id, img_product: url }, { transaction });
      }
      return created;
    });
    res.status(201).json({ message: `${product.name} was added.`, data: serializeProduct(await loadProduct(product.id)) });
  },

  // PATCH /api/admin/products/:id
  async updateProduct(req, res) {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    const changes = {};
    for (const field of ["name", "price", "weight", "category_id", "description"]) {
      if (req.body[field] !== undefined && req.body[field] !== "") changes[field] = req.body[field];
    }
    if (changes.name) await assertUniqueName(changes.name, product.id);
    if (changes.category_id) await assertCategory(changes.category_id);
    await product.update(changes);
    res.json({ message: "Product saved.", data: serializeProduct(await loadProduct(product.id)) });
  },

  // PATCH /api/admin/products/:id/status  { is_active }
  async setStatus(req, res) {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    const isActive = req.body.is_active === true || req.body.is_active === "true";
    await product.update({ is_active: isActive });
    res.json({ message: isActive ? `${product.name} is on sale again.` : `${product.name} is hidden from the shop.` });
  },

  // POST /api/admin/products/:id/images  (multipart "images")
  async addImages(req, res) {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) {
      removeUpload(req.uploadedPaths);
      throw new HttpError(404, "Product not found.");
    }
    if (!req.uploadedPaths?.length) throw new HttpError(400, "Choose at least one image.");
    const existing = await db.Image_product.count({ where: { product_id: product.id } });
    if (existing + req.uploadedPaths.length > MAX_IMAGES) {
      removeUpload(req.uploadedPaths);
      throw new HttpError(400, `A product can have up to ${MAX_IMAGES} images. It has ${existing} already.`);
    }
    await db.Image_product.bulkCreate(req.uploadedPaths.map((url) => ({ product_id: product.id, img_product: url })));
    res.status(201).json({ message: "Images added.", data: serializeProduct(await loadProduct(product.id)) });
  },

  // DELETE /api/admin/products/:id/images/:imageId
  async removeImage(req, res) {
    const image = await db.Image_product.findOne({ where: { id: req.params.imageId, product_id: req.params.id } });
    if (!image) throw new HttpError(404, "Image not found.");
    await image.destroy({ force: true });
    removeUpload(image.img_product);
    res.json({ message: "Image removed.", data: serializeProduct(await loadProduct(req.params.id)) });
  },

  // DELETE /api/admin/products/:id  -> soft delete, past orders still show it
  async deleteProduct(req, res) {
    const product = await db.Product.findByPk(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    const reserved = await db.Reserved_stock.count({
      include: [{ model: db.Warehouse_stock, as: "WarehouseProductReservation", where: { product_id: product.id } }],
    });
    if (reserved) throw new HttpError(400, "This product is in orders that haven't shipped yet. Hide it instead, or wait until they ship.");

    await db.sequelize.transaction(async (transaction) => {
      await db.Cart.destroy({ where: { product_id: product.id }, transaction });
      await db.Wishlist.destroy({ where: { product_id: product.id }, transaction });
      await product.update({ is_active: false }, { transaction });
      await product.destroy({ transaction });
    });
    res.json({ message: `${product.name} was deleted.` });
  },

  // ---------- categories ----------

  // GET /api/admin/categories
  async categories(req, res) {
    const categories = await db.Category.findAll({
      attributes: {
        include: [[db.sequelize.literal("(SELECT COUNT(*) FROM Products p WHERE p.category_id = `Category`.`id` AND p.deletedAt IS NULL)"), "product_count"]],
      },
      order: [["name", "ASC"]],
    });
    res.json({ data: categories });
  },

  // POST /api/admin/categories  (multipart: name, optional "image")
  async createCategory(req, res) {
    const name = req.body.name;
    if (await db.Category.findOne({ where: { name } })) {
      removeUpload(req.uploadedPath);
      throw new HttpError(409, "A category with that name already exists.");
    }
    const category = await db.Category.create({ name, category_img: req.uploadedPath || null });
    res.status(201).json({ message: `Category "${name}" added.`, data: category });
  },

  // PATCH /api/admin/categories/:id  (multipart: name, optional "image")
  async updateCategory(req, res) {
    const category = await db.Category.findByPk(req.params.id);
    if (!category) {
      removeUpload(req.uploadedPath);
      throw new HttpError(404, "Category not found.");
    }
    const name = req.body.name;
    if (name && name !== category.name && (await db.Category.findOne({ where: { name } }))) {
      removeUpload(req.uploadedPath);
      throw new HttpError(409, "A category with that name already exists.");
    }
    const oldImage = req.uploadedPath ? category.category_img : null;
    await category.update({ name: name || category.name, category_img: req.uploadedPath || category.category_img });
    removeUpload(oldImage);
    res.json({ message: "Category saved.", data: category });
  },

  // DELETE /api/admin/categories/:id
  async deleteCategory(req, res) {
    const category = await db.Category.findByPk(req.params.id);
    if (!category) throw new HttpError(404, "Category not found.");
    const products = await db.Product.count({ where: { category_id: category.id } });
    if (products) throw new HttpError(400, `Move or delete the ${products} product(s) in "${category.name}" first.`);
    await category.destroy();
    res.json({ message: `Category "${category.name}" deleted.` });
  },
};
