const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");
const User = require("./User");

const SharedArticle = sequelize.define(
  "SharedArticle",
  {
    sharedArticleId: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID, 
      allowNull: false,
    },
    articleId: {
      type: DataTypes.UUID, 
      allowNull: false,
    },
    sharedTextContent: {
      type: DataTypes.STRING(1500),
    },
    privacy: {
      type: DataTypes.BIGINT, // 0: public, 1: private
      allowNull: false,
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
    tableName: "sharedArticle",
    timestamps: true,
  }
);

// Quan hệ (Đã khai báo quan hệ ở index.js)
// SharedArticle.belongsTo(User, { foreignKey: "userId" });

module.exports = SharedArticle;
