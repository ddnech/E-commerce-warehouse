const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");
const HttpError = require("../utils/httpError");
const { removeUpload } = require("../middleware/upload");
const { coordinatesFor } = require("../services/geocode");
const { sessionUser } = require("./authController");

const addressIncludes = [
  { model: db.City, attributes: ["id", "name"] },
  { model: db.Province, attributes: ["id", "name"] },
];

function serializeAddress(address, primaryId) {
  const a = address.toJSON();
  return {
    id: a.id,
    title: a.address_title,
    details: a.address_details,
    postal_code: a.postal_code,
    province: a.Province ? { id: a.Province.id, name: a.Province.name } : { id: a.province_id, name: "" },
    city: a.City ? { id: a.City.id, name: a.City.name } : { id: a.city_id, name: "" },
    is_primary: a.id === primaryId,
  };
}

async function primaryAddressId(userId, transaction) {
  const detail = await db.User_detail.findOne({ where: { user_id: userId }, transaction });
  return detail?.address_user_id || null;
}

async function loadRegion(provinceId, cityId) {
  const city = await db.City.findOne({ where: { id: cityId, province_id: provinceId }, include: [db.Province] });
  if (!city) throw new HttpError(400, "That city isn't in the selected province.");
  return { city, province: city.Province };
}

module.exports = {
  // PATCH /api/account/profile  (multipart, optional "avatar")
  async updateProfile(req, res) {
    const { username, first_name, last_name, phone } = req.body;
    const user = await db.User.findByPk(req.user.id, { include: [db.User_detail] });
    const detail = user.User_detail;

    if (username && username !== user.username && (await db.User.findOne({ where: { username } }))) {
      removeUpload(req.uploadedPath);
      throw new HttpError(409, "That username is taken. Try another one.");
    }
    if (phone && phone !== detail.phone && (await db.User_detail.findOne({ where: { phone, user_id: { [Op.ne]: user.id } } }))) {
      removeUpload(req.uploadedPath);
      throw new HttpError(409, "That phone number is already used by another account.");
    }

    const oldAvatar = req.uploadedPath || req.body.remove_avatar === "true" ? detail.img_profile : null;

    await db.sequelize.transaction(async (transaction) => {
      if (username) await user.update({ username }, { transaction });
      const changes = {};
      if (first_name) changes.first_name = first_name;
      if (last_name !== undefined) changes.last_name = last_name;
      if (phone) changes.phone = phone;
      if (req.uploadedPath) changes.img_profile = req.uploadedPath;
      else if (req.body.remove_avatar === "true") changes.img_profile = null;
      await detail.update(changes, { transaction });
    });

    removeUpload(oldAvatar);
    res.json({ message: "Profile saved.", user: await sessionUser(user.id) });
  },

  // PATCH /api/account/password  { current_password, new_password }
  async changePassword(req, res) {
    const user = await db.User.findByPk(req.user.id);
    if (!user.by_form) throw new HttpError(400, "Your account uses Google sign-in, so there's no password to change.");
    if (!(await bcrypt.compare(req.body.current_password, user.password))) {
      throw new HttpError(400, "Your current password isn't right.");
    }
    await user.update({ password: await bcrypt.hash(req.body.new_password, 10) });
    res.json({ message: "Password changed." });
  },

  // GET /api/account/addresses
  async addresses(req, res) {
    const primaryId = await primaryAddressId(req.user.id);
    const list = await db.Address_user.findAll({ where: { user_id: req.user.id }, include: addressIncludes, order: [["createdAt", "DESC"]] });
    const data = list.map((a) => serializeAddress(a, primaryId)).sort((a, b) => b.is_primary - a.is_primary);
    res.json({ data });
  },

  // POST /api/account/addresses
  async createAddress(req, res) {
    const { address_title, address_details, province_id, city_id, postal_code } = req.body;
    const { city, province } = await loadRegion(province_id, city_id);
    const point = await coordinatesFor({ address: address_details, city, province });

    const address = await db.sequelize.transaction(async (transaction) => {
      const created = await db.Address_user.create(
        { user_id: req.user.id, address_title, address_details, province_id, city_id, postal_code, latitude: point.latitude, longitude: point.longitude },
        { transaction }
      );
      // The first address (or one marked as primary) becomes the default for checkout.
      const currentPrimary = await primaryAddressId(req.user.id, transaction);
      if (!currentPrimary || req.body.is_primary === true || req.body.is_primary === "true") {
        await db.User_detail.update({ address_user_id: created.id }, { where: { user_id: req.user.id }, transaction });
      }
      return created;
    });

    await address.reload({ include: addressIncludes });
    res.status(201).json({ message: "Address saved.", data: serializeAddress(address, await primaryAddressId(req.user.id)) });
  },

  // PATCH /api/account/addresses/:id
  async updateAddress(req, res) {
    const address = await db.Address_user.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!address) throw new HttpError(404, "Address not found.");
    const { address_title, address_details, province_id, city_id, postal_code } = req.body;
    const { city, province } = await loadRegion(province_id, city_id);
    const point = await coordinatesFor({ address: address_details, city, province });

    await address.update({ address_title, address_details, province_id, city_id, postal_code, latitude: point.latitude, longitude: point.longitude });
    if (req.body.is_primary === true || req.body.is_primary === "true") {
      await db.User_detail.update({ address_user_id: address.id }, { where: { user_id: req.user.id } });
    }
    await address.reload({ include: addressIncludes });
    res.json({ message: "Address updated.", data: serializeAddress(address, await primaryAddressId(req.user.id)) });
  },

  // PATCH /api/account/addresses/:id/primary
  async makePrimary(req, res) {
    const address = await db.Address_user.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!address) throw new HttpError(404, "Address not found.");
    await db.User_detail.update({ address_user_id: address.id }, { where: { user_id: req.user.id } });
    res.json({ message: `"${address.address_title}" is now your main address.` });
  },

  // DELETE /api/account/addresses/:id
  async deleteAddress(req, res) {
    const address = await db.Address_user.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!address) throw new HttpError(404, "Address not found.");

    await db.sequelize.transaction(async (transaction) => {
      const wasPrimary = (await primaryAddressId(req.user.id, transaction)) === address.id;
      await address.destroy({ transaction }); // soft delete, old orders still show it
      if (wasPrimary) {
        const next = await db.Address_user.findOne({ where: { user_id: req.user.id }, order: [["createdAt", "DESC"]], transaction });
        await db.User_detail.update({ address_user_id: next ? next.id : null }, { where: { user_id: req.user.id }, transaction });
      }
    });
    res.json({ message: "Address removed." });
  },
};
