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
        type: DataTypes.STRING(50),
        allowNull: false,
    }
  },
  {
    tableName: "playlist",
    timestamps: true,
  }
);

module.exports = Playlist;
