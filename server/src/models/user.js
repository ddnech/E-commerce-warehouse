"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    // Never send secrets back to the client.
    toJSON() {
      const values = { ...this.get() };
      for (const key of ["password", "verify_token", "reset_password_token", "verify_token_expires_at", "reset_password_expires_at"]) {
        delete values[key];
      }
      return values;
    }

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasOne(models.User_detail, { foreignKey: "user_id" });
      User.hasMany(models.Order, { foreignKey: "user_id" });
      User.belongsTo(models.Role, { foreignKey: "role_id" });
      User.hasMany(models.Address_user, { foreignKey: "user_id" });
      User.hasMany(models.Cart, { foreignKey: "user_id" });
      User.hasMany(models.Wishlist, { foreignKey: "user_id" });
    }
  }
  User.init(
    {
      username: DataTypes.STRING,
      email: DataTypes.STRING,
      role_id: DataTypes.INTEGER,
      password: DataTypes.STRING,
      verify_token: DataTypes.STRING,
      reset_password_token: DataTypes.STRING,
      is_verify: DataTypes.BOOLEAN,
      by_form: DataTypes.BOOLEAN,
      verify_token_expires_at: DataTypes.DATE,
      reset_password_expires_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
