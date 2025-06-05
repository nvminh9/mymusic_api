const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { createCommentService, getCommentService, createLikeCommentService, unLikeCommentService, deleteCommentService } = require("../../../services/commentService");

class CommentController {

    // [POST] /comment/create (Tạo bình luận)
    async createComment(req, res){
        const result = {};
        const { articleId, content, parentCommentId, respondedCommentId } = req.body;
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
            const comment = await createCommentService(articleId, userId, content, parentCommentId, respondedCommentId);
            // Kiểm tra kết quả của createCommentService
            if(comment === null){
                result.status = 200;
                result.message = 'Tạo bình luận không thành công';
                result.data = null;
                return res.status(200).json(result);
            }
            // Service tìm bình luận
            const fullComment = await getCommentService(comment.commentId);
            // Kiểm tra kết quả của getCommentService
            if(fullComment === null){
                result.status = 200;
                result.message = 'Không tìm thấy bình luận';
                result.data = null;
                return res.status(200).json(result);
            }

            // Kết quả
            result.status = 200;
            result.message = 'Tạo bình luận thành công';
            result.data = fullComment;
            return res.status(200).json(result);
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /comment/:commentId (Chi tiết bình luận)
    async index(req, res){
        const result = {};
        const { commentId } = req.params;
        try {
            // Service tìm bình luận
            const comment = await getCommentService(commentId);
            // Kiểm tra kết quả của getCommentService
            if(comment === null){
                result.status = 200;
                result.message = 'Không tìm thấy bình luận';
                result.data = null;
                return res.status(200).json(result);
            }

            // Kết quả
            result.status = 200;
            result.message = 'Chi tiết bình luận';
            result.data = comment;
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
            
            // Dùng Service createLikeCommentServic để tạo lượt thích
            const likeComment = await createLikeCommentService(commentId, userId);
            // Kiểm tra (nếu likeComment là null, có lỗi ở Service)
            if(likeComment === null){
                // console.log(likeComment);
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu likeComment khác null, có data)
            result.status = likeComment?.status ? likeComment?.status : 200;
            result.message = likeComment?.message ? likeComment?.message : '';
            result.data = likeComment?.data ? likeComment?.data : null;
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
            
            // Dùng Service createLikeCommentServic để tạo lượt thích
            const unLikeComment = await unLikeCommentService(commentId, userId);
            // Kiểm tra (nếu likeComment là null, có lỗi ở Service)
            if(unLikeComment === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu unlikeComment khác null, có data)
            result.status = unLikeComment?.status ? unLikeComment?.status : 200;
            result.message = unLikeComment?.message ? unLikeComment?.message : '';
            result.data = unLikeComment?.data ? unLikeComment?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [POST] /comment/reply (Tạo bình luận trả lời)
    // async replyComment(req, res){
    //     const result = {};
    //     const { articleId, content, parentCommentId } = req.body;
    //     try {
    //         // Token
    //         const token = req.headers.authorization.split(' ')[1];
    //         // Lấy dữ liệu của auth user
    //         const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //         const userId = decoded.id;

    //         // Kiểm tra
    //         // Kiểm tra nội dung bình luận
    //         let trimContent = content.trim(); // Xóa khoảng trắng đầu và cuối chuỗi
    //         if(trimContent === undefined || trimContent === null || trimContent === ''){
    //             result.status = 200;
    //             result.message = 'Nội dung bình luận không được để trống';
    //             result.data = null;
    //             return res.status(200).json(result);
    //         }

    //         // Service tạo bình luận
    //         const comment = await createCommentService(articleId, userId, content, parentCommentId);
    //         // Kiểm tra kết quả của createCommentService
    //         if(comment === null){
    //             result.status = 200;
    //             result.message = 'Tạo bình luận không thành công';
    //             result.data = null;
    //             return res.status(200).json(result);
    //         }
    //         // Service tìm bình luận
    //         const fullComment = await getCommentService(comment.commentId);
    //         // Kiểm tra kết quả của getCommentService
    //         if(fullComment === null){
    //             result.status = 200;
    //             result.message = 'Không tìm thấy bình luận';
    //             result.data = null;
    //             return res.status(200).json(result);
    //         }

    //         // Kết quả
    //         result.status = 200;
    //         result.message = 'Tạo bình luận thành công';
    //         result.data = fullComment;
    //         return res.status(200).json(result);
    //     } catch (error) {
    //         console.log(">>> ❌ Error: ", error);
    //         return null;
    //     }
    // };

    // [PUT] / (update)

    // [DELETE] / (delete)
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
            const deletedComment = await deleteCommentService(commentId, userId);
            // Kiểm tra
            if(deletedComment === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedComment?.status ? deletedComment?.status : 200;
            result.message = deletedComment?.message ? deletedComment?.message : 'No messages';
            result.data = deletedComment?.data ? deletedComment?.data : null;
            return res.status(deletedComment?.status ? deletedComment?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }
}

module.exports = new CommentController;