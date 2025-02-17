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
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    status: {
        type: DataTypes.BIGINT, // 0: follow, 1: unfollow
        allowNull: false,
    }
  },
  {
    tableName: "follower",
    timestamps: true,
  }
);

module.exports = Follower;
