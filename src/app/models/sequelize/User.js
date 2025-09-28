const { DataTypes, DATE } = require("sequelize");
const sequelize = require("../../../config/database");  
const { v4: uuidv4 } = require("uuid");

const User = sequelize.define(
  "User",
  {
    userId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    userName: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
    },
    gender: {
        type: DataTypes.STRING(500), // male, female, other
    },
    birth: {
        type: DataTypes.DATEONLY,
    },
    userAvatar: {
        type: DataTypes.STRING(500),
    },
    email: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    userCoverImage: {
        type: DataTypes.STRING(500),
    },
    description: {
        type: DataTypes.STRING(1000),
    },
    embedding: {
        type: 'vector(384)', // tùy kích thước embedding model
        // allowNull: false
    },
    // createdAt: {
    //     type: DataTypes.DATE,
    //     defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
    // },
    // updatedAt: {
    //     type: DataTypes.DATE,
    //     defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
    // },
  },
  {
    tableName: "user",
    timestamps: true,
  }
);

module.exports = User;
