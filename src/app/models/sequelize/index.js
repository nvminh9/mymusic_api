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
const SharedArticle = require("../sequelize/SharedArticle");
const LikeSharedArticle = require("../sequelize/LikeSharedArticle");
const CommentSharedArticle = require("../sequelize/CommentSharedArticle");
const LikeCommentSharedArticle = require("../sequelize/LikeCommentSharedArticle");
const ListeningHistory = require("../sequelize/ListeningHistory");
const SearchHistory = require("../sequelize/SearchHistory");
const TrendingSong = require("../sequelize/TrendingSong");
const Conversation = require("../sequelize/Conversation");
const ConversationParticipant = require("../sequelize/ConversationParticipant");
const Message = require("../sequelize/Message");
const MessageStatus = require("../sequelize/MessageStatus");

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
User.hasMany(Message, { foreignKey: "senderId", sourceKey: "userId" });
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
// Shared Article
SharedArticle.belongsTo(User, { foreignKey: "userId" });
SharedArticle.hasMany(Comment, { foreignKey: "articleId" });
SharedArticle.hasMany(LikeSharedArticle, { foreignKey: "sharedArticleId" });
// SharedArticle.hasMany(Video, { foreignKey: "articleId" });
// SharedArticle.hasMany(Photo, { foreignKey: "articleId" });
// Shared Article Comment
CommentSharedArticle.belongsTo(SharedArticle, { foreignKey: "sharedArticleId" });
CommentSharedArticle.belongsTo(User, { foreignKey: "userId" });
CommentSharedArticle.hasMany(LikeCommentSharedArticle, { foreignKey: "commentId" }); // Gồm status thích và không thích
// Tự động xóa các bình luận con khi bình luận cha bị xóa
CommentSharedArticle.hasMany(CommentSharedArticle, {
    as: "replies",
    foreignKey: "parentCommentId",
    onDelete: "CASCADE",
    hooks: true, // Tự động xóa các bình luận con
});
CommentSharedArticle.belongsTo(CommentSharedArticle, {
    as: "parent",
    foreignKey: "parentCommentId",
    onDelete: "CASCADE",
});
// Comment.hasMany(Comment, { foreignKey: "respondedCommentId", as: "repliesToComment" }); // Bình luận trả lời
// Genre
Genre.hasMany(TrendingSong, { foreignKey: "genreId", sourceKey: "genreId", as: "TrendingSongs" });
// Song
Song.belongsTo(User, { foreignKey: "userId" });
Song.belongsTo(Genre, { foreignKey: "genreId" });
Song.hasMany(ListeningHistory, { foreignKey: "songId" });
Song.hasMany(LikeSong, { foreignKey: "songId" });
Song.hasMany(TrendingSong, { foreignKey: "songId", sourceKey: "songId", as: "TrendingRecords" });
// Playlist
Playlist.belongsTo(User, { foreignKey: "userId" });
Playlist.hasMany(PlaylistDetail, { foreignKey: "playlistId" });
// Follower
Follower.belongsTo(User, { foreignKey: "followerId", as: "followerUser" }); // Người theo dõi
Follower.belongsTo(User, { foreignKey: "userId", as: "followingUser" }) // Đang theo dõi
// Listening History
ListeningHistory.belongsTo(User, { foreignKey: "userId" });
ListeningHistory.belongsTo(Song, { foreignKey: "songId" });
// Search History
SearchHistory.belongsTo(User, { foreignKey: "userId" });
// Trending Song
TrendingSong.belongsTo(Song, { foreignKey: "songId", targetKey: "songId", as: "Song" });
TrendingSong.belongsTo(Song, { foreignKey: "songId", include: [
        {
            model: User,
            as: 'User',
            attributes: ['userId', 'name', 'userName', 'userAvatar']
        },
        {
            model: Genre,
            as: 'Genre',
            attributes: ['genreId', 'name']
        }
    ]
});
TrendingSong.belongsTo(Genre, { foreignKey: "genreId", targetKey: "genreId", as: "Genre" });
// Conversation
Conversation.hasMany(ConversationParticipant, { foreignKey: "conversationId", sourceKey: "conversationId" });
Conversation.hasMany(Message, { foreignKey: "conversationId", sourceKey: "conversationId" });
// ConversationParticipant
ConversationParticipant.belongsTo(Conversation, { foreignKey: "conversationId", targetKey: "conversationId" });
// Message
Message.belongsTo(Conversation, { foreignKey: "conversationId", targetKey: "conversationId" });
Message.belongsTo(User, { foreignKey: "senderId", targetKey: "userId", as: "Sender" });

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
    SharedArticle,
    LikeSharedArticle,
    CommentSharedArticle,
    LikeCommentSharedArticle,
    ListeningHistory,
    SearchHistory,
    TrendingSong,
    Conversation,
    ConversationParticipant,
    Message,
    MessageStatus,
};