const dotenv = require('dotenv');
dotenv.config();
const { User, Article, Photo, Video, LikeArticle, Comment, LikeComment, CommentSharedArticle, LikeCommentSharedArticle } = require('../app/models/sequelize');
const e = require('express');

// Tạo bình luận
const createCommentService = async (sharedArticleId, userId, content, parentCommentId, respondedCommentId) => {
    try {
        // Tạo bình luận
        const commentSharedArticle = await CommentSharedArticle.create(
            {
                sharedArticleId: sharedArticleId,
                userId: userId,
                content: content,
                parentCommentId: parentCommentId ? parentCommentId : null,
                respondedCommentId: respondedCommentId ? respondedCommentId : null,
            }
        );
        // Kiểm tra
        if(commentSharedArticle){
            return commentSharedArticle;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy chi tiết bình luận
const getCommentService = async (commentId) => {
    try {
        // Tìm bình luận theo commentId
        const commentSharedArticle = await CommentSharedArticle.findByPk(
            commentId,
            {
                include: [
                    {   
                        model: User, 
                        attributes: { exclude: ['password'] }, // Không lấy password 
                    }
                ]
            }
        );
        // plainComment
        const plainComment = commentSharedArticle.get({ plain: true });
        // Tìm respondedComment tương ứng với respondedCommentId
        const respondedComment = await CommentSharedArticle.findByPk(
            plainComment.respondedCommentId,
            {
                // atrtributes: {exclude: ['content', 'createdAt', 'updatedAt']},
                include: [
                    {   
                        model: User, 
                        attributes: ['userId', 'name', 'userName', 'userAvatar'],
                    }
                ]
            }
        );
        plainComment.respondedComment = respondedComment ? respondedComment.get({ plain: true }) : null;
        // Kiểm tra
        if(plainComment){
            return plainComment;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện thích bình luận
const createLikeCommentService = async (commentId, userId) => {
    try {        
        // Dùng findOrCreate để kiểm tra xem có record nào tương ứng không (commentId, userId)
        // likeCommentSharedArticle: type LikeCommentSharedArticle Object
        // created: type boolean
        const [likeCommentSharedArticle, created] = await LikeCommentSharedArticle.findOrCreate(
            {
                where: {
                    commentId: commentId,
                    userId: userId
                },
            }
        );

        // Kiểm tra trường hợp created true (vừa tạo record mới, status mặc định là 0)
        if(created){
            return {
                status: 200,
                message: 'Thích bình luận thành công',
                data: created
            };
        }

        // Kiểm tra nếu có likeCommentSharedArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeCommentSharedArticle.get({ plain: true }).status === '0'){
            return {
                status: 200,
                message: 'Đã thích bình luận trước đó',
                data: likeCommentSharedArticle.get({ plain: true })
            };
        }
        // Nếu status 1
        if(likeCommentSharedArticle.get({ plain: true }).status === '1'){
            // Cập nhật status thành 0 
            const updateLikeCommentSharedArticle = await LikeCommentSharedArticle.update(
                { status: 0 },
                {
                    where: {
                        commentId: commentId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeCommentSharedArticle){
                return {
                    status: 200,
                    message: 'Thích bình luận thành công',
                    data: updateLikeCommentSharedArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Thích bình luận không thành công',
                    data: null
                };
            }
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện hủy thích bình luận
const unLikeCommentService = async (commentId, userId) => {
    try {        
        // Tìm record tương ứng (commentId, userId)
        const likeCommentSharedArticle = await LikeCommentSharedArticle.findOne(
            {
                where: {
                    commentId: commentId,
                    userId: userId
                },
            }
        );
        // Kiểm tra trường hợp likeCommentSharedArticle null (Chưa có record tương ứng trong LikeCommentSharedArticle)
        if(!likeCommentSharedArticle){
            return {
                status: 200,
                message: 'Chưa thích bình luận này trước đó',
                data: likeCommentSharedArticle
            };
        }

        // Kiểm tra nếu có likeCommentSharedArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeCommentSharedArticle.get({ plain: true }).status === '0'){
            // Cập nhật status thành 1 
            const updateLikeCommentSharedArticle = await LikeCommentSharedArticle.update(
                { status: 1 },
                {
                    where: {
                        commentId: commentId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeCommentSharedArticle){
                return {
                    status: 200,
                    message: 'Hủy thích bình luận thành công',
                    data: updateLikeCommentSharedArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Hủy thích bình luận không thành công',
                    data: null
                };
            }
        }
        // Nếu status 1
        if(likeCommentSharedArticle.get({ plain: true }).status === '1'){
            return {
                status: 200,
                message: 'Đã hủy thích bình luận trước đó',
                data: likeCommentSharedArticle.get({ plain: true })
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện xóa bình luận
const deleteCommentService = async (commentId, authUserId) => {
    try {
        // Tìm bình luận theo commentId
        const commentSharedArticle = await CommentSharedArticle.findByPk(commentId);
        // Kiểm tra tồn tại bình luận không
        if(!commentSharedArticle){
            return {
                status: 404,
                message: 'Không tìm thấy bình luận',
                data: null
            };
        }
        // Kiểm tra quyền xóa bình luận
        if(commentSharedArticle.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa bình luận này',
                data: null
            }
        }

        // Xóa bình luận
        // Sẽ tự động xóa các bình luận con nếu đã thiết lập cascade trong quan hệ
        const deletedCommentSharedArticle = await commentSharedArticle.destroy(); 

        // Kết quả cuối
        return {
            status: 200,
            message: 'Xóa bình luận thành công',
            data: deletedCommentSharedArticle
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện cập nhật bình luận
const updateCommentService = async (commentId, authUserId, data) => {
    try {
        // Tìm bình luận theo commentId
        const commentSharedArticle = await CommentSharedArticle.findByPk(commentId);
        // Kiểm tra tồn tại bình luận không
        if(!commentSharedArticle){
            return {
                status: 404,
                message: 'Không tìm thấy bình luận',
                data: null
            };
        }
        // Kiểm tra quyền cập nhật bình luận
        if(commentSharedArticle.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền chỉnh sửa bình luận này',
                data: null
            }
        }

        // Cập nhật bình luận
        const updatedCommentSharedArticle = await commentSharedArticle.update(data);
        
        // Kết quả cuối
        return {
            status: 200,
            message: 'Chỉnh sửa bình luận thành công',
            data: updatedCommentSharedArticle
        };

    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

module.exports = {
    createCommentService,
    getCommentService,
    createLikeCommentService,
    unLikeCommentService,
    deleteCommentService,
    updateCommentService
}