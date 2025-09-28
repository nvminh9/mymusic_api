const dotenv = require('dotenv');
dotenv.config();
// const e = require('express');
// const fs = require('fs').promises;
// const path = require('path');
const { getArticleService } = require('./articleService');
const sequelize = require('../config/database');
const { getSharedArticleService } = require('./sharedArticleService');
const { User, Article, SharedArticle, Playlist } = require('../app/models/sequelize');
const { cosineSimilarity } = require('../utils/cosineSimilarity');
const { Op } = require('sequelize');
const { getPlaylistService } = require('./playlistService');

// Thực hiện lấy dữ liệu cho Feed
const getFeedDataService = async (cursor, limit, authUserId) => {
    try {
        // Query các articleId, sharedArticleId (dùng Raw SQL)
        const feedItems = await sequelize.query(`
            (
            SELECT 'article' AS type, "articleId" AS id, "createdAt"
            FROM article
            WHERE privacy = 0 AND "createdAt" < :cursor
            )
            UNION ALL
            (
            SELECT 'sharedArticle' AS type, "sharedArticleId" AS id, "createdAt"
            FROM "sharedArticle"
            WHERE privacy = 0 AND "createdAt" < :cursor
            )
            ORDER BY "createdAt" DESC
            LIMIT :limit
        `, {
            replacements: { cursor, limit },
            type: sequelize.QueryTypes.SELECT,
        });

        // Lấy dữ liệu chi tiết cho từng phần tử trong feed
        const result = await Promise.all(feedItems.map(async (item) => {
            if (item.type === 'article') {
                const article = await getArticleService(item.id, authUserId);
                return { type: 'article', data: article.data };
            } else if (item.type === 'sharedArticle') {
                const shared = await getSharedArticleService(item.id, authUserId);
                return { type: 'sharedArticle', data: shared.data };
            }
        }));

        // Kiểm tra
        if(result){
            return {
                status: 200,
                message: 'Dữ liệu của trang Feed',
                data: result,
                nextCursor: result.length > 0 ? result[result.length - 1].data.createdAt : null,
            }
        } else {
            return {
                status: 200,
                message: 'Dữ liệu của trang Feed',
                data: null,
                nextCursor: null,
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện lấy dữ liệu cho trang Feed (Feed Ranking)
const getFeedRankingDataService = async (cursor, limit, authUserId) => {
    try {
        // Lấy embedding của user
        const user = await User.findByPk(authUserId);
        const userEmbedding = JSON.parse(user.embedding);
        // Kiểm tra nếu userEmbedding === null thì dùng service lấy feed thường
        if(userEmbedding === null){
            const feedData = await getFeedDataService(new Date(), limit, authUserId);
            return feedData;
        }

        // Gom candidates: bài viết, chia sẻ, playlist
        const candidates = [];

        const articles = await Article.findAll({
            where: {
                privacy: 0,
                embedding: {
                    [Op.not]: null
                }
            },
            limit: 50,
            order: [["createdAt", "DESC"]],
            include: [{ model: User, attributes: ["userId", "userName"] }],
        });
        candidates.push(...articles.map((a) => ({ type: "article", data: a })));

        const shared = await SharedArticle.findAll({
            where: {
                privacy: 0,
                embedding: {
                    [Op.not]: null
                }
            },
            limit: 50,
            order: [["createdAt", "DESC"]],
            include: [{ model: User, attributes: ["userId", "userName"] }],
        });
        candidates.push(...shared.map((s) => ({ type: "shared", data: s })));

        const playlists = await Playlist.findAll({
            where: {
                privacy: 0,
                embedding: {
                    [Op.not]: null
                }
            },
            limit: 50,
            order: [["createdAt", "DESC"]],
            include: [{ model: User, attributes: ["userId", "userName"] }],
        });
        candidates.push(...playlists.map((p) => ({ type: "playlist", data: p })));

        // Tính điểm cho mỗi candidate
        const scored = candidates.map((c) => {
            const contentEmbedding = JSON.parse(c.data.embedding);
            const sim = cosineSimilarity(userEmbedding, contentEmbedding);

            // Recency score (giảm dần theo thời gian)
            const hoursAgo = (Date.now() - new Date(c.data.createdAt)) / (1000 * 60 * 60);
            const recencyScore = Math.max(0, 1 - hoursAgo / 24);

            // Engagement score
            const likes = c.data.likesCount || 0;
            const shares = c.data.sharesCount || 0;
            const engagementScore = Math.log1p(likes + shares);

            // Relation score (followed user tăng điểm)
            const relationScore = user.following?.includes(c.data.userId) ? 1 : 0;

            const finalScore =
                0.4 * sim + 0.2 * recencyScore + 0.3 * engagementScore + 0.1 * relationScore;

            return { ...c, score: finalScore };
        });

        // Sort theo score
        const listScoredSorted = scored.sort((a, b) => b.score - a.score);
        
        // Lấy dữ liệu chi tiết cho từng phần tử trong feed
        const result = await Promise.all(listScoredSorted.map(async (item) => {
            if (item.type === 'article') {
                const article = await getArticleService(item.data.dataValues.articleId, authUserId);
                return { type: 'article', data: article.data, score: item.score };
            } else if (item.type === 'shared') {
                const shared = await getSharedArticleService(item.data.dataValues.sharedArticleId, authUserId);
                return { type: 'sharedArticle', data: shared.data,  score: item.score};
            } else if (item.type === 'playlist') {
                const playlist = await getPlaylistService(item.data.dataValues.playlistId, authUserId);
                return { type: 'playlist', data: playlist.data, score: item.score };
            };
        }));

        // Phân trang (cursor = index trong danh sách)
        const start = cursor ? parseInt(cursor) : 0;
        const page = result.slice(start, start + parseInt(limit));
        const nextCursor = start + page.length < scored.length ? start + page.length : null;

        return {
            status: 200,
            message: "Feed data",
            data: page,
            nextCursor,
        };
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = {
    getFeedDataService,
    getFeedRankingDataService
}