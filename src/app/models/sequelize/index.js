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
const LikeComment = require("../sequelize/LikeComment");
const Blacklist = require("../sequelize/Blacklist");

// Define association (Thiết lập quan hệ)
// User
User.hasMany(Article, { foreignKey: "userId" });
User.hasMany(Comment, { foreignKey: "userId" });
User.hasMany(Song, { foreignKey: "userId" });
User.hasMany(Playlist, { foreignKey: "userId" });
User.hasMany(Follower, { foreignKey: "userId" });
User.hasMany(Follower, { foreignKey: "followerId" });
User.hasMany(LikeArticle, { foreignKey: "userId" });
User.hasMany(LikeSong, { foreignKey: "userId" });
// Article
Article.belongsTo(User, { foreignKey: "userId" });
Article.hasMany(Comment, { foreignKey: "articleId" });
Article.hasMany(LikeArticle, { foreignKey: "articleId" });
Article.hasMany(Video, { foreignKey: "articleId" });
Article.hasMany(Photo, { foreignKey: "articleId" });
// Comment
Comment.belongsTo(Article, { foreignKey: "articleId" });
Comment.belongsTo(User, { foreignKey: "userId" });
Comment.hasMany(LikeComment, { foreignKey: "commentId" }); // Gồm status thích và không thích
// Tự động xóa các bình luận con khi bình luận cha bị xóa
Comment.hasMany(Comment, {
    as: "replies",
    foreignKey: "parentCommentId",
    onDelete: "CASCADE",
    hooks: true, // Tự động xóa các bình luận con
});
Comment.belongsTo(Comment, {
    as: "parent",
    foreignKey: "parentCommentId",
    onDelete: "CASCADE",
});
// Comment.hasMany(Comment, { foreignKey: "respondedCommentId", as: "repliesToComment" }); // Bình luận trả lời
// Song
Song.belongsTo(User, { foreignKey: "userId" });
Song.belongsTo(Genre, { foreignKey: "genreId" });
// Playlist
Playlist.belongsTo(User, { foreignKey: "userId" });
Playlist.hasMany(PlaylistDetail, { foreignKey: "playlistId" });
// Follower
Follower.belongsTo(User, { foreignKey: "followerId", as: "followerUser" }); // Người theo dõi
Follower.belongsTo(User, { foreignKey: "userId", as: "followingUser" }) // Đang theo dõi

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
    LikeComment,
    Blacklist,
};