const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");
const User = require("./User");

const Article = sequelize.define(
  "Article",
  {
    articleId: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID, 
      allowNull: false,
    },
    textContent: {
      type: DataTypes.STRING(1500),
    },
    privacy: {
      type: DataTypes.BIGINT, // 0: public, 1: private
      allowNull: false,
    },
    changedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    embedding: {
        type: 'vector(384)', // tùy kích thước embedding model
        // allowNull: false
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
    tableName: "article",
    timestamps: true,
  }
);

// Quan hệ (Đã khai báo quan hệ ở index.js)
// Article.belongsTo(User, { foreignKey: "userId" });

module.exports = Article;
