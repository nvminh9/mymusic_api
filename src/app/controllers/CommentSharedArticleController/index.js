const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { createCommentService, getCommentService, createLikeCommentService, unLikeCommentService, deleteCommentService, updateCommentService } = require("../../../services/commentSharedArticleService");

class CommentSharedArticleController {

    // [POST] /commentSharedArticle/create (Tạo bình luận)
    async createComment(req, res){
        const result = {};
        const { sharedArticleId, content, parentCommentId, respondedCommentId } = req.body;
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user (user thực hiện bình luận)
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Kiểm tra
            // Kiểm tra nội dung bình luận
            let trimContent = content.trim(); // Xóa khoảng trắng đầu và cuối chuỗi
            if(trimContent === undefined || trimContent === null || trimContent === ''){
                result.status = 200;
                result.message = 'Nội dung bình luận không được để trống';
                result.data = null;
                return res.status(200).json(result);
            }

            // Service tạo bình luận
            const commentSharedArticle = await createCommentService(sharedArticleId, userId, content, parentCommentId, respondedCommentId);
            // Kiểm tra kết quả của createCommentService
            if(commentSharedArticle === null){
                result.status = 200;
                result.message = 'Tạo bình luận không thành công';
                result.data = null;
                return res.status(200).json(result);
            }
            // Service tìm bình luận
            const fullCommentSharedArticle = await getCommentService(commentSharedArticle.commentId);
            // Kiểm tra kết quả của getCommentService
            if(fullCommentSharedArticle === null){
                result.status = 200;
                result.message = 'Không tìm thấy bình luận';
                result.data = null;
                return res.status(200).json(result);
            }

            // Kết quả
            result.status = 200;
            result.message = 'Tạo bình luận thành công';
            result.data = fullCommentSharedArticle;
            return res.status(200).json(result);
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /commentSharedArticle/:commentId (Chi tiết bình luận)
    async index(req, res){
        const result = {};
        const { commentId } = req.params;
        try {
            // Service tìm bình luận
            const commentSharedArticle = await getCommentService(commentId);
            // Kiểm tra kết quả của getCommentService
            if(commentSharedArticle === null){
                result.status = 200;
                result.message = 'Không tìm thấy bình luận';
                result.data = null;
                return res.status(200).json(result);
            }

            // Kết quả
            result.status = 200;
            result.message = 'Chi tiết bình luận';
            result.data = commentSharedArticle;
            return res.status(200).json(result);
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [POST] /:commentId/like (Thích bình luận)
    async createLikeComment(req, res){
        const result = {};
        const { commentId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeCommentService để tạo lượt thích
            const likeCommentSharedArticle = await createLikeCommentService(commentId, userId);
            // Kiểm tra (nếu likeCommentSharedArticle là null, có lỗi ở Service)
            if(likeCommentSharedArticle === null){
                // console.log(likeCommentSharedArticle);
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu likeCommentSharedArticle khác null, có data)
            result.status = likeCommentSharedArticle?.status ? likeCommentSharedArticle?.status : 200;
            result.message = likeCommentSharedArticle?.message ? likeCommentSharedArticle?.message : '';
            result.data = likeCommentSharedArticle?.data ? likeCommentSharedArticle?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /:commentId/unlike (Hủy thích bình luận)
    async unLikeComment(req, res){
        const result = {};
        const { commentId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeCommentServic để hủy lượt thích
            const unLikeCommentSharedArticle = await unLikeCommentService(commentId, userId);
            // Kiểm tra (nếu unLikeCommentSharedArticle là null, có lỗi ở Service)
            if(unLikeCommentSharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu unLikeCommentSharedArticle khác null, có data)
            result.status = unLikeCommentSharedArticle?.status ? unLikeCommentSharedArticle?.status : 200;
            result.message = unLikeCommentSharedArticle?.message ? unLikeCommentSharedArticle?.message : '';
            result.data = unLikeCommentSharedArticle?.data ? unLikeCommentSharedArticle?.data : null;
            return res.status(unLikeCommentSharedArticle?.status ? unLikeCommentSharedArticle?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /:commentId (Cập nhật bình luận)
    async updateComment(req, res){
        const result = {};
        const { commentId } = req.params;
        const { content } = req.body; 
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Kiểm tra nội dung bình luận
            const trimContent = content.trim(); // Xóa khoảng trắng đầu và cuối chuỗi
            if(trimContent === undefined || trimContent === null || trimContent === ''){
                result.status = 200;
                result.message = 'Nội dung bình luận không được để trống';
                result.data = null;
                return res.status(200).json(result);
            }

            // Service cập nhật bình luận
            const data = { content };
            const updatedCommentSharedArticle = await updateCommentService(commentId, userId, data);
            // Kiểm tra (nếu null, có lỗi ở Service)
            if(updatedCommentSharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = updatedCommentSharedArticle?.status ? updatedCommentSharedArticle?.status : 200;
            result.message = updatedCommentSharedArticle?.message ? updatedCommentSharedArticle?.message : 'No messages';
            result.data = updatedCommentSharedArticle?.data ? updatedCommentSharedArticle?.data : null;
            return res.status(updatedCommentSharedArticle?.status ? updatedCommentSharedArticle?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [DELETE] /:commentId (Xóa bình luận)
    async deleteComment(req, res){        
        try {
            const result = {};
            const { commentId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa bình luận
            const deletedCommentSharedArticle = await deleteCommentService(commentId, userId);
            // Kiểm tra
            if(deletedCommentSharedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedCommentSharedArticle?.status ? deletedCommentSharedArticle?.status : 200;
            result.message = deletedCommentSharedArticle?.message ? deletedCommentSharedArticle?.message : 'No messages';
            result.data = deletedCommentSharedArticle?.data ? deletedCommentSharedArticle?.data : null;
            return res.status(deletedCommentSharedArticle?.status ? deletedCommentSharedArticle?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }
}

module.exports = new CommentSharedArticleController;