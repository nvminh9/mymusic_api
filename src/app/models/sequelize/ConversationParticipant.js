const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const ConversationParticipant = sequelize.define(
  "ConversationParticipant",
  {
    conversationId: {
        type: DataTypes.UUID,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        primaryKey: true,
    },
    role: {
        type: DataTypes.STRING, // 'member' or 'admin'
        defaultValue: 'member'
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
    },
    lastReadMessageId: {
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
    tableName: "conversationParticipant",
    timestamps: true,
  }
);

module.exports = ConversationParticipant;
