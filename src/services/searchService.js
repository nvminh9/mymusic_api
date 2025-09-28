const dotenv = require('dotenv');
dotenv.config();
const { User, sequelize, SearchHistory } = require('../app/models/sequelize');
const e = require('express');
const fs = require('fs').promises;
const path = require('path');
const { QueryTypes } = require('sequelize');
const { getArticleService } = require('./articleService');
const { getSongService } = require('./musicService');
const { getUserByIdService } = require('./userService');
const { getPlaylistService } = require('./playlistService');

// Tìm kiếm (article, song, user) theo ngữ nghĩa (sử dụng cosine distance để so sánh vector)
const semanticSearch = async ({ embedding, types = ['article','song','user'], limit = 10, authUserId }) => {
    try{
        const parts = [];
        const params = [`[${embedding.join(',')}]`, limit];

        // SQL truy vấn tìm kiếm Article
        if(types.includes('article')){
            parts.push('('+`
                SELECT 'article' AS type, "articleId" AS id, "embedding" <-> :embedding AS distance
                FROM "article"
                WHERE "embedding" IS NOT NULL
                ORDER BY "embedding" <-> :embedding
                LIMIT :limit
            `+')');
        };

        // SQL truy vấn tìm kiếm Song
        if(types.includes('song')){
            parts.push('('+`
                SELECT 'song' AS type, "songId" AS id, "embedding" <-> :embedding AS distance
                FROM "song"
                WHERE "embedding" IS NOT NULL
                ORDER BY "embedding" <-> :embedding
                LIMIT :limit
            `+')');
        }

        // SQL truy vấn tìm kiếm Playlist
        if(types.includes('playlist')){
            parts.push('('+`
                SELECT 'playlist' AS type, "playlistId" AS id, "embedding" <-> :embedding AS distance
                FROM "playlist"
                WHERE "embedding" IS NOT NULL
                ORDER BY "embedding" <-> :embedding
                LIMIT :limit
            `+')');
        }

        // SQL truy vấn tìm kiếm User
        if (types.includes('user')) {
            parts.push('('+`
                SELECT 'user' AS type, "userId" AS id, "embedding" <-> :embedding AS distance
                FROM "user"
                WHERE "embedding" IS NOT NULL
                ORDER BY "embedding" <-> :embedding
                LIMIT :limit
            `+')');
        }

        // Chuẩn bị câu sql truy vấn { type, id, distance } của item (article, song, user)
        const sql = parts.join(' UNION ALL ');        
        const rows = await sequelize.query(sql,{
            replacements: {
                embedding: params[0],
                limit: params[1],
            },
            type: QueryTypes.SELECT,
        });

        // Hợp nhất & sắp xếp lại theo distance (vì mỗi phần đã LIMIT riêng)
        rows?.sort((a, b) => a.distance - b.distance);
        const itemIds = rows?.slice(0, limit);

        // Lấy dữ liệu phù hợp cho từng item
        const resultArray = await Promise.all(
            itemIds.map(async (item) => {
                if(item.type === 'article'){
                    const article = await getArticleService(item.id, authUserId);
                    return article && article?.data ? article?.data?.dataValues : null;
                } else if (item.type === 'song') {
                    const song = await getSongService(item.id, authUserId);
                    return song && song?.data ? song?.data?.dataValues : null;
                } else if (item.type === 'playlist') {
                    const playlist = await getPlaylistService(item.id, authUserId);
                    return playlist && playlist?.data ? playlist?.data?.dataValues : null;
                } else if (item.type === 'user') {
                    const user = await getUserByIdService(item.id);
                    return user && user?.data ? user?.data?.dataValues : null;
                }
            })
        );

        // Kết quả
        return resultArray.filter(Boolean);
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Autocomplete (Trigram (similarity) + ILIKE)
const suggest = async ({ q, limit = 8 }) => {
    try{
        const like = `%${q}%`;
        const rows = await sequelize.query(`
            (SELECT 'song'  AS type, "songId" AS id, "name"     AS title FROM "song"    WHERE "name" ILIKE :like ORDER BY similarity("name", :q) DESC, "name" LIMIT :limit)
            UNION ALL
            (SELECT 'article' AS type, "articleId" AS id, LEFT("textContent", 80) AS title FROM "article" WHERE "textContent" ILIKE :like AND "privacy" = 0 ORDER BY similarity("textContent", :q) DESC, "textContent" LIMIT :limit)
            UNION ALL
            (SELECT 'user'  AS type, "userId" AS id, "userName" AS title FROM "user"    WHERE "userName" ILIKE :like ORDER BY similarity("userName", :q) DESC, "userName" LIMIT :limit)
            UNION ALL
            (SELECT 'playlist'  AS type, "playlistId" AS id, "name"     AS title FROM "playlist"    WHERE "name" ILIKE :like ORDER BY similarity("name", :q) DESC, "name" LIMIT :limit)
        `,{
            replacements: { like, q, limit },
            type: QueryTypes.SELECT,
        }
        );

        // Kết quả
        return rows;
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    semanticSearch,
    suggest
}