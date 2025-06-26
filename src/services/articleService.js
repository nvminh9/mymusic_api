const dotenv = require('dotenv');
dotenv.config();
const { User, Article, Photo, Video, LikeArticle, Comment, LikeComment, SharedArticle } = require('../app/models/sequelize');
const e = require('express');
const fs = require('fs').promises;
const path = require('path');

// Tạo mới một bài viết (CREATE)
// articleData là object chứa dữ liệu tạo bài viết
// articleImageData là array chứa các object có thuộc tính photoLink (chứa link của Hình, order)
// articleVideoData là array chứa các object có thuộc tính videoLink (chứa link của Video, order)
const createArticleService = async (articleData, articleImageData, articleVideoData) => {
    try {
        // Tạo bài viết (với textContent)
        const article = await Article.create(
            articleData
        );
        // Kiểm tra
        if(article){
            let articleResult = {};
            articleResult = {...article.dataValues};

            // Tạo photo cho bài viết (nếu có)
            if(articleImageData[0] !== null){
                let photos = [];
                for(let i = 0; i < articleImageData.length; i++){
                    // Kiểm tra
                    if(!articleImageData[i]){
                        continue;   
                    }
                    // Tạo trong DB
                    photos[i] = await Photo.create(
                        {
                            articleId: article.articleId,
                            photoLink: articleImageData[i].photoLink,
                            order: articleImageData[i].order,
                        }
                    );
                    // Nếu tạo trong DB có lỗi thì sẽ gán thành object rỗng
                    if(!photos[i]){
                        photos[i] = {};
                    };
                }
                // Kiểm tra
                if(photos.length > 0){
                    articleResult.photos = photos;
                } else {
                    articleResult.photos = null;
                }
            } else {
                articleResult.photos = null;
            }

            // Tạo video cho bài viết (nếu có)
            if(articleVideoData[0] !== null){
                let videos = [];
                for(let i = 0; i < articleVideoData.length; i++){
                    // Kiểm tra
                    if(!articleVideoData[i]){
                        continue;
                    }
                    // Tạo trong DB
                    videos[i] = await Video.create(
                        {
                            articleId: article.articleId,
                            videoLink: articleVideoData[i].videoLink,
                            order: articleVideoData[i].order,
                        }
                    );
                    // Nếu tạo trong DB có lỗi thì sẽ gán thành object rỗng
                    if(!videos[i]){
                        videos[i] = {};
                    };
                }
                // Kiểm tra
                if(videos.length > 0){
                    articleResult.videos = videos;
                } else {
                    articleResult.videos = null;
                }
            } else {
                articleResult.videos = null;
            }

            return articleResult;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy thông tin bài viết (Chi tiết bài viết, bao gồm data từ User, Article, Photo, Video) (READ)
const getArticleService = async (articleId, authUserId) => {
    try{
        // Tìm bài viết (công khai, phòng trường hợp biết được articleId thì người dùng có thể xem bài viết chỉ mình tôi)
        const article = await Article.findOne({
            where: {
                articleId: articleId,
            },
            include: [{ model: User, attributes: { exclude: ['password'] } }, { model: Photo}, { model: Video}]
        });
        // Kiểm tra
        if(article){
            // Kiểm tra các bài viết có privacy chỉ mình tôi (privacy 1)
            // Nếu privacy chỉ mình tôi và người truy cập ko phải auth user thì trả về null
            // console.log(article.userId);
            if(article.privacy + '' === '1' && authUserId !== article.userId){
                return {
                    status: 200,
                    message: 'Không tìm thấy bài viết',
                    data: null
                };
            }
            
            // THÊM CÁC BÌNH LUẬN VÀ LƯỢT THÍCH TƯƠNG ỨNG VÀO BÀI VIẾT
            // Dùng service getArticleCommentsService (Lấy các bình luận của bài viết đó, bao gồm data model từ Comment)
            // Theo cấu trúc cây (chứa các Object Comment, mỗi Object Comment có replies là mảng chứa Object Comment con (nếu có))
            const articleComments = await getArticleCommentsService(articleId, authUserId);
            // Dùng service getArticleLikesService (Lấy các lượt thích của bài viết đó, bao gồm data từ model LikeArticle)
            const articleLikes = await getArticleLikesService(articleId, authUserId);

            // Reformat data
            // mediaContent
            const photos = article.dataValues.Photos.map((photo) => ({...photo.dataValues, type: "photo"}));
            const videos = article.dataValues.Videos.map((video) => ({...video.dataValues, type: "video"}));
            const mediaContent = [
                ...photos,
                ...videos
            ];
            mediaContent.sort((a, b) => a.order - b.order);
            article.dataValues.mediaContent = mediaContent;
            delete article.dataValues.Photos;
            delete article.dataValues.Videos;
            // comments
            article.dataValues.comments = articleComments.comments;
            article.dataValues.commentCount = articleComments.commentCount;
            // likes
            article.dataValues.likes = articleLikes.likes;
            article.dataValues.likeCount = articleLikes.likeCount;
            article.dataValues.likeStatus = articleLikes.likeStatus;

            // Kết quả
            return {
                status: 200,
                message: 'Nội dung chi tiết của bài viết',
                data: article
            };
        } else {
            return {
                status: 200,
                message: 'Không tìm thấy bài viết',
                data: null
            };
        }
    }catch(error){
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
// Lấy các bình luận của bài viết (Bao gồm data từ User, Comment)
const getArticleCommentsService = async (articleId, authUserId) => {
    try {
        const result = {};

        // Lấy thông tin của bài viết (để kiểm privacy có cho phép người dùng này xem các bình luận không)
        const article = await Article.findOne({
            where: {
                articleId: articleId,
            }
        });

        // Kiểm tra các trường hợp sẽ trả về null
        // Nếu bài viết không tồn tại thì trả về null
        if(!article){
            return null;
        } else {
            // Nếu bài viết tồn tài nhưng người dùng không xem được do privacy là chỉ mình tôi thì cũng trả về null
            if(article.privacy + '' === '1' && authUserId !== article.userId){
                return null;
            }
        }

        // ** LẤY CÁC BÌNH LUẬN CỦA BÀI VIẾT (gồm data của User tạo bình luận) **
        const articleComments = await Comment.findAll({
            where: {
                articleId: articleId,
            },
            include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            // order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });

        // ** XÂY DỰNG MAP BÌNH LUẬN **
        // Tạo roots (type Map, chứa tất cả comment, cả cha và con)
        const roots = {};
        // Mỗi comment sẽ được thêm replies là {} để chứa các bình luận phản hồi
        articleComments.forEach((comment) => {
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
        const respondedComments = await Comment.findAll({
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
        const commentLikes = await LikeComment.findAll({
            where: {
                commentId: [...commentIds],
                status: 0
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            // order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });
        // Lấy lượt thích của authUser (likeStatus)
        const authUserLikes = await LikeComment.findAll({
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
        result.commentCount = articleComments.length;

        return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện thích bài viết
const createLikeArticleService = async (articleId, userId) => {
    try {        
        // Dùng findOrCreate để kiểm tra xem có record nào tương ứng không (articleId, userId)
        // likeArticle: type LikeArticle Object
        // created: type boolean
        const [likeArticle, created] = await LikeArticle.findOrCreate(
            {
                where: {
                    articleId: articleId,
                    userId: userId
                },
            }
        );

        // Kiểm tra trường hợp created true (vừa tạo record mới, status mặc định là 0)
        if(created){
            return {
                status: 200,
                message: 'Thích bài viết thành công',
                data: created
            };
        }

        // Kiểm tra nếu có likeArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeArticle.get({ plain: true }).status === '0'){
            return {
                status: 200,
                message: 'Đã thích bài viết trước đó',
                data: likeArticle.get({ plain: true })
            };
        }
        // Nếu status 1
        if(likeArticle.get({ plain: true }).status === '1'){
            // Cập nhật status thành 0 
            const updateLikeArticle = await LikeArticle.update(
                { status: 0 },
                {
                    where: {
                        articleId: articleId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeArticle){
                return {
                    status: 200,
                    message: 'Thích bài viết thành công',
                    data: updateLikeArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Thích bài viết không thành công',
                    data: null
                };
            }
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện hủy thích bài viết
const unLikeArticleService = async (articleId, userId) => {
    try {        
        // Tìm record tương ứng (articleId, userId)
        const likeArticle = await LikeArticle.findOne(
            {
                where: {
                    articleId: articleId,
                    userId: userId
                },
            }
        );
        // Kiểm tra trường hợp likeArticle null (Chưa có record tương ứng trong LikeArticle)
        if(!likeArticle){
            return {
                status: 200,
                message: 'Chưa thích bài viết này trước đó',
                data: likeArticle
            };
        }

        // Kiểm tra nếu có likeArticle (đã có record tương ứng)
        // Nếu status 0
        if(likeArticle.get({ plain: true }).status === '0'){
            // Cập nhật status thành 1 
            const updateLikeArticle = await LikeArticle.update(
                { status: 1 },
                {
                    where: {
                        articleId: articleId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeArticle){
                return {
                    status: 200,
                    message: 'Hủy thích bài viết thành công',
                    data: updateLikeArticle
                };
            } else {
                return {
                    status: 200,
                    message: 'Hủy thích bài viết không thành công',
                    data: null
                };
            }
        }
        // Nếu status 1
        if(likeArticle.get({ plain: true }).status === '1'){
            return {
                status: 200,
                message: 'Đã hủy thích bài viết trước đó',
                data: likeArticle.get({ plain: true })
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy các lượt thích của bài viết
const getArticleLikesService = async (articleId, authUserId) => {
    try {
        const result = {};

        // Lấy thông tin của bài viết (để kiểm privacy có cho phép người dùng này xem các lượt thích không)
        const article = await Article.findOne({
            where: {
                articleId: articleId,
            }
        });

        // Kiểm tra các trường hợp sẽ trả về null
        // Nếu bài viết không tồn tại thì trả về null
        if(!article){
            return null;
        } else {
            // Nếu bài viết tồn tài nhưng người dùng không xem được do privacy là chỉ mình tôi thì cũng trả về null
            if(article.privacy + '' === '1' && authUserId !== article.userId){
                return null;
            }
        }

        // Lấy CÁC LƯỢT THÍCH của bài viết
        const articleLikes = await LikeArticle.findAll({
            where: {
                articleId: articleId,
                status: 0
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            // order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });

        // Lấy lượt thích của authUser
        const authUserLike = await LikeArticle.findOne({
            where: {
                articleId: articleId,
                userId: authUserId,
                status: 0
            }
        });

        // Kiểm tra
        if(articleLikes){
            result.likes = articleLikes;
            result.likeCount = articleLikes.length;
            if(authUserLike){
                result.likeStatus = true;
            } else {
                result.likeStatus = false;
            }
            return result;
        } else {
            return null;
        }

        // // Xây dựng cây bình luận (chứa các bình luận, mỗi bình luận có thể chứa các bình luận khác)
        // const commentMap = {};
        // const roots = [];
        // // Tạo Comment Map (theo dạng commentId: comment Object)
        // // comment Object sẽ được thêm replies = [] để chứa các bình luận phản hồi (nếu có)
        // articleComments.forEach((comment) => {
        //     const plainComment = comment.get({ plain: true }); // Chuyển đổi thành object bình luận
        //     // Thêm replies
        //     plainComment.replies = [];
        //     // Thêm vào commentMap (dạng commentId => comment)
        //     commentMap[plainComment.commentId] = plainComment;
        // });
        // // Thêm các comment con vào comment cha của nó (nếu có)
        // Object.values(commentMap).forEach((comment) => {
        //     // Kiểm tra xem comment này có comment cha không (check if this comment has parent)
        //     if(comment.parentCommentId !== null){
        //         // Parent Comment Object
        //         const parentComment = commentMap[comment.parentCommentId];
        //         // Kiểm tra
        //         if(parentComment){
        //             parentComment.replies.push(comment);
        //         }
        //     } else {
        //         roots.push(comment);
        //     }
        // });

        // // Sắp xếp roots theo thời gian mới nhất trước (giảm dần theo createdAt)
        // // roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // // Thêm các respondedComment tương ứng với respondedCommentId của mỗi bình luận
        // const respondedIds = new Set(); // Set chứa các respondedCommentId
        // const respondedMap = {};
        // // Lấy ra các respondedCommentId    
        // collectRespondedIds(roots, respondedIds);
        // // Truy vấn các bình luận với id trong respondedIds
        // const respondedComments = await Comment.findAll({
        //     where: {
        //         commentId: [...respondedIds]
        //     },
        //     attributes: { exclude: ['userId', 'content', 'createdAt', 'updatedAt'] },
        //     include: [
        //         {
        //             model: User,
        //             attributes: ['userId', 'name', 'userName', 'userAvatar']
        //         }
        //     ]
        // });
        // // Tạo respondedMap (dạng respondedCommentId => respondedComment)
        // respondedComments.forEach((comment) => {
        //     respondedMap[comment.commentId] = comment;
        // });
        // // Gán respondedComment vào các comment trong roots
        // attachRespondedComments(roots, respondedMap);

        // result.comments = roots;
        // result.commentCount = articleComments.length;

        // return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện lấy các lượt thích của bài viết (Bao gồm data từ User, LikeArticle)

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
const deleteArticleService = async (articleId, authUserId) => {
    try {
        const result = {};

        // Tìm bài viết theo articleId
        const article = await Article.findOne({
            where: {
                articleId: articleId,
            },
            include: [User, Photo, Video]
        });

        // Kiểm tra tồn tại bài viết không
        if(!article){
            return {
                status: 404,
                message: 'Không tìm thấy bài viết',
                data: null
            };
        }
        // Kiểm tra quyền xóa bài viết
        if(article.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa bài viết này',
                data: null
            }
        }

        // Xóa bài viết
        // Sẽ tự động xóa các dữ liệu có quan hệ (Comment, LikeArticle, Video, Photo)
        // const deletedArticle = await article.destroy({ paranoid: true }); 
        const deletedArticle = await article.destroy(); 

        // Xóa file media của bài viết đã lưu trong assets
        // mediaContent (các hình, video của bài viết)
        const photos = article.dataValues.Photos.map((photo) => ({...photo.dataValues, type: "photo"}));
        const videos = article.dataValues.Videos.map((video) => ({...video.dataValues, type: "video"}));
        const mediaContent = [
            ...photos,
            ...videos
        ];
        mediaContent.sort((a, b) => a.order - b.order);
        // Thực hiện xóa các file media trong array mediaContent
        for(let i = 0; i < mediaContent.length; i++){
            if(mediaContent[i].type === "photo"){
                // Nếu là file hình
                deleteFile(`../assets${mediaContent[i].photoLink}`);
            } else if(mediaContent[i].type === "video") {
                // Nếu là file video
                deleteFile(`../assets${mediaContent[i].videoLink}`);
            }
        }

        // Kết quả cuối
        return {
            status: 200,
            message: 'Xóa bài viết thành công',
            data: deletedArticle
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy ra số bài viết của người dùng (theo userId)
const getUserArticleTotal = async (userName, authUserId) => {
    const result = {};
    try {
        // Tìm user với userName
        const user = await User.findOne({
            where: {
                userName: userName
            },
            attributes: { exclude: ['password'] }
        });
        // Kiểm tra user
        const userId = user.userId;
        let privacy = []; // quyền riêng tư của bài viết
        if(authUserId === userId){
            privacy = [0,1]; // nếu là auth user thì xem được cả công khai và chỉ mình tôi
        } else {
            privacy = [0]; // nếu không phải auth user thì chỉ xem được công khai
        }

        // Tìm các BÀI VIẾT của user (theo userId)
        // Dùng findAndCountAll sẽ bị lỗi ở thuộc tính count trả về, do count sẽ đếm cả các include
        const articles = await Article.findAll({
            where: {
                userId: userId,
                privacy: privacy,
            },
            order: [["createdAt","DESC"]],
        });

        // Tìm các BÀI CHIA SẺ của user (theo userId)
        const sharedArticles = await SharedArticle.findAll({
            where: {
                userId: userId,
                privacy: privacy,
            },
            order: [["createdAt","DESC"]],
        });

        // Mảng articleIds lưu id, loại, createdAt của mỗi bài viết
        const articleIds = [];
        articles.map((article) => {
            articleIds.push(
                {
                    articleId: article.dataValues.articleId,
                    articleType: 'article',
                    createdAt: article.dataValues.createdAt,
                }
            );
        });
        sharedArticles.map((sharedArticle) => {
            articleIds.push(
                {
                    sharedArticleId: sharedArticle.dataValues.sharedArticleId,
                    articleType: 'sharedArticle',
                    createdAt: sharedArticle.dataValues.createdAt,
                }
            );
        });

        // Sắp xếp lại array articleIds theo createdAt mới nhất
        // roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        articleIds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // articleArray lưu data của các article lấy được
        const articleArray = await Promise.all(
            articleIds.map(async (articleData) => {
                if(articleData.articleType === 'article'){
                    const article = await getArticleService(articleData.articleId, authUserId);
                    return article ? article.data.dataValues : null;
                } else if (articleData.articleType === 'sharedArticle') {
                    const sharedArticle = await getSharedArticleService(articleData.sharedArticleId, authUserId);
                    return sharedArticle ? sharedArticle.data.dataValues : null;
                }
            })
        );        

        // Kết quả
        result.articles = articleArray.filter(Boolean);
        result.user = user;
        return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện chia sẻ bài viết
const shareArticleService = async (articleData) => {
    try {
        // Tìm xem người dùng đã chia sẻ bài viết này trước đó chưa
        const sharedArticle = await SharedArticle.findOne(
            {
                where: {
                    userId: articleData?.userId,
                    articleId: articleData?.articleId,
                },
            }
        );

        // Nếu đã chia sẻ trước đó rồi
        if(sharedArticle){
            return {
                status: 200,
                message: 'Đã chia sẻ bài viết trước đó',
                data: sharedArticle
            };
        }

        // Tạo bài chia sẻ
        const createSharedArticle = await SharedArticle.create(
            articleData
        );

        // Kiểm tra
        // Nếu tạo record chia sẻ thành công
        if(createSharedArticle){
            return {
                status: 200,
                message: 'Chia sẻ bài viết thành công',
                data: createSharedArticle
            };
        } else {
            return {
                status: 200,
                message: 'Chia sẻ bài viết không thành công',
                data: null
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

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

module.exports = {
    createArticleService,
    getArticleService,
    getUserArticleTotal,
    getArticleCommentsService,
    createLikeArticleService,
    unLikeArticleService,
    getArticleLikesService,
    deleteArticleService,
    shareArticleService,
    getSharedArticleService
}