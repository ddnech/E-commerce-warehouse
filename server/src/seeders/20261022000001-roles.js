"use strict";

// Role ids matter, see src/utils/constants.js.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert("Roles", [
      { id: 1, name: "Super Admin", createdAt: now, updatedAt: now },
      { id: 2, name: "Warehouse Admin", createdAt: now, updatedAt: now },
      { id: 3, name: "Customer", createdAt: now, updatedAt: now },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("Roles", null, {});
  },
};
