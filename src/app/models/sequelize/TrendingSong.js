const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");
const { v4: uuidv4 } = require("uuid");
const User = require("./User");
const Genre = require("./Genre");

const TrendingSong = sequelize.define(
  "TrendingSong",
  {
    trendingSongId: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
    },
    songId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    genreId: {
        type: DataTypes.BIGINT,
        allowNull: true, // Allow null for overall trending
        field: 'genreId',
        references: {
            model: 'genre',
            key: 'genreId'
        }
    },
    period: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    trendingScore: {
        type: DataTypes.DECIMAL(10,4),
        allowNull: false,
    },
    rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    genreRank: {
        type: DataTypes.INTEGER,
        allowNull: true, // Rank within specific genre
        field: 'genreRank'
    },
    listenCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    likeCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    shareCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    calculatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Mặc định là thời gian hiện tại
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
    tableName: "trendingSong",
    timestamps: true,
    deletedAt: 'deletedAt',
    indexes: [
        {
            name: 'idx_trending_period_rank',
            fields: ['period', 'rank']
        },
        {
            name: 'idx_trending_song_period',
            fields: ['songId', 'period']
        },
        {
            name: 'idx_trending_score',
            fields: [{ name: 'trendingScore', order: 'DESC' }]
        },
        {
            name: 'idx_trending_calculated',
            fields: [{ name: 'calculatedAt', order: 'DESC' }]
        },
        {
            name: 'unique_song_period',
            // unique: true,
            fields: ['songId', 'period']
        },
        {
            unique: true,
            name: 'unique_song_genre_period',
            fields: ['songId', 'genreId', 'period']
        },
        {
            name: 'idx_trending_genre_period_rank',
            fields: ['genreId', 'period', 'genreRank']
        },
        {
            name: 'idx_trending_overall_period_rank', 
            fields: ['period', 'rank'],
            where: {
                genreId: null
            }
        }
    ],
  }
);

// Thiết lập quan hệ (Đã khai báo quan hệ ở index.js)
// Song.belongsTo(User, { foreignKey: "userId" });
// Song.belongsTo(Genre, { foreignKey: "genreId" });

module.exports = TrendingSong;
