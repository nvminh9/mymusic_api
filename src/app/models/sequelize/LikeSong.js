const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const LikeSong = sequelize.define(
  "LikeSong",
  {
    likeSongId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    songId: {
        type: DataTypes.UUID, 
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    status: {
        type: DataTypes.BIGINT, // 0: like, 1: unlike,
        allowNull: false,
    }
  },
  {
    tableName: "likeSong",
    timestamps: true,
  }
);

module.exports = LikeSong;
