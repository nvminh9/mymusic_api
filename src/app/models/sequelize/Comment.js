const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");
const Article = require("./Article");
const User = require("./User");

const Comment = sequelize.define(
  "Comment",
  {
    commentId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    articleId: {
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
    changedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
    tableName: "comment",
    timestamps: true,
  }
);

// Thiết lập quan hệ (Đã khai báo quan hệ ở index.js)
// Comment.belongsTo(Article, { foreignKey: "articleId" });
// Comment.belongsTo(User, { foreignKey: "userId" });

module.exports = Comment;
