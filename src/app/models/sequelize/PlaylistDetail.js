const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const PlaylistDetail = sequelize.define(
  "PlaylistDetail",
  {
    playlistDetailId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    playlistId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    songId: {
        type: DataTypes.UUID,
        allowNull: false,
    }
  },
  {
    tableName: "playlistDetail",
    timestamps: true,
  }
);

module.exports = PlaylistDetail;
