const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const Message = sequelize.define(
  "Message",
  {
    messageId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    conversationId: {
        type: DataTypes.UUID,
    },
    senderId: {
        type: DataTypes.UUID,
    },
    content: {
        type: DataTypes.STRING,
    },
    type: {
        type: DataTypes.STRING, // text/image/video/...
        defaultValue: 'text'
    },
    metadata: {
        type: DataTypes.JSONB
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
    tableName: "message",
    timestamps: true,
  }
);

module.exports = Message;
