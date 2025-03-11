const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");  

const Blacklist = sequelize.define(
  "Blacklist",
  {
    token: {
        type: DataTypes.STRING(3000),
        allowNull: false,
    },
  },
  {
    tableName: "blacklist",
    timestamps: true,
  }
);

module.exports = Blacklist;
