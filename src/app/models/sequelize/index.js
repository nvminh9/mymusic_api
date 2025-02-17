const sequelize = require("../../../config/database");

// Define model
const User = require("../sequelize/User");
const Article = require("../sequelize/Article");
const Comment = require("../sequelize/Comment");
const Song = require("../sequelize/Song");
const Playlist = require("../sequelize/Playlist");
const Genre = require("../sequelize/Genre");
const Video = require("../sequelize/Video");
const Photo = require("../sequelize/Photo");
const PlaylistDetail = require("../sequelize/PlaylistDetail");
const Follower = require("../sequelize/Follower");
const LikeArticle = require("../sequelize/LikeArticle");
const LikeSong = require("../sequelize/LikeSong");

// Define association (Thiết lập quan hệ)
// User
User.hasMany(Article, { foreignKey: "userId" });
User.hasMany(Comment, { foreignKey: "userId" });
User.hasMany(Song, { foreignKey: "userId" });
User.hasMany(Playlist, { foreignKey: "userId" });
User.hasMany(Follower, { foreignKey: "userId" });
User.hasMany(LikeArticle, { foreignKey: "userId" });
User.hasMany(LikeSong, { foreignKey: "userId" });
// Article
Article.belongsTo(User, { foreignKey: "userId" });
Article.hasMany(Comment, { foreignKey: "articleId" });
Article.hasMany(Video, { foreignKey: "articleId" });
Article.hasMany(Photo, { foreignKey: "articleId" });
// Comment
Comment.belongsTo(Article, { foreignKey: "articleId" });
Comment.belongsTo(User, { foreignKey: "userId" });
// Song
Song.belongsTo(User, { foreignKey: "userId" });
Song.belongsTo(Genre, { foreignKey: "genreId" });
// Playlist
Playlist.belongsTo(User, { foreignKey: "userId" });
Playlist.hasMany(PlaylistDetail, { foreignKey: "playlistId" });

module.exports = {
    sequelize,
    User,
    Article,
    Comment,
    Song,
    Playlist,
    Genre,
    Video,
    Photo,
    PlaylistDetail,
    Follower,
    LikeArticle,
    LikeSong,
};