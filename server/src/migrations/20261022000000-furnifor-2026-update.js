"use strict";

/**
 * 2026 update.
 *  - Address_users.province_id pointed at the Cities table by mistake. It now points at Provinces.
 *  - Cities get coordinates, so the closest warehouse can be found without a geocoding API.
 *  - Verify / reset links expire, so store when.
 *  - Product descriptions can be longer than 255 characters.
 *  - The super admin doesn't have to belong to a warehouse.
 *  - Orders remember the courier service, when they were completed and why they were cancelled.
 *  - Order lines remember the price at the time of purchase (reports used today's price before).
 *  - Cart and wishlist rows point at a product instead of a random warehouse stock row.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const isMysql = queryInterface.sequelize.getDialect() === "mysql";

    // 1. Fix the province foreign key on addresses.
    const refs = await queryInterface.getForeignKeyReferencesForTable("Address_users");
    for (const ref of refs) {
      if (ref.columnName === "province_id" && ref.constraintName) {
        await queryInterface.removeConstraint("Address_users", ref.constraintName);
      }
    }
    await queryInterface.addConstraint("Address_users", {
      fields: ["province_id"],
      type: "foreign key",
      name: "address_users_province_fk",
      references: { table: "Provinces", field: "id" },
    });

    // 2. City coordinates.
    await queryInterface.addColumn("Cities", "latitude", { type: Sequelize.DECIMAL(9, 6), allowNull: true });
    await queryInterface.addColumn("Cities", "longitude", { type: Sequelize.DECIMAL(9, 6), allowNull: true });

    // 3. Expiring links.
    await queryInterface.addColumn("Users", "verify_token_expires_at", { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn("Users", "reset_password_expires_at", { type: Sequelize.DATE, allowNull: true });

    // 4. Longer descriptions.
    await queryInterface.changeColumn("Products", "description", { type: Sequelize.TEXT, allowNull: false });

    // 5. Super admin without a warehouse.
    await queryInterface.changeColumn("Admins", "warehouse_id", { type: Sequelize.INTEGER, allowNull: true });

    // 6. Order extras.
    await queryInterface.addColumn("Orders", "delivery_service", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn("Orders", "completed_at", { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn("Orders", "cancel_reason", { type: Sequelize.STRING, allowNull: true });

    // 7. Price at purchase time.
    await queryInterface.addColumn("Order_details", "price", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // 8. Cart and wishlist point at products.
    for (const table of ["Carts", "Wishlists"]) {
      await queryInterface.addColumn(table, "product_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Products", key: "id" },
        onDelete: "CASCADE",
      });
      await queryInterface.changeColumn(table, "warehouse_stock_id", { type: Sequelize.INTEGER, allowNull: true });
      if (isMysql) {
        await queryInterface.sequelize.query(
          `UPDATE ${table} t JOIN Warehouse_stocks w ON w.id = t.warehouse_stock_id SET t.product_id = w.product_id WHERE t.product_id IS NULL`
        );
      }
      await queryInterface.addIndex(table, ["user_id", "product_id"], { name: `${table.toLowerCase()}_user_product` });
    }
  },

  async down(queryInterface, Sequelize) {
    for (const table of ["Wishlists", "Carts"]) {
      await queryInterface.removeIndex(table, `${table.toLowerCase()}_user_product`);
      await queryInterface.removeColumn(table, "product_id");
    }
    await queryInterface.removeColumn("Order_details", "price");
    await queryInterface.removeColumn("Orders", "cancel_reason");
    await queryInterface.removeColumn("Orders", "completed_at");
    await queryInterface.removeColumn("Orders", "delivery_service");
    await queryInterface.changeColumn("Products", "description", { type: Sequelize.STRING, allowNull: false });
    await queryInterface.removeColumn("Users", "reset_password_expires_at");
    await queryInterface.removeColumn("Users", "verify_token_expires_at");
    await queryInterface.removeColumn("Cities", "longitude");
    await queryInterface.removeColumn("Cities", "latitude");
    await queryInterface.removeConstraint("Address_users", "address_users_province_fk");
  },
};
