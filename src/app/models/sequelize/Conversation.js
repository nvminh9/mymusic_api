const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const Conversation = sequelize.define(
  "Conversation",
  {
    conversationId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    type: {
        type: DataTypes.STRING,  // 'dm' or 'group'
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(500),
    },
    avatar: {
        type: DataTypes.STRING,
    },
    createdBy: {
        type: DataTypes.UUID,
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
    tableName: "conversation",
    timestamps: true,
  }
);

module.exports = Conversation;
