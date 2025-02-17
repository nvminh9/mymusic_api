const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");  
const { v4: uuidv4 } = require("uuid");

const User = sequelize.define(
  "User",
  {
    userId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    userName: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    gender: {
        type: DataTypes.STRING(500),
    },
    birth: {
        type: DataTypes.DATE,
    },
    userAvatar: {
        type: DataTypes.STRING(500),
    },
    email: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    userCoverImage: {
        type: DataTypes.STRING(500),
    },
  },
  {
    tableName: "user",
    timestamps: true,
  }
);

module.exports = User;
