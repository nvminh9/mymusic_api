const { getSharedArticleService, createLikeSharedArticleService, unLikeSharedArticleService, deleteSharedArticleService } = require("../../../services/sharedArticleService");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");

class SharedArticleController {

    // [GET] /sharedArticle/:sharedArticleId (Chi tiết bài chia sẻ)
    async index(req, res) {
        try {
            const result = {};
            const { sharedArticleId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service lấy dữ liệu bài chia sẻ
            const sharedArticle = await getSharedArticleService(sharedArticleId, userId);

            // Kiểm tra            
            if(sharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = sharedArticle?.status ? sharedArticle?.status : 200;
            result.message = sharedArticle?.message ? sharedArticle?.message : 'No messages';
            result.data = sharedArticle?.data ? sharedArticle?.data : null;
            return res.status(sharedArticle?.status ? sharedArticle?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [POST] /:sharedArticleId/like (Thích bài chia sẻ)
    async like(req, res){
        const result = {};
        const { sharedArticleId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeSharedArticleService để tạo lượt thích
            const likeSharedArticle = await createLikeSharedArticleService(sharedArticleId, userId);
            // Kiểm tra (nếu likeSharedArticle là null, có lỗi ở Service)
            if(likeSharedArticle === null){
                // console.log(likeSharedArticle);
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu likeArticle khác null, có data)
            result.status = likeSharedArticle?.status ? likeSharedArticle?.status : 200;
            result.message = likeSharedArticle?.message ? likeSharedArticle?.message : '';
            result.data = likeSharedArticle?.data ? likeSharedArticle?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /:sharedArticleId/unlike (Hủy thích bài chia sẻ)
    async unlike(req, res){
        const result = {};
        const { sharedArticleId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service unLikeSharedArticleService để hủy lượt thích
            const unlikeSharedArticle = await unLikeSharedArticleService(sharedArticleId, userId);
            // Kiểm tra (nếu likeSharedArticle là null, có lỗi ở Service)
            if(unlikeSharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu unlikeSharedArticle khác null, có data)
            result.status = unlikeSharedArticle?.status ? unlikeSharedArticle?.status : 200;
            result.message = unlikeSharedArticle?.message ? unlikeSharedArticle?.message : '';
            result.data = unlikeSharedArticle?.data ? unlikeSharedArticle?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [DELETE] /:sharedArticleId (Xóa bài chia sẻ)
    async delete(req, res){
        try {
            const result = {};
            const { sharedArticleId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa bài chia sẻ
            const deletedSharedArticle = await deleteSharedArticleService(sharedArticleId, userId);
            // Kiểm tra
            if(deletedSharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedSharedArticle?.status ? deletedSharedArticle?.status : 200;
            result.message = deletedSharedArticle?.message ? deletedSharedArticle?.message : 'No messages';
            result.data = deletedSharedArticle?.data ? deletedSharedArticle?.data : null;
            return res.status(deletedSharedArticle?.status ? deletedSharedArticle?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new SharedArticleController;