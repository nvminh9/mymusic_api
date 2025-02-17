const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const Video = sequelize.define(
  "Video",
  {
    videoId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    articleId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    videoLink: {
        type: DataTypes.STRING(2000),
        allowNull: false,
    }
  },
  {
    tableName: "video",
    timestamps: true,
  }
);

module.exports = Video;
