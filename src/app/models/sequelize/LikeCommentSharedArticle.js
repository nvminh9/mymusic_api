const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const LikeCommentSharedArticle = sequelize.define(
  "LikeCommentSharedArticle",
  {
    likeCommentId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    commentId: {
        type: DataTypes.UUID, 
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    status: {
        type: DataTypes.BIGINT, // 0: like, 1: unlike,
        allowNull: false,
        defaultValue: 0, // Nếu record mới được tạo thì mặc định là hành động thích (status 0)
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
    tableName: "likeCommentSharedArticle",
    timestamps: true,
  }
);

module.exports = LikeCommentSharedArticle;
