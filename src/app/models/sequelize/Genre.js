const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const Genre = sequelize.define(
    "Genre",
    {
        genreId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
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
        tableName: "genre",
        timestamps: true,
    }
);

module.exports = Genre;
