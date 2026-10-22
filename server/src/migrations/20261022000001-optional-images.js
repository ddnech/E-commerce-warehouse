"use strict";

// Pictures for categories and warehouses are optional now (the shop draws one when there's none),
// and stock changes made by the system itself don't have an admin.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Categories", "category_img", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("Warehouses", "warehouse_img", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.changeColumn("History_stocks", "admin_id", { type: Sequelize.INTEGER, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE Categories SET category_img = '' WHERE category_img IS NULL");
    await queryInterface.sequelize.query("UPDATE Warehouses SET warehouse_img = '' WHERE warehouse_img IS NULL");
    await queryInterface.changeColumn("Categories", "category_img", { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn("Warehouses", "warehouse_img", { type: Sequelize.STRING, allowNull: false });
  },
};