"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const { nodeEnv } = require("../config/env");
const config = require("../config/config.js")[nodeEnv];

const basename = path.basename(__filename);
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith(".js") && !file.endsWith(".test.js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (model.associate) model.associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
