const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const MessageStatus = sequelize.define(
  "MessageStatus",
  {
    messageId: {
        type: DataTypes.UUID,
        primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    conversationId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    deliveredAt: {
        type: DataTypes.DATE,
    },
    readAt: {
        type: DataTypes.DATE,
    },
  },
  {
    tableName: "messageStatus",
    timestamps: false,
  }
);

module.exports = MessageStatus;
