const { Router } = require("express");
const { requireUser, requireAdmin, optionalUser } = require("../middleware/auth");
const { imageUpload, imagesUpload } = require("../middleware/upload");
const v = require("../middleware/validators");

const catalog = require("../controllers/catalogController");
const auth = require("../controllers/authController");
const account = require("../controllers/accountController");
const cart = require("../controllers/cartController");
const orders = require("../controllers/orderController");

const adminAuth = require("../controllers/admin/authController");
const adminOrders = require("../controllers/admin/orderController");
const adminCatalog = require("../controllers/admin/catalogController");
const adminWarehouses = require("../controllers/admin/warehouseController");
const adminPeople = require("../controllers/admin/peopleController");
const adminReports = require("../controllers/admin/reportController");

// ---------- shop (public) ----------
const shop = Router();
shop.get("/config", catalog.config);
shop.get("/categories", catalog.categories);
shop.get("/products", optionalUser, catalog.products);
shop.get("/products/suggest", catalog.suggest);
shop.get("/products/:id", optionalUser, catalog.product);
shop.get("/regions/provinces", catalog.provinces);
shop.get("/regions/cities", catalog.cities);
shop.get("/stores", catalog.stores);

// ---------- shopper accounts ----------
shop.post("/auth/register", v.register, auth.register);
shop.post("/auth/login", v.login, auth.login);
shop.post("/auth/google", auth.google);
shop.post("/auth/verify", auth.verify);
shop.post("/auth/resend-verification", requireUser, auth.resendVerification);
shop.post("/auth/forgot-password", v.email, auth.forgotPassword);
shop.post("/auth/reset-password", v.resetPassword, auth.resetPassword);
shop.get("/auth/me", requireUser, auth.me);

shop.patch("/account/profile", requireUser, imageUpload("avatars", "avatar"), v.profile, account.updateProfile);
shop.patch("/account/password", requireUser, v.changePassword, account.changePassword);
shop.get("/account/addresses", requireUser, account.addresses);
shop.post("/account/addresses", requireUser, v.address, account.createAddress);
shop.patch("/account/addresses/:id", requireUser, v.address, account.updateAddress);
shop.patch("/account/addresses/:id/primary", requireUser, account.makePrimary);
shop.delete("/account/addresses/:id", requireUser, account.deleteAddress);

shop.get("/cart", requireUser, cart.cart);
shop.post("/cart", requireUser, v.cartItem, cart.add);
shop.patch("/cart/:productId", requireUser, cart.update);
shop.delete("/cart/:productId", requireUser, cart.remove);
shop.get("/wishlist", requireUser, cart.wishlist);
shop.post("/wishlist/:productId", requireUser, cart.like);
shop.delete("/wishlist/:productId", requireUser, cart.unlike);

shop.post("/checkout/quote", requireUser, orders.quote);
shop.post("/orders", requireUser, v.checkout, orders.place);
shop.get("/orders", requireUser, orders.list);
shop.get("/orders/:invoice", requireUser, orders.detail);
shop.post("/orders/:invoice/payment", requireUser, imageUpload("payments", "proof"), orders.uploadPayment);
shop.post("/orders/:invoice/cancel", requireUser, orders.cancel);
shop.post("/orders/:invoice/received", requireUser, orders.received);

// ---------- admin ----------
const admin = Router();
const anyAdmin = requireAdmin();
const superAdmin = requireAdmin({ superOnly: true });

admin.post("/auth/login", v.adminLogin, adminAuth.login);
admin.get("/auth/me", anyAdmin, adminAuth.me);

admin.get("/dashboard", anyAdmin, adminReports.dashboard);
admin.get("/reports/sales", anyAdmin, adminReports.sales);

admin.get("/orders", anyAdmin, adminOrders.list);
admin.get("/orders/:id", anyAdmin, adminOrders.detail);
admin.post("/orders/:id/accept", anyAdmin, adminOrders.accept);
admin.post("/orders/:id/reject", anyAdmin, adminOrders.reject);
admin.post("/orders/:id/ship", anyAdmin, adminOrders.ship);
admin.post("/orders/:id/cancel", anyAdmin, adminOrders.cancel);

admin.get("/products", anyAdmin, adminCatalog.products);
admin.get("/products/options", anyAdmin, adminCatalog.productOptions);
admin.get("/products/:id", anyAdmin, adminCatalog.product);
admin.post("/products", superAdmin, imagesUpload("products", "images", 6), v.product(false), adminCatalog.createProduct);
admin.patch("/products/:id", superAdmin, v.product(true), adminCatalog.updateProduct);
admin.patch("/products/:id/status", superAdmin, adminCatalog.setStatus);
admin.post("/products/:id/images", superAdmin, imagesUpload("products", "images", 6), adminCatalog.addImages);
admin.delete("/products/:id/images/:imageId", superAdmin, adminCatalog.removeImage);
admin.delete("/products/:id", superAdmin, adminCatalog.deleteProduct);

admin.get("/categories", anyAdmin, adminCatalog.categories);
admin.post("/categories", superAdmin, imageUpload("categories", "image"), v.category, adminCatalog.createCategory);
admin.patch("/categories/:id", superAdmin, imageUpload("categories", "image"), v.category, adminCatalog.updateCategory);
admin.delete("/categories/:id", superAdmin, adminCatalog.deleteCategory);

admin.get("/warehouses", anyAdmin, adminWarehouses.warehouses);
admin.post("/warehouses", superAdmin, imageUpload("warehouses", "image"), v.warehouse(false), adminWarehouses.createWarehouse);
admin.patch("/warehouses/:id", superAdmin, imageUpload("warehouses", "image"), v.warehouse(true), adminWarehouses.updateWarehouse);
admin.delete("/warehouses/:id", superAdmin, adminWarehouses.deleteWarehouse);

admin.get("/stocks", anyAdmin, adminWarehouses.stocks);
admin.post("/stocks", anyAdmin, v.stockCreate, adminWarehouses.createStock);
admin.patch("/stocks/:id", anyAdmin, v.stockAdjust, adminWarehouses.adjustStock);
admin.delete("/stocks/:id", anyAdmin, adminWarehouses.deleteStock);
admin.get("/stock-history", anyAdmin, adminWarehouses.history);

admin.get("/transfers", anyAdmin, adminWarehouses.transfers);
admin.post("/transfers", anyAdmin, v.transfer, adminWarehouses.createTransfer);
admin.post("/transfers/:id/approve", anyAdmin, adminWarehouses.approveTransfer);
admin.post("/transfers/:id/reject", anyAdmin, adminWarehouses.rejectTransfer);

admin.get("/admins", superAdmin, adminPeople.admins);
admin.post("/admins", superAdmin, v.adminCreate, adminPeople.createAdmin);
admin.patch("/admins/:id", superAdmin, v.adminUpdate, adminPeople.updateAdmin);
admin.delete("/admins/:id", superAdmin, adminPeople.deleteAdmin);
admin.get("/users", anyAdmin, adminPeople.users);

module.exports = { shop, admin };
