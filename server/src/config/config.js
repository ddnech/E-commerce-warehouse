// Used by both the app and sequelize-cli (migrations / seeders).
const { db } = require("./env");

const base = {
  username: db.username,
  password: db.password,
  database: db.database,
  host: db.host,
  port: db.port,
  dialect: db.dialect,
  timezone: db.timezone,
  logging: false,
  // Remember which seeders already ran, so `db:seed:all` is safe to run again.
  seederStorage: "sequelize",
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
