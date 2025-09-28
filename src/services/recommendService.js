const dotenv = require('dotenv');
dotenv.config();
const { User, sequelize } = require('../app/models/sequelize');
const e = require('express');
const fs = require('fs').promises;
const path = require('path');
const { QueryTypes } = require('sequelize');
const { getArticleService } = require('./articleService');
const { getSongService } = require('./musicService');
const { getUserByIdService } = require('./userService');

// Lấy Embedding hồ sơ sở thích của User (trung bình các item đã tương tác)
const getUserPreferenceEmbedding = async (userId) => {
    try{
        // Trung bình embedding của 50 bài hát user nghe gần đây nhất
        const rows = await sequelize.query(`
            SELECT s."embedding"
            FROM "listeningHistory" h
            JOIN "song" s ON s."songId" = h."songId"
            WHERE h."userId" = :userId AND s."embedding" IS NOT NULL
            ORDER BY h."playedAt" DESC
            LIMIT 50
            `,
            {
                replacements: {
                    userId: userId,
                },
                type: QueryTypes.SELECT,
            }
        );

        // Kiểm tra
        if(!rows?.length || rows?.length === 0){
            return null;
        }

        const dim = JSON.parse(rows[0]?.embedding)?.length; // Kích thước
        const avg = new Array(dim).fill(0); // Khung 384 ô có value là 0 (Chứa kết quả cuối cùng)
        // Cộng các embedding (vector) lại
        for (const r of rows) {
            const v = JSON.parse(r.embedding);
            for (let i = 0; i < dim; i++) {
                avg[i] += v[i];
            }
        }
        // Tính trung bình (ở mỗi ô sẽ tính lại giá trị mới bằng giá trị của ô đó chia số lượng bài nhạc lấy được (tối đa 50))
        for (let i = 0; i < dim; i++) {
            avg[i] /= rows.length;
        }

        // Normalize
        const norm = Math.sqrt(avg.reduce((s, x) => s + x * x, 0)) || 1;
        return avg.map(x => x / norm);
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Recommend theo embedding, nếu không có thì lấy phổ biến
const recommendForUser = async (userId, { limit = 10 }) => {
    try{
        const pref = await getUserPreferenceEmbedding(userId);
        // NẾU CÓ embedding từ hồ sơ sở thích của người dùng (hành vi người dùng)
        // if (pref) {
        //     const rows = await sequelize.query(`
        //             SELECT 'song' AS type, "songId" AS id, "embedding" <-> :pref AS distance
        //             FROM "song"
        //             WHERE "embedding" IS NOT NULL
        //             ORDER BY "embedding" <-> :pref
        //             LIMIT :limit
        //         `,
        //         {
        //             replacements: {
        //                 pref: `[${pref.join(',')}]`,
        //                 limit: limit,
        //             },
        //             type: QueryTypes.SELECT,
        //         }
        //     );

        //     // Sắp xếp lại theo distance (tăng dần)
        //     rows?.sort((a, b) => a.distance - b.distance);
        //     const itemIds = rows?.slice(0, limit);

        //     // Lấy dữ liệu phù hợp cho từng item
        //     const resultArray = await Promise.all(
        //         itemIds.map(async (item) => {
        //             if(item.type === 'article'){
        //                 const article = await getArticleService(item.id, userId);
        //                 return article && article?.data ? article?.data?.dataValues : null;
        //             } else if (item.type === 'song') {
        //                 const song = await getSongService(item.id, userId);
        //                 return song && song?.data ? song?.data?.dataValues : null;
        //             } else if (item.type === 'user') {
        //                 const user = await getUserByIdService(item.id);
        //                 return user && user?.data ? user?.data?.dataValues : null;
        //             }
        //         })
        //     );

        //     // Kết quả
        //     return resultArray.filter(Boolean);
        // }

        // NẾU KHÔNG CÓ embedding từ hồ sơ sở thích của người dùng (hành vi người dùng)
        // Fallback: phổ biến theo like gần đây (7 ngày)
        const rows = await sequelize.query(`
                SELECT 'song' AS type, s."songId" AS id, 0::float AS distance
                FROM "song" s
                LEFT JOIN "likeSong" l ON l."songId" = s."songId" AND l.status = 0 AND l."createdAt" >= NOW() - INTERVAL '7 days'
                GROUP BY s."songId"
                ORDER BY COUNT(l."likeSongId") DESC, MAX(l."createdAt") DESC NULLS LAST
                LIMIT :limit
            `,
            {
                replacements: {
                    limit: limit,
                },
                type: QueryTypes.SELECT,
            }
        );

        // Sắp xếp lại theo distance (tăng dần)
        rows?.sort((a, b) => a.distance - b.distance);
        const itemIds = rows?.slice(0, limit);

        // Lấy dữ liệu phù hợp cho từng item
        const resultArray = await Promise.all(
            itemIds.map(async (item) => {
                if(item.type === 'article'){
                    const article = await getArticleService(item.id, userId);
                    return article && article?.data ? article?.data?.dataValues : null;
                } else if (item.type === 'song') {
                    const song = await getSongService(item.id, userId);
                    return song && song?.data ? song?.data?.dataValues : null;
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

module.exports = {
    getUserPreferenceEmbedding,
    recommendForUser
}