const { body, validationResult } = require("express-validator");
const { removeUpload } = require("./upload");

/** Runs the checks and answers with the first error message if something is wrong. */
const validate = (checks) => async (req, res, next) => {
  for (const check of checks) await check.run(req);
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  removeUpload(req.uploadedPaths || []);
  const errors = result.array();
  return res.status(400).json({ message: errors[0].msg, errors });
};

const PASSWORD_MESSAGE = "Password needs at least 8 characters, with a capital letter, a number and a symbol.";
const password = (field = "password") =>
  body(field).isStrongPassword({ minLength: 8, minLowercase: 0, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage(PASSWORD_MESSAGE);

const phone = (optional) => {
  const chain = optional ? body("phone").optional({ values: "falsy" }) : body("phone");
  return chain
    .trim()
    .customSanitizer((v) => String(v).replace(/[\s-]/g, ""))
    .matches(/^(\+62|62|0)8\d{7,12}$/)
    .withMessage("Enter an Indonesian mobile number, for example 081234567890.");
};

const username = (optional) => {
  const chain = optional ? body("username").optional({ values: "falsy" }) : body("username");
  return chain
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3 to 30 characters.")
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage("Username can only use letters, numbers, dots and underscores.");
};

const name = (field, label, optional) => {
  const chain = optional ? body(field).optional({ values: "falsy" }) : body(field);
  return chain.trim().notEmpty().withMessage(`${label} is required.`).isLength({ max: 60 }).withMessage(`${label} is too long.`);
};

const int = (field, label, { min = 0, max = 1_000_000_000, optional = false } = {}) => {
  const chain = optional ? body(field).optional({ values: "falsy" }) : body(field);
  return chain.isInt({ min, max }).withMessage(`${label} must be a whole number${min > 0 ? ` of at least ${min}` : ""}.`).toInt();
};

module.exports = {
  validate,

  register: validate([
    username(false),
    body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail({ gmail_remove_dots: false }),
    name("first_name", "First name"),
    body("last_name").optional({ values: "falsy" }).trim().isLength({ max: 60 }).withMessage("Last name is too long."),
    phone(false),
    password(),
  ]),

  login: validate([
    body("identifier").trim().notEmpty().withMessage("Enter your email or username."),
    body("password").notEmpty().withMessage("Enter your password."),
  ]),

  email: validate([body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail({ gmail_remove_dots: false })]),

  resetPassword: validate([body("token").notEmpty().withMessage("This link is incomplete."), password()]),

  profile: validate([
    username(true),
    name("first_name", "First name", true),
    body("last_name").optional().trim().isLength({ max: 60 }).withMessage("Last name is too long."),
    phone(true),
  ]),

  changePassword: validate([body("current_password").notEmpty().withMessage("Enter your current password."), password("new_password")]),

  address: validate([
    body("address_title").trim().notEmpty().withMessage("Give the address a label, like Home or Office.").isLength({ max: 40 }),
    body("address_details").trim().notEmpty().withMessage("Enter the street address.").isLength({ max: 255 }).withMessage("The address is too long."),
    int("province_id", "Province", { min: 1 }),
    int("city_id", "City", { min: 1 }),
    body("postal_code").trim().matches(/^\d{5}$/).withMessage("Postal code is 5 digits."),
  ]),

  cartItem: validate([int("product_id", "Product", { min: 1 }), int("quantity", "Quantity", { min: 1, max: 99 })]),

  checkout: validate([
    int("address_id", "Address", { min: 1 }),
    body("courier").isIn(["jne", "pos", "tiki"]).withMessage("Pick a courier."),
    body("service").trim().notEmpty().withMessage("Pick a delivery service."),
  ]),

  // Admin
  adminLogin: validate([
    body("username").trim().notEmpty().withMessage("Enter your username."),
    body("password").notEmpty().withMessage("Enter your password."),
  ]),

  adminCreate: validate([
    username(false),
    name("first_name", "First name"),
    name("last_name", "Last name"),
    password(),
    int("warehouse_id", "Warehouse", { min: 1 }),
  ]),

  adminUpdate: validate([
    name("first_name", "First name", true),
    name("last_name", "Last name", true),
    body("password").optional({ values: "falsy" }).isStrongPassword({ minLength: 8, minLowercase: 0, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage(PASSWORD_MESSAGE),
    int("warehouse_id", "Warehouse", { min: 1, optional: true }),
  ]),

  category: validate([body("name").trim().notEmpty().withMessage("Category name is required.").isLength({ max: 50 }).withMessage("Category name is too long.")]),

  product: (optional) =>
    validate([
      name("name", "Product name", optional),
      int("price", "Price", { min: 1000, optional }),
      int("weight", "Weight", { min: 1, max: 1_000_000, optional }),
      int("category_id", "Category", { min: 1, optional }),
      (optional ? body("description").optional({ values: "falsy" }) : body("description"))
        .trim()
        .notEmpty()
        .withMessage("Description is required.")
        .isLength({ max: 5000 })
        .withMessage("Description is too long."),
    ]),

  warehouse: (optional) =>
    validate([
      name("warehouse_name", "Warehouse name", optional),
      (optional ? body("address_warehouse").optional({ values: "falsy" }) : body("address_warehouse")).trim().notEmpty().withMessage("Address is required."),
      int("province_id", "Province", { min: 1, optional }),
      int("city_id", "City", { min: 1, optional }),
      (optional ? body("warehouse_contact").optional({ values: "falsy" }) : body("warehouse_contact"))
        .trim()
        .matches(/^[0-9+\s-]{6,20}$/)
        .withMessage("Enter a phone number for the warehouse."),
    ]),

  stockCreate: validate([int("warehouse_id", "Warehouse", { min: 1 }), int("product_id", "Product", { min: 1 }), int("quantity", "Quantity", { min: 0, max: 100000 })]),

  stockAdjust: validate([
    body("change").isInt({ min: -100000, max: 100000 }).withMessage("Change must be a whole number.").toInt().custom((v) => {
      if (v === 0) throw new Error("Change can't be zero.");
      return true;
    }),
    body("note").optional().trim().isLength({ max: 120 }).withMessage("Note is too long."),
  ]),

  transfer: validate([
    int("from_warehouse_id", "Source warehouse", { min: 1 }),
    int("to_warehouse_id", "Destination warehouse", { min: 1 }),
    int("product_id", "Product", { min: 1 }),
    int("quantity", "Quantity", { min: 1, max: 100000 }),
  ]),
};
