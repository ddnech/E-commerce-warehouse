"use strict";
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const env = require("../config/env");
const { distanceKm } = require("../utils/geo");
const { flatQuote } = require("../services/shipping");
const catalog = require("../data/demo-catalog");
const { cities } = require("../data/regions.json");

/*
 * A small but believable shop: 5 warehouses, 40 products, 5 customers and about seven months
 * of orders in every status, so the dashboard, reports and stock history have something to show.
 * Everything is made up. Set SEED_DEMO_DATA=false to skip it.
 *
 * Logins (password for all: Password123!)
 *   superadmin            super admin
 *   admin.jaktim, ...     warehouse admins
 *   rani@example.com      customer with orders in every status
 */

// Small seeded random generator, so the demo data is the same every time.
function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const city = (id) => cities.find((c) => c.id === id);

const WAREHOUSES = [
  [1, "Furnifor BSD", "Jl. Raya Serpong Km. 7, Cisauk", 3603, 36, -6.3085, 106.655, "021 5074 2560"],
  [2, "Furnifor Jakarta Timur", "Jl. TB Simatupang No. 30, Pasar Rebo", 3175, 31, -6.3036, 106.8621, "021 8779 1200"],
  [3, "Furnifor Surabaya", "Jl. Raya Tandes No. 88", 3578, 35, -7.2517, 112.6797, "031 7421 880"],
  [4, "Furnifor Medan", "Jl. Gatot Subroto No. 120", 1271, 12, 3.5952, 98.6553, "061 8456 300"],
  [5, "Furnifor Makassar", "Jl. Perintis Kemerdekaan Km. 10", 7371, 73, -5.11, 119.49, "0411 590 221"],
];

const ADMINS = [
  [2, "admin.bsd", "Fikri", "Ramadhan", 1],
  [3, "admin.jaktim", "Lestari", "Wulandari", 2],
  [4, "admin.surabaya", "Hendra", "Kusuma", 3],
  [5, "admin.medan", "Maria", "Sitompul", 4],
  [6, "admin.makassar", "Andi", "Rahman", 5],
];

// [id, username, email, first, last, phone, verified]
const CUSTOMERS = [
  [1, "rani.putri", "rani@example.com", "Rani", "Putri", "081211110001", true],
  [2, "dimas.aditya", "dimas@example.com", "Dimas", "Aditya", "081211110002", true],
  [3, "sekar.ayu", "sekar@example.com", "Sekar", "Ayu", "081211110003", true],
  [4, "yoga.pratama", "yoga@example.com", "Yoga", "Pratama", "081211110004", true],
  [5, "nina.wulan", "nina@example.com", "Nina", "Wulan", "081211110005", false],
];

// [id, user, title, details, city, postal]
const ADDRESSES = [
  [1, 1, "Home", "Jl. Kemang Raya No. 12, Bangka, Mampang Prapatan", 3174, "12730"],
  [2, 1, "Office", "Jl. BSD Grand Boulevard, Sampora, Cisauk", 3674, "15345"],
  [3, 2, "Home", "Jl. Dago No. 45, Coblong", 3273, "40135"],
  [4, 3, "Home", "Jl. Darmo Permai III No. 8, Dukuh Pakis", 3578, "60226"],
  [5, 4, "Home", "Jl. Boulevard Panakkukang No. 3", 7371, "90231"],
  [6, 5, "Home", "Jl. Prawirotaman No. 21, Mergangsan", 3471, "55153"],
];

const OUT_OF_STOCK = "Raja Ampat Hanging Chair";
const LOW_STOCK = { "Bromo 3-Door Wardrobe": { 1: 2, 3: 4 } };
const ONLY_SURABAYA = "Pekalongan Sideboard";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (process.env.SEED_DEMO_DATA === "false") {
      console.log("SEED_DEMO_DATA=false, skipping the demo shop.");
      return;
    }

    const rand = random(2026);
    const pick = (list) => list[Math.floor(rand() * list.length)];
    const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
    const now = dayjs();
    const start = now.subtract(7, "month").startOf("month");
    const password = await bcrypt.hash("Password123!", 10);
    const stamp = (d) => ({ createdAt: d.toDate(), updatedAt: d.toDate() });

    // ---------- warehouses and admins ----------
    await queryInterface.bulkInsert(
      "Warehouses",
      WAREHOUSES.map(([id, name, address, cityId, provinceId, lat, lng, contact]) => ({
        id,
        warehouse_name: name,
        address_warehouse: address,
        city_id: cityId,
        province_id: provinceId,
        latitude: String(lat),
        longitude: String(lng),
        warehouse_contact: contact,
        warehouse_img: null,
        ...stamp(start),
      }))
    );
    await queryInterface.bulkInsert(
      "Admins",
      ADMINS.map(([id, username, first, last, warehouseId]) => ({
        id,
        username,
        role_id: 2,
        first_name: first,
        last_name: last,
        password,
        warehouse_id: warehouseId,
        ...stamp(start),
      }))
    );
    const adminFor = (warehouseId) => ADMINS.find((a) => a[4] === warehouseId)[0];

    // ---------- categories and products ----------
    await queryInterface.bulkInsert(
      "Categories",
      catalog.categories.map((name, i) => ({ id: i + 1, name, category_img: null, ...stamp(start) }))
    );

    const products = [];
    catalog.categories.forEach((categoryName, ci) => {
      for (const [name, price, weight, description] of catalog.products[categoryName]) {
        products.push({ id: products.length + 1, name, price, weight, description, category_id: ci + 1, is_active: true });
      }
    });
    // Most products are older, the last few are "new arrivals".
    products.forEach((p, i) => {
      const created = i >= products.length - 5 ? now.subtract(between(2, 20), "day") : start.add(between(0, 10), "day");
      Object.assign(p, stamp(created));
    });
    await queryInterface.bulkInsert("Products", products);
    const productByName = (name) => products.find((p) => p.name === name);

    // ---------- stock (final numbers; history is worked out backwards later) ----------
    const stockRows = [];
    const rowFor = (warehouseId, productId) => {
      let row = stockRows.find((r) => r.warehouse_id === warehouseId && r.product_id === productId);
      if (!row) {
        row = { id: stockRows.length + 1, warehouse_id: warehouseId, product_id: productId, product_stock: 0, events: [] };
        stockRows.push(row);
      }
      return row;
    };

    for (const p of products) {
      if (p.name === OUT_OF_STOCK) {
        rowFor(1, p.id).product_stock = 0;
        continue;
      }
      if (LOW_STOCK[p.name]) {
        for (const [w, qty] of Object.entries(LOW_STOCK[p.name])) rowFor(Number(w), p.id).product_stock = qty;
        continue;
      }
      if (p.name === ONLY_SURABAYA) {
        rowFor(3, p.id).product_stock = 9;
        continue;
      }
      rowFor(1, p.id).product_stock = between(8, 30);
      if (rand() < 0.7) rowFor(2, p.id).product_stock = between(3, 20);
      if (rand() < 0.8) rowFor(3, p.id).product_stock = between(5, 25);
      if (rand() < 0.4) rowFor(4, p.id).product_stock = between(2, 10);
      if (rand() < 0.35) rowFor(5, p.id).product_stock = between(2, 10);
    }

    // ---------- customers ----------
    await queryInterface.bulkInsert(
      "Users",
      CUSTOMERS.map(([id, username, email, , , , verified]) => ({
        id,
        username,
        email,
        role_id: 3,
        password,
        verify_token: null,
        reset_password_token: null,
        is_verify: verified,
        by_form: true,
        ...stamp(start.add(id * 3, "day")),
      }))
    );
    await queryInterface.bulkInsert(
      "Address_users",
      ADDRESSES.map(([id, userId, title, details, cityId, postal]) => {
        const c = city(cityId);
        return {
          id,
          user_id: userId,
          address_title: title,
          address_details: details,
          city_id: cityId,
          province_id: c.province_id,
          latitude: String(c.latitude),
          longitude: String(c.longitude),
          postal_code: postal,
          ...stamp(start.add(userId * 3, "day")),
        };
      })
    );
    await queryInterface.bulkInsert(
      "User_details",
      CUSTOMERS.map(([id, , , first, last, phone]) => ({
        user_id: id,
        first_name: first,
        last_name: last,
        phone,
        address_user_id: ADDRESSES.find((a) => a[1] === id)[0],
        img_profile: null,
        ...stamp(start.add(id * 3, "day")),
      }))
    );

    // ---------- orders ----------
    const nearestWarehouse = (addressId) => {
      const c = city(ADDRESSES.find((a) => a[0] === addressId)[4]);
      return [...WAREHOUSES].sort((a, b) => distanceKm(c.latitude, c.longitude, a[5], a[6]) - distanceKm(c.latitude, c.longitude, b[5], b[6]))[0];
    };
    // New arrivals haven't sold yet, and the special-case products are used on purpose below.
    const newArrivals = new Set(products.slice(-5).map((p) => p.id));
    const sellable = products.filter((p) => p.name !== OUT_OF_STOCK && !LOW_STOCK[p.name] && p.name !== ONLY_SURABAYA && !newArrivals.has(p.id));

    const orders = [];
    const details = [];
    const reservations = [];
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function addOrder({ userId, addressId, status, createdAt, items }) {
      const id = orders.length + 1;
      const wh = nearestWarehouse(addressId);
      const address = ADDRESSES.find((a) => a[0] === addressId);
      const lines = items || Array.from({ length: between(1, 3) }, () => ({ product: pick(sellable), quantity: rand() < 0.8 ? 1 : 2 }));
      const unique = [...new Map(lines.map((l) => [l.product.id, l])).values()];
      const subtotal = unique.reduce((n, l) => n + l.product.price * l.quantity, 0);
      const weight = unique.reduce((n, l) => n + l.product.weight * l.quantity, 0);
      const c = city(address[4]);
      const courier = pick(flatQuote({ city_id: wh[3], province_id: wh[4], latitude: wh[5], longitude: wh[6] }, { city_id: c.id, province_id: c.province_id, latitude: c.latitude, longitude: c.longitude }, weight));
      const service = courier.services[0];

      const shipped = [3, 6].includes(status) ? createdAt.add(between(1, 2), "day").hour(between(9, 16)) : null;
      const completed = status === 3 ? shipped.add(between(2, 4), "day") : null;
      const code = Array.from({ length: 6 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");

      orders.push({
        id,
        user_id: userId,
        order_status_id: status,
        total_price: subtotal,
        delivery_price: service.cost,
        delivery_courier: courier.code,
        delivery_service: service.service,
        delivery_time: shipped ? shipped.toDate() : null,
        tracking_code: shipped ? `${courier.code.toUpperCase()}${String(id).padStart(4, "0")}${code}` : null,
        no_invoice: `FF-${createdAt.format("YYYYMMDD")}-${code}`,
        address_user_id: addressId,
        warehouse_id: wh[0],
        img_payment: [2, 3, 4, 6, 7].includes(status) ? "/uploads/payments/demo-receipt.svg" : null,
        completed_at: completed ? completed.toDate() : null,
        cancel_reason: status === 5 ? "Not paid in time" : status === 7 ? "The amount on the receipt doesn't match the order total." : null,
        createdAt: createdAt.toDate(),
        updatedAt: (completed || shipped || createdAt).toDate(),
      });

      for (const line of unique) {
        const row = rowFor(wh[0], line.product.id);
        details.push({ id: details.length + 1, order_id: id, warehouse_stock_id: row.id, quantity: line.quantity, price: line.product.price, ...stamp(createdAt) });
        if ([1, 2, 4, 7].includes(status)) {
          reservations.push({ order_id: id, warehouse_stock_id: row.id, reserve_quantity: line.quantity, ...stamp(createdAt) });
        }
        if (shipped) {
          row.events.push({ at: shipped, change: -line.quantity, journal: `Shipped order FF-${createdAt.format("YYYYMMDD")}-${code}`, admin: adminFor(wh[0]) });
        }
      }
    }

    const shoppers = [
      [1, 1],
      [2, 3],
      [3, 4],
      [4, 5],
      [1, 2],
    ];
    // Six past months of mostly completed orders, more in recent months.
    for (let m = 6; m >= 1; m--) {
      const month = now.subtract(m, "month").startOf("month");
      const count = 3 + Math.round((6 - m) / 2) + between(0, 1);
      for (let i = 0; i < count; i++) {
        const [userId, addressId] = pick(shoppers);
        addOrder({ userId, addressId, status: rand() < 0.12 ? 5 : 3, createdAt: month.add(between(0, 25), "day").hour(between(8, 21)).minute(between(0, 59)) });
      }
    }
    // This month: a couple of completed ones, then one order in each open status.
    const early = now.startOf("month");
    if (now.date() > 6) {
      addOrder({ userId: 3, addressId: 4, status: 3, createdAt: early.add(1, "day").hour(10) });
      addOrder({ userId: 2, addressId: 3, status: 3, createdAt: early.add(2, "day").hour(14) });
    }
    addOrder({ userId: 4, addressId: 5, status: 6, createdAt: now.subtract(3, "day").hour(11) });
    addOrder({ userId: 2, addressId: 3, status: 4, createdAt: now.subtract(1, "day").hour(9) });
    // Ships from Jakarta Timur, which has no sideboards. Accepting it moves one in from Surabaya.
    addOrder({
      userId: 1,
      addressId: 1,
      status: 2,
      createdAt: now.subtract(20, "hour"),
      items: [
        { product: productByName(ONLY_SURABAYA), quantity: 1 },
        { product: productByName("Garut Dining Chair, Set of 2"), quantity: 2 },
      ],
    });
    addOrder({ userId: 3, addressId: 4, status: 7, createdAt: now.subtract(5, "hour") });
    addOrder({ userId: 1, addressId: 1, status: 1, createdAt: now.subtract(2, "hour"), items: [{ product: productByName("Lombok Rattan Armchair"), quantity: 2 }] });

    // ---------- transfers ----------
    const transfers = [];
    const chairs = productByName("Garut Dining Chair, Set of 2");
    const fromRow = rowFor(3, chairs.id);
    const toRow = rowFor(2, chairs.id);
    const movedAt = now.subtract(2, "month").date(10).hour(13);
    transfers.push({ warehouse_stock_id: fromRow.id, from_warehouse_id: 3, to_warehouse_id: 2, quantity: 4, transaction_code: `TRF-${movedAt.valueOf()}`, timestamp: movedAt.toISOString(), status: "Approve", ...stamp(movedAt) });
    fromRow.events.push({ at: movedAt, change: -4, journal: "Sent to Furnifor Jakarta Timur", admin: adminFor(3) });
    toRow.events.push({ at: movedAt, change: 4, journal: "Received from Furnifor Surabaya", admin: adminFor(2) });

    const armchair = productByName("Lombok Rattan Armchair");
    const pendingAt = now.subtract(1, "day").hour(15);
    transfers.push({ warehouse_stock_id: rowFor(1, armchair.id).id, from_warehouse_id: 1, to_warehouse_id: 4, quantity: 3, transaction_code: `TRF-${pendingAt.valueOf()}`, timestamp: pendingAt.toISOString(), status: "Pending", ...stamp(pendingAt) });

    // ---------- stock history, worked out backwards from today's numbers ----------
    const history = [];
    for (const row of stockRows) {
      row.events.sort((a, b) => a.at - b.at);
      const total = row.events.reduce((n, e) => n + e.change, 0);
      let initial = row.product_stock - total;
      // If the numbers would ever dip below zero, start (and end) a bit higher.
      let running = initial;
      let lowest = initial;
      for (const e of row.events) {
        running += e.change;
        lowest = Math.min(lowest, running);
      }
      if (lowest < 0) {
        initial -= lowest;
        row.product_stock -= lowest;
      }
      running = initial;
      const admin = adminFor(row.warehouse_id);
      if (initial > 0) {
        history.push({ warehouse_stock_id: row.id, warehouse_id: row.warehouse_id, admin_id: admin, stock_before_transfer: 0, stock_after_transfer: initial, increment_decrement: "Increment", quantity: initial, journal: "Initial stock", timestamp: start.toDate(), ...stamp(start) });
      }
      for (const e of row.events) {
        const before = running;
        running += e.change;
        history.push({
          warehouse_stock_id: row.id,
          warehouse_id: row.warehouse_id,
          admin_id: e.admin,
          stock_before_transfer: before,
          stock_after_transfer: running,
          increment_decrement: e.change >= 0 ? "Increment" : "Decrement",
          quantity: Math.abs(e.change),
          journal: e.journal,
          timestamp: e.at.toDate(),
          ...stamp(e.at),
        });
      }
    }

    await queryInterface.bulkInsert(
      "Warehouse_stocks",
      stockRows.map(({ id, warehouse_id, product_id, product_stock }) => ({ id, warehouse_id, product_id, product_stock, ...stamp(start) }))
    );
    await queryInterface.bulkInsert("Orders", orders);
    await queryInterface.bulkInsert("Order_details", details);
    if (reservations.length) await queryInterface.bulkInsert("Reserved_stocks", reservations);
    await queryInterface.bulkInsert("Inventory_transfers", transfers);
    await queryInterface.bulkInsert("History_stocks", history);

    // A sample transfer receipt so the admin has something to look at.
    const target = path.join(env.uploadDir, "payments");
    fs.mkdirSync(target, { recursive: true });
    fs.copyFileSync(path.join(__dirname, "..", "data", "demo-receipt.svg"), path.join(target, "demo-receipt.svg"));
  },

  async down(queryInterface) {
    for (const table of ["History_stocks", "Inventory_transfers", "Reserved_stocks", "Order_details", "Orders", "Carts", "Wishlists", "User_details", "Address_users", "Users", "Warehouse_stocks", "Image_products", "Products", "Categories"]) {
      await queryInterface.bulkDelete(table, null, {});
    }
    await queryInterface.bulkDelete("Admins", { role_id: 2 });
    await queryInterface.bulkDelete("Warehouses", null, {});
  },
};
