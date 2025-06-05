const dotenv = require('dotenv');
dotenv.config();
const { User, Article, Photo, Video, LikeArticle, Comment, LikeComment } = require('../app/models/sequelize');
const e = require('express');

// Tạo bình luận
const createCommentService = async (articleId, userId, content, parentCommentId, respondedCommentId) => {
    try {
        // Tạo bình luận
        const comment = await Comment.create(
            {
                articleId: articleId,
                userId: userId,
                content: content,
                parentCommentId: parentCommentId ? parentCommentId : null,
                respondedCommentId: respondedCommentId ? respondedCommentId : null,
            }
        );
        // Kiểm tra
        if(comment){
            return comment;
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
        const comment = await Comment.findByPk(
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
        const plainComment = comment.get({ plain: true });
        // Tìm respondedComment tương ứng với respondedCommentId
        const respondedComment = await Comment.findByPk(
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
        // likeComment: type LikeComment Object
        // created: type boolean
        const [likeComment, created] = await LikeComment.findOrCreate(
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

        // Kiểm tra nếu có likeComment (đã có record tương ứng)
        // Nếu status 0
        if(likeComment.get({ plain: true }).status === '0'){
            return {
                status: 200,
                message: 'Đã thích bình luận trước đó',
                data: likeComment.get({ plain: true })
            };
        }
        // Nếu status 1
        if(likeComment.get({ plain: true }).status === '1'){
            // Cập nhật status thành 0 
            const updateLikeComment = await LikeComment.update(
                { status: 0 },
                {
                    where: {
                        commentId: commentId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeComment){
                return {
                    status: 200,
                    message: 'Thích bình luận thành công',
                    data: updateLikeComment
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
        const likeComment = await LikeComment.findOne(
            {
                where: {
                    commentId: commentId,
                    userId: userId
                },
            }
        );
        // Kiểm tra trường hợp likeComment null (Chưa có record tương ứng trong LikeComment)
        if(!likeComment){
            return {
                status: 200,
                message: 'Chưa thích bình luận này trước đó',
                data: likeComment
            };
        }

        // Kiểm tra nếu có likeComment (đã có record tương ứng)
        // Nếu status 0
        if(likeComment.get({ plain: true }).status === '0'){
            // Cập nhật status thành 1 
            const updateLikeComment = await LikeComment.update(
                { status: 1 },
                {
                    where: {
                        commentId: commentId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeComment){
                return {
                    status: 200,
                    message: 'Hủy thích bình luận thành công',
                    data: updateLikeComment
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
        if(likeComment.get({ plain: true }).status === '1'){
            return {
                status: 200,
                message: 'Đã hủy thích bình luận trước đó',
                data: likeComment.get({ plain: true })
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
        const comment = await Comment.findByPk(commentId);
        // Kiểm tra tồn tại bình luận không
        if(!comment){
            return {
                status: 404,
                message: 'Không tìm thấy bình luận',
                data: null
            };
        }
        // Kiểm tra quyền xóa bình luận
        if(comment.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa bình luận này',
                data: null
            }
        }

        // Xóa bình luận
        // Sẽ tự động xóa các bình luận con nếu đã thiết lập cascade trong quan hệ
        const deletedComment = await comment.destroy(); 

        // Kết quả cuối
        return {
            status: 200,
            message: 'Xóa bình luận thành công',
            data: deletedComment
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
        const comment = await Comment.findByPk(commentId);
        // Kiểm tra tồn tại bình luận không
        if(!comment){
            return {
                status: 404,
                message: 'Không tìm thấy bình luận',
                data: null
            };
        }
        // Kiểm tra quyền cập nhật bình luận
        if(comment.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền chỉnh sửa bình luận này',
                data: null
            }
        }

        // Cập nhật bình luận
        const updatedComment = await comment.update(data);
        
        // Kết quả cuối
        return {
            status: 200,
            message: 'Chỉnh sửa bình luận thành công',
            data: updatedComment
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