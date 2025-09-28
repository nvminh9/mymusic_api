const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const SearchHistory = sequelize.define(
  "SearchHistory",
  {
    searchHistoryId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    keyword: {
        type: DataTypes.STRING(1500),
        allowNull: false,
    },
    searchedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
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
    tableName: "searchHistory",
    timestamps: true,
    deletedAt: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'keyword']
        }
    ]
  }
);

module.exports = SearchHistory;
