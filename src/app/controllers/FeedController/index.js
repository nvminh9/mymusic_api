const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { getArticleService, getSharedArticleService } = require("../../../services/articleService");
const { getFeedDataService, getFeedRankingDataService } = require("../../../services/feedService");

class FeedController {
    
    // [GET] /feed?cursor=<timestamp>&limit=<number> (Trang Feed) (Cũ, chưa sử dụng embedding, recommendation)
    // cursor kiểu index (dạng timestamp)
    async index(req, res){
        const result = {};
        // const { articleId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const cursor = req.query.cursor || new Date();

        // Token
        const token = req.headers.authorization.split(' ')[1];
        // Lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        try {
            // Service 
            const feedData = await getFeedDataService(cursor, limit, userId);

            // Kiểm tra
            if(feedData === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = feedData?.status ? feedData?.status : 200;
            result.message = feedData?.message ? feedData?.message : 'No messages';
            result.data = feedData?.data ? feedData?.data : null;
            result.nextCursor = feedData?.nextCursor ? feedData?.nextCursor : null;
            return res.status(feedData?.status ? feedData?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /feed?cursor=<int>&limit=<number> (Lấy dữ liệu cho trang Feed) (Mới)
    // cursor kiểu thứ tự (số nguyên Int)
    async getFeed(req, res){
        try {
            const result = {};
            const { cursor, limit = 10 } = req.query;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service getFeedRankingDataService
            const feedRankingData = await getFeedRankingDataService(cursor, limit, userId);
            
            // Kiểm tra
            if(feedRankingData === null){
                return res.status(500).json({
                    status: 500,
                    message: "Internal error",
                    data: null
                });
            }

            // Kết quả
            result.status = feedRankingData?.status ? feedRankingData?.status : 200;
            result.message = feedRankingData?.message ? feedRankingData?.message : 'No messages';
            result.data = feedRankingData?.data ? feedRankingData?.data : null;
            result.nextCursor = feedRankingData?.nextCursor ? feedRankingData?.nextCursor : null;
            return res.status(feedRankingData?.status ? feedRankingData?.status : 200).json(result); 
        } catch (error) {
            console.error(error);
            return res.status(500).json({ 
                status: 500, 
                message: "Error fetching feed" 
            });
        }
    };
}

module.exports = new FeedController;