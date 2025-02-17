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
        },
    },
    {
        tableName: "genre",
        timestamps: true,
    }
);

module.exports = Genre;
