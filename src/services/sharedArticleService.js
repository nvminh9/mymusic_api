const dotenv = require('dotenv');
dotenv.config();
const { User, SharedArticle, LikeSharedArticle, CommentSharedArticle, LikeCommentSharedArticle } = require('../app/models/sequelize');
const e = require('express');
const fs = require('fs').promises;
const path = require('path');
const { getArticleService } = require('./articleService');

// Thực hiện lấy thông tin bài chia sẻ 
const getSharedArticleService = async (sharedArticleId, authUserId) => {
    try {
        // Tìm bài chia sẻ
        const sharedArticle = await SharedArticle.findOne({
            where: {
                sharedArticleId: sharedArticleId,
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }, { model: Photo}, { model: Video}]
            include: [{ model: User, attributes: { exclude: ['password'] } }]
        });

        // Kiểm tra
        if(sharedArticle){
            // Kiểm tra các bài viết có privacy chỉ mình tôi (privacy 1)
            // Nếu privacy chỉ mình tôi và người truy cập ko phải auth user thì trả về null
            if(sharedArticle.privacy + '' === '1' && authUserId !== sharedArticle.userId){
                return {
                    status: 200,
                    message: 'Không tìm thấy bài chia sẻ',
                    data: null
                };
            }

            // Lấy dữ liệu của bài viết được chia sẻ
            const article = await getArticleService(sharedArticle.articleId, authUserId);
            // Kiểm tra article
            if(article === null){
                sharedArticle.dataValues.Article = null;
            } else {
                sharedArticle.dataValues.Article = article?.data ? article?.data : null;
            }

            // Lấy dữ liệu các lượt thích của bài chia sẻ (likes)
            const sharedArticleLikes = await getSharedArticleLikesService(sharedArticle.sharedArticleId, authUserId);
            // Thêm vào dataValues
            sharedArticle.dataValues.likes = sharedArticleLikes.likes;
            sharedArticle.dataValues.likeCount = sharedArticleLikes.likeCount;
            sharedArticle.dataValues.likeStatus = sharedArticleLikes.likeStatus;

            // Lấy dữ liệu các bình luận của bài chia sẻ (comments)
            const sharedArticleComments = await getSharedArticleCommentsService(sharedArticle.sharedArticleId, authUserId);
            // Thêm vào dataValues
            sharedArticle.dataValues.comments = sharedArticleComments.comments;
            sharedArticle.dataValues.commentCount = sharedArticleComments.commentCount;

            // Kết quả
            return {
                status: 200,
                message: 'Nội dung bài chia sẻ',
                data: sharedArticle
            };
        } else {
            // Nếu không tìm thấy bài chia sẻ
            return {
                status: 200,
                message: 'Không tìm thấy bài chia sẻ',
                data: sharedArticle
            };
        }

    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Hàm thực hiện xóa file media
const deleteFile = async (fileRelativePath) => {
  try {
    const filePath = path.join(__dirname, fileRelativePath);
    await fs.unlink(filePath);
    // if (fs.existsSync(filePath)) {
    //     fs.unlinkSync(filePath);
    // }
  } catch (err) {
    console.error('Xoá file thất bại:', err);
  }
};
// Thực hiện xóa bài viết
const deleteSharedArticleService = async (sharedArticleId, authUserId) => {
    try {
        const result = {};

        // Tìm bài chia sẻ theo sharedArticleId
        const sharedArticle = await SharedArticle.findOne({
            where: {
                sharedArticleId: sharedArticleId,
            },
        });

        // Kiểm tra tồn tại bài chia sẻ không
        if(!sharedArticle){
            return {
                status: 404,
                message: 'Không tìm thấy bài chia sẻ',
                data: null
            };
        }
        // Kiểm tra quyền xóa bài chia sẻ
        if(sharedArticle.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa bài chia sẻ này',
                data: null
            }
        }

        // Xóa bài chia sẻ
        // Sẽ tự động xóa các dữ liệu có quan hệ (CommentSharedArticle, LikeSharedArticle)
        // const deletedSharedArticle = await sharedArticle.destroy({ paranoid: true }); 
        const deletedSharedArticle = await sharedArticle.destroy(); 

        // Xóa file media của bài viết đã lưu trong assets
        // mediaContent (các hình, video của bài viết)
        // const photos = article.dataValues.Photos.map((photo) => ({...photo.dataValues, type: "photo"}));
        // const videos = article.dataValues.Videos.map((video) => ({...video.dataValues, type: "video"}));
        // const mediaContent = [
        //     ...photos,
        //     ...videos
        // ];
        // mediaContent.sort((a, b) => a.order - b.order);
        // // Thực hiện xóa các file media trong array mediaContent
        // for(let i = 0; i < mediaContent.length; i++){
        //     if(mediaContent[i].type === "photo"){
        //         // Nếu là file hình
        //         deleteFile(`../assets${mediaContent[i].photoLink}`);
        //     } else if(mediaContent[i].type === "video") {
        //         // Nếu là file video
        //         deleteFile(`../assets${mediaContent[i].videoLink}`);
        //     }
        // }

        // Kết quả cuối
        return {
            status: 200,
            message: 'Xóa bài chia sẻ thành công',
            data: deletedSharedArticle
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện thích bài chia sẻ
const createLikeSharedArticleService = async (sharedArticleId, userId) => {
    try {        
        // Dùng findOrCreate để kiểm tra xem có record nào tương ứng không (sharedArticleId, userId)
        // sharedArticleId: type LikeSharedArticle Object
        // created: type boolean
        const [likeSharedArticle, created] = await LikeSharedArticle.findOrCreate(
            {
                where: {
                    sharedArticleId: sharedArticleId,
                    userId: userId
                },
            }
        );

        // Kiểm tra trường hợp created true (vừa tạo record mới, status mặc định là 0)
        if(created){
            return {
                status: 200,
                message: 'Thích bài chia sẻ thành công',
                data: created
            };
        }

        // Kiểm tra nếu có likeSharedArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeSharedArticle.get({ plain: true }).status === '0'){
            return {
                status: 200,
                message: 'Đã thích bài chia sẻ trước đó',
                data: likeSharedArticle.get({ plain: true })
            };
        }
        // Nếu status 1
        if(likeSharedArticle.get({ plain: true }).status === '1'){
            // Cập nhật status thành 0 
            const updateLikeSharedArticle = await LikeSharedArticle.update(
                { status: 0 },
                {
                    where: {
                        sharedArticleId: sharedArticleId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeSharedArticle){
                return {
                    status: 200,
                    message: 'Thích bài chia sẻ thành công',
                    data: updateLikeSharedArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Thích bài chia sẻ không thành công',
                    data: null
                };
            }
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện hủy thích bài chia sẻ
const unLikeSharedArticleService = async (sharedArticleId, userId) => {
    try {        
        // Tìm record tương ứng (sharedArticleId, userId)
        const likeSharedArticle = await LikeSharedArticle.findOne(
            {
                where: {
                    sharedArticleId: sharedArticleId,
                    userId: userId
                },
            }
        );
        // Kiểm tra trường hợp likeArticle null (Chưa có record tương ứng trong LikeArticle)
        if(!likeSharedArticle){
            return {
                status: 200,
                message: 'Chưa thích bài chia sẻ này trước đó',
                data: likeSharedArticle
            };
        }

        // Kiểm tra nếu có likeSharedArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeSharedArticle.get({ plain: true }).status === '0'){
            // Cập nhật status thành 1 
            const updateLikeSharedArticle = await LikeSharedArticle.update(
                { status: 1 },
                {
                    where: {
                        sharedArticleId: sharedArticleId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeSharedArticle){
                return {
                    status: 200,
                    message: 'Hủy thích bài chia sẻ thành công',
                    data: updateLikeSharedArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Hủy thích bài chia sẻ không thành công',
                    data: null
                };
            }
        }
        // Nếu status 1
        if(likeSharedArticle.get({ plain: true }).status === '1'){
            return {
                status: 200,
                message: 'Đã hủy thích bài chia sẻ trước đó',
                data: likeSharedArticle.get({ plain: true })
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy các lượt thích của bài chia sẻ
const getSharedArticleLikesService = async (sharedArticleId, authUserId) => {
    try {
        const result = {};

        // Lấy thông tin của bài chia sẻ (để kiểm privacy có cho phép người dùng này xem các lượt thích không)
        const sharedArticle = await SharedArticle.findOne({
            where: {
                sharedArticleId: sharedArticleId,
            }
        });

        // Kiểm tra các trường hợp sẽ trả về null
        // Nếu bài chia sẻ không tồn tại thì trả về null
        if(!sharedArticle){
            return null;
        } else {
            // Nếu bài chia sẻ tồn tài nhưng người dùng không xem được do privacy là chỉ mình tôi thì cũng trả về null
            if(sharedArticle.privacy + '' === '1' && authUserId !== sharedArticle.userId){
                return null;
            }
        }

        // Lấy CÁC LƯỢT THÍCH của bài chia sẻ
        const sharedArticleLikes = await LikeSharedArticle.findAll({
            where: {
                sharedArticleId: sharedArticleId,
                status: 0
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            // order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });

        // Lấy lượt thích của authUser
        const authUserLike = await LikeSharedArticle.findOne({
            where: {
                sharedArticleId: sharedArticleId,
                userId: authUserId,
                status: 0
            }
        });

        // Kiểm tra
        if(sharedArticleLikes){
            result.likes = sharedArticleLikes;
            result.likeCount = sharedArticleLikes.length;
            if(authUserLike){
                result.likeStatus = true;
            } else {
                result.likeStatus = false;
            }
            return result;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Hàm chuyển các comment con vào replies của comment cha tương ứng
// return Map chứa comment trong mỗi comment có replies cũng là Map
function attachChildComments(roots) {
    let commentMap = {};
    //
    Object.values(roots).forEach((comment) => {
        // Kiểm tra xem comment này có comment cha không (check if this comment has parent)
        if(comment.parentCommentId !== null){
            // Parent Comment Object
            const parentComment = roots[comment.parentCommentId];
            // Kiểm tra
            if(parentComment){
                // repliesMap[comment.commentId] = comment;
                parentComment.replies[comment.commentId] = comment;
            }
        } else {
            commentMap[comment.commentId] = comment;
        }
    });
    //
    return commentMap;
};
// Hàm thu thập các commentId (đệ quy) 
// (dùng trong hàm getArticleCommentsService cho phần Lượt thích của bình luận)
function collectCommentIds(comments, commentIds) {
    Object.values(comments).forEach(comment => {
        if (comment.commentId) {
            commentIds.add(comment.commentId);
        }
        if (comment.replies && Object.keys(comment.replies).length > 0) {
            collectCommentIds(comment.replies, commentIds);
        }
    });
}
// Hàm gán likeComment tương ứng với commentId vào các bình luận trong roots (đệ quy) 
// (dùng trong hàm getArticleCommentsService cho phần lượt thích của bình luận)
function attachLikeComments(roots, likeCommentMap, authUserLikeCommentMap) {
    Object.values(roots).forEach((comment) => {
        comment.likes = likeCommentMap[comment.commentId] || {};
        comment.likeCount = likeCommentMap[comment.commentId] ? Object.keys(likeCommentMap[comment.commentId]).length : 0;
        comment.likeStatus = authUserLikeCommentMap[comment.commentId] ? true : false;
        if(comment.replies && Object.keys(comment.replies).length > 0){
            comment.replies = attachLikeComments(comment.replies, likeCommentMap, authUserLikeCommentMap);
        }
        return comment;
    });
}
// Hàm thu thập các respondedCommentId (đệ quy) (dùng trong hàm getArticleCommentsService)
function collectRespondedIds(comments, respondedIds) {
    Object.values(comments).forEach(comment => {
        if (comment.respondedCommentId) {
            respondedIds.add(comment.respondedCommentId);
        }
        if (comment.replies && Object.keys(comment.replies).length > 0) {
            collectRespondedIds(comment.replies, respondedIds);
        }
    });
}
// Hàm gán respondedComment tương ứng với respondedCommentId vào các bình luận trong roots (đệ quy) (dùng trong hàm getArticleCommentsService)
function attachRespondedComments(roots, respondedMap) {
    Object.values(roots).forEach((comment) => {
        // check respondedCommentId
        if(comment.respondedCommentId){
            comment.respondedComment = respondedMap[comment.respondedCommentId] || null;
        }
        if(comment.replies && Object.keys(comment.replies).length > 0){
            comment.replies = attachRespondedComments(comment.replies, respondedMap)
        }
        return comment;
    });
}
// Lấy các bình luận của bài chia sẻ (Bao gồm data từ User, CommentSharedArticle)
const getSharedArticleCommentsService = async (sharedArticleId, authUserId) => {
    try {
        const result = {};

        // Lấy thông tin của bài chia sẻ (để kiểm privacy có cho phép người dùng này xem các bình luận không)
        const sharedArticle = await SharedArticle.findOne({
            where: {
                sharedArticleId: sharedArticleId,
            }
        });

        // Kiểm tra các trường hợp sẽ trả về null
        // Nếu bài chia sẻ không tồn tại thì trả về null
        if(!sharedArticle){
            return null;
        } else {
            // Nếu bài chia sẻ tồn tài nhưng người dùng không xem được do privacy là chỉ mình tôi thì cũng trả về null
            if(sharedArticle.privacy + '' === '1' && authUserId !== sharedArticle.userId){
                return null;
            }
        }

        // ** LẤY CÁC BÌNH LUẬN CỦA BÀI CHIA SẺ (gồm data của User tạo bình luận) **
        const sharedArticleComments = await CommentSharedArticle.findAll({
            where: {
                sharedArticleId: sharedArticleId,
            },
            include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            // order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });

        // ** XÂY DỰNG MAP BÌNH LUẬN **
        // Tạo roots (type Map, chứa tất cả comment, cả cha và con)
        const roots = {};
        // Mỗi comment sẽ được thêm replies là {} để chứa các bình luận phản hồi
        sharedArticleComments.forEach((comment) => {
            const plainComment = comment.get({ plain: true }); // Chuyển đổi thành object bình luận
            // Thêm replies
            plainComment.replies = {};
            // Thêm vào roots map (dạng commentId => comment)
            roots[plainComment.commentId] = plainComment;
        });

        // ** PHẦN XỬ LÝ LẤY THÔNG TIN CỦA BÌNH LUẬN ĐƯỢC TRẢ LỜI (respondedComment) **
        // Thêm respondedComment tương ứng với respondedCommentId của mỗi bình luận
        const respondedIds = new Set(); // Set chứa các respondedCommentId
        const respondedMap = {};
        // Lấy ra các respondedCommentId    
        collectRespondedIds(roots, respondedIds);
        // Truy vấn các bình luận với id trong respondedIds
        const respondedComments = await CommentSharedArticle.findAll({
            where: {
                commentId: [...respondedIds]
            },
            attributes: { exclude: ['userId', 'content', 'createdAt', 'updatedAt'] },
            include: [
                {
                    model: User,
                    attributes: ['userId', 'name', 'userName', 'userAvatar']
                }
            ]
        });
        // Tạo respondedMap (dạng respondedCommentId => respondedComment)
        respondedComments.forEach((comment) => {
            respondedMap[comment.commentId] = comment;
        });
        // Gán respondedComment vào các comment trong roots
        attachRespondedComments(roots, respondedMap);

        // ** PHẦN XỬ LÝ LẤY THÔNG TIN LƯỢT THÍCH CỦA BÌNH LUẬN (likes, likeCount, likeStatus) **
        const commentIds = new Set(); // Set chứa các commentId
        const likeCommentMap = {}; // Map chứa các LikeComment của một Comment
        const authUserLikeCommentMap = {}; // Map chứa các LikeComment của authUser
        // Lấy ra các commentId trong roots
        collectCommentIds(roots, commentIds);
        // Lấy CÁC LƯỢT THÍCH của bình luận (likes and likeCount)
        const commentLikes = await LikeCommentSharedArticle.findAll({
            where: {
                commentId: [...commentIds],
                status: 0
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            // order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });
        // Lấy lượt thích của authUser (likeStatus)
        const authUserLikes = await LikeCommentSharedArticle.findAll({
            where: {
                commentId: [...commentIds],
                userId: authUserId,
                status: 0
            }
        });
        // Khởi tạo likeCommentMap (dạng commentId -> Map LikeComment)
        commentLikes.forEach((commentLike) => {
            let likesMap = {};
            //
            if(!likeCommentMap[commentLike.commentId]){
                likesMap[commentLike.likeCommentId] = commentLike;
                likeCommentMap[commentLike.commentId] = likesMap;
            } else {
                likesMap[commentLike.likeCommentId] = commentLike;
                likeCommentMap[commentLike.commentId] = {...likeCommentMap[commentLike.commentId], ...likesMap};
            }
        });
        // Khởi tạo authUserLikeCommentMap (dạng commentId -> LikeComment)
        authUserLikes.forEach((authUserLike) => {
            authUserLikeCommentMap[authUserLike.commentId] = authUserLike;
        });
        // Gán likes, likeCount, likeStatus vào các comment trong roots
        attachLikeComments(roots, likeCommentMap, authUserLikeCommentMap);

        // Chuyển các comment con vào replies của comment cha tương ứng
        const commentMap = attachChildComments(roots);

        // Sắp xếp roots theo thời gian mới nhất trước (giảm dần theo createdAt)
        // roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Kết quả
        result.comments = commentMap;
        result.commentCount = sharedArticleComments.length;

        return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    getSharedArticleService,
    createLikeSharedArticleService,
    unLikeSharedArticleService,
    getSharedArticleLikesService,
    getSharedArticleCommentsService,
    deleteSharedArticleService
}