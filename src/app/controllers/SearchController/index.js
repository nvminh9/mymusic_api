const { createArticleService, getArticleService, getArticleComments, getArticleCommentsService, createLikeArticleService, unLikeArticleService, getArticleLikesService, deleteArticleService, shareArticleService, getSharedArticleService } = require("../../../services/articleService");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { getEmbedding } = require("../../ML/embedder");
const { suggest, semanticSearch } = require("../../../services/searchService");
const { recommendForUser } = require("../../../services/recommendService");
const { createSearchHistory, getSearchHistoryDataService, deleteSearchHistoryService } = require("../../../services/searchHistoryService");

class SearchController {

    // [GET] /search?q=<query>&types=<article?,song?,playlist?,user?>&limit=<12>&authUserId=<userId> (Kết quả tìm kiếm)
    // Semantic Search, Suggest (You may like)
    async index(req, res){
        try { 
            const result = {};        
            const { q = '', limit = '12', types = 'article,song,playlist,user', authUserId } = req.query;
            const parsedLimit = Math.min(Number(limit) || 12, 50);
            const typeArr = String(types).split(',').map(s => s.trim()).filter(Boolean);

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Autocomplete nhanh (nếu client cần)
            // const suggestions = q ? await suggest({ q, limit: 8 }) : [];

            // Semantic search khi có q
            let results = [];
            if (q) {
                const embedding = await getEmbedding(q);
                results = await semanticSearch({ embedding, types: typeArr, limit: parsedLimit, authUserId: userId });
                // Lưu lịch sử tìm kiếm
                if(q?.trim()){
                    await createSearchHistory({ userId, keyword: q.trim() });
                }
            }

            // Bạn có thể thích (nên trả riêng để UI hiển thị block riêng)
            let youMayLike = [];
            if (authUserId === userId) {
                youMayLike = await recommendForUser(authUserId, { limit: 8 });
            }

            // Kết quả
            return res.status(200).json({
                status: 200,
                message: 'Kết quả tìm kiếm',
                data: {
                    query: q,
                    results: results ? results : null,      // Kết quả semantic (trộn article/song/playlist/user)
                    youMayLike: youMayLike ? youMayLike : null,   // Gợi ý riêng cho user
                }
            });
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /search/history?page=<number>&limit=<number> (Lấy lịch sử tìm kiếm)
    async getSearchHistoryData(req, res){
        try {
            const result = {};
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service 
            const data = { userId, page, limit, offset };
            const searchHistoryData = await getSearchHistoryDataService(data);
            // Kiểm tra
            if(searchHistoryData === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = searchHistoryData?.status ? searchHistoryData?.status : 200;
            result.message = searchHistoryData?.message ? searchHistoryData?.message : 'No messages';
            result.data = searchHistoryData?.data ? searchHistoryData?.data : null;
            result.pagination = searchHistoryData?.pagination ? searchHistoryData?.pagination : null;
            return res.status(result.status).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /search/autocomplete?q=<query>&limit=<number> (Lấy autocomplete)
    async getAutocomplete(req, res){
        try {
            const result = {};
            const { q = '', limit = '12' } = req.query;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Autocomplete
            const suggestions = q ? await suggest({ q, limit: 8 }) : [];
            
            // Kết quả
            return res.status(200).json({
                status: 200,
                message: 'Gợi ý từ khóa tìm kiếm',
                data: {
                    query: q,
                    suggestions
                }
            });
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [DELETE] /search/history/:searchHistoryId/delete (Xóa lịch sử tìm kiếm)
    async deleteSearchHistory(req, res){
        try { 
            const result = {};
            const { searchHistoryId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service Delete Search Service
            const deletedSearchHistory = await deleteSearchHistoryService(searchHistoryId);

            // Kiểm tra
            if(deletedSearchHistory === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedSearchHistory?.status ? deletedSearchHistory?.status : 200;
            result.message = deletedSearchHistory?.message ? deletedSearchHistory?.message : 'No messages';
            result.data = deletedSearchHistory?.data ? deletedSearchHistory?.data : null;
            return res.status(deletedSearchHistory?.status ? deletedSearchHistory?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

}

module.exports = new SearchController;