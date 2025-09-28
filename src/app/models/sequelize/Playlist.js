const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const Playlist = sequelize.define(
  "Playlist",
  {
    playlistId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    coverImage: {
        type: DataTypes.STRING(2000),
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING(50), // Loại: default (danh sách phát), album,...
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(1500), // Mô tả
        allowNull: true,
    },
    userTags: {
        type: DataTypes.STRING(1000), // Chứa chuỗi các tag user (ex. @userName)
        allowNull: true,
    },
    privacy: {
      type: DataTypes.BIGINT, // 0: public, 1: private
      allowNull: true,
    },
    changedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    embedding: {
        type: 'vector(384)', // tùy kích thước embedding model
        // allowNull: false
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
    tableName: "playlist",
    timestamps: true,
    deletedAt: true,
  }
);

module.exports = Playlist;
