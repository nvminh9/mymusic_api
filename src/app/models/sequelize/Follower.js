const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");  
const { v4: uuidv4 } = require("uuid");

const Follower = sequelize.define(
  "Follower",
  {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    followerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    follower: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    userName: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    status: {
        type: DataTypes.BIGINT, // 0: followed, 1: unfollow
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
    },
  },
  {
    tableName: "follower",
    timestamps: true,
  }
);

module.exports = Follower;
