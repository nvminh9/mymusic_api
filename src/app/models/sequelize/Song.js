const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");
const User = require("./User");
const Genre = require("./Genre");

const Song = sequelize.define(
  "Song",
  {
    songId: {
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
    genreId: {
        type: DataTypes.BIGINT,
    },
    songImage: {
        type: DataTypes.STRING(2000),
    },
    songVideo: {
        type: DataTypes.STRING(2000),
    },
    songLink: {
        type: DataTypes.STRING(2000),
        allowNull: false,
    },
  },
  {
    tableName: "song",
    timestamps: true,
  }
);

// Thiết lập quan hệ (Đã khai báo quan hệ ở index.js)
// Song.belongsTo(User, { foreignKey: "userId" });
// Song.belongsTo(Genre, { foreignKey: "genreId" });

module.exports = Song;
