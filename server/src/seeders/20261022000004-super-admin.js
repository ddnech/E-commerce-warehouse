"use strict";
const bcrypt = require("bcryptjs");

// The one account that can set everything else up. Change the password after the first login.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert("Admins", [
      {
        id: 1,
        username: "superadmin",
        role_id: 1,
        first_name: "Super",
        last_name: "Admin",
        password: await bcrypt.hash("Password123!", 10),
        warehouse_id: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("Admins", { id: 1 });
  },
};
