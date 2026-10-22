"use strict";

// Status ids matter, see src/utils/constants.js.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const names = ["Waiting for payment", "Waiting for confirmation", "Completed", "Processing", "Cancelled", "Shipped", "Payment rejected"];
    await queryInterface.bulkInsert(
      "Order_statuses",
      names.map((name, i) => ({ id: i + 1, name, createdAt: now, updatedAt: now }))
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("Order_statuses", null, {});
  },
};
