"use strict";

// All 38 provinces and 514 cities/regencies of Indonesia with coordinates.
// Data: github.com/cahyadsn/wilayah (MIT licence), based on Kepmendagri 300.2.2-2138/2025.
const { provinces, cities } = require("../data/regions.json");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("Provinces", provinces.map(({ id, name }) => ({ id, name })));
    await queryInterface.bulkInsert(
      "Cities",
      cities.map(({ id, province_id, name, latitude, longitude }) => ({ id, province_id, name, latitude, longitude, postal_code: null }))
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("Cities", null, {});
    await queryInterface.bulkDelete("Provinces", null, {});
  },
};
