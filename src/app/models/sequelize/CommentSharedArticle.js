const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");

const CommentSharedArticle = sequelize.define(
  "CommentSharedArticle",
  {
    commentId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    sharedArticleId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    parentCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    respondedCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    content: {
        type: DataTypes.STRING(500),
        allowNull: false,
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
    tableName: "commentSharedArticle",
    timestamps: true,
  }
);

// Thiết lập quan hệ (Đã khai báo quan hệ ở index.js)
// CommentSharedArticle.belongsTo(SharedArticle, { foreignKey: "sharedArticleId" });
// CommentSharedArticle.belongsTo(User, { foreignKey: "userId" });

module.exports = CommentSharedArticle;
