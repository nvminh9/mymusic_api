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
    }
  },
  {
    tableName: "photo",
    timestamps: true,
  }
);

module.exports = Photo;
