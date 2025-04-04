const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const Photo = sequelize.define(
  "Photo",
  {
    photoId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    articleId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    photoLink: {
        type: DataTypes.STRING(2000),
        allowNull: false,
    },
    order: {
        type: DataTypes.INTEGER, // Thứ tự hiển thị trong bài viết
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
    tableName: "photo",
    timestamps: true,
    deletedAt: true,
  }
);

module.exports = Photo;
