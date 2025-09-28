const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const ListeningHistory = sequelize.define(
  "ListeningHistory",
  {
    listeningHistoryId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    songId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    playedAt: {
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
    tableName: "listeningHistory",
    timestamps: true,
    deletedAt: true,
    indexes: [
        {
            name: 'idx_user_playedAt',
            fields: [
                'userId',
                {
                    attribute: 'playedAt',
                    order: 'DESC',
                }
            ],
        },
    ],
  }
);

module.exports = ListeningHistory;
