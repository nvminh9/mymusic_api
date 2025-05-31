const { createArticleService, getArticleService, getArticleComments, getArticleCommentsService, createLikeArticleService, unLikeArticleService, getArticleLikesService } = require("../../../services/articleService");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");

class ArticleController {

    // [POST] /article/create (Tạo bài viết)
    async createArticle(req, res){
        const result = {};
        const { textContent, privacy } = req.body;
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dữ liệu bài viết
            let articleData = { textContent, privacy };
            articleData.userId = userId;
            // Dữ liệu files hình ảnh và video
            // Kiểm tra file upload
            // Media Files (array object chứa cả image và video)
            let articleImageData = [];
            let articleVideoData = [];
            if(req.files["mediaFiles"]){
                // console.log(req.files["mediaFiles"]);
                for(let i = 0; i < req.files["mediaFiles"].length; i++){
                    const file = req.files["mediaFiles"][i];
                    const isImage = file.mimetype.startsWith("image/");
                    if(isImage){
                        articleImageData[i] = {
                            photoLink: `/image/${file.filename}`,
                            order: i
                        };
                    } else {
                        articleVideoData[i] = {
                            videoLink: `/video/${file.filename}`,
                            order: i
                        };
                    }  
                }
            } else {
                console.log(req.files["mediaFiles"]);
                articleImageData[0] = null;
                articleVideoData[0] = null;
            }

            // console.log("articleImageData")
            // console.log(articleImageData);
            // console.log(articleImageData[0]);

            // console.log("articleVideoData")
            // console.log(articleVideoData);

            // Dùng Service Create Article
            const article = await createArticleService(articleData, articleImageData, articleVideoData);

            // Kiểm tra
            if(article){
                result.status = 200;
                result.message = "Tạo bài viết thành công";
                result.data = article;
                return res.status(200).json(result); 
            } else {
                result.status = 200;
                result.message = "Tạo bài viết không thành công";
                result.data = null;
                return res.status(200).json(result);
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [GET] /:articleId (Chi tiết bài viết)
    async index(req, res){
        const result = {};
        const { articleId } = req.params;

        // Token
        const token = req.headers.authorization.split(' ')[1];
        // Lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        try {
            // Dùng service getArticle (Lấy nội dung của bài viết bao gồm data từ model Article, Photo, Video)
            const article = await getArticleService(articleId, userId);
            // Dùng service getArticleCommentsService (Lấy các bình luận của bài viết đó, bao gồm data model từ Comment)
            // Theo cấu trúc cây (chứa các Object Comment, mỗi Object Comment có replies là mảng chứa Object Comment con (nếu có))
            const articleComments = await getArticleCommentsService(articleId, userId);
            // Dùng service getArticleLikesService (Lấy các lượt thích của bài viết đó, bao gồm data từ model LikeArticle)
            // ...
            const articleLikes = await getArticleLikesService(articleId, userId);

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
            // ...
            article.dataValues.likes = articleLikes.likes;
            article.dataValues.likeCount = articleLikes.likeCount;
            article.dataValues.likeStatus = articleLikes.likeStatus;

            // Kiểm tra
            if(article){
                result.status = '200';
                result.message = 'Dữ liệu của bài viết';
                result.data = article;
                return res.status(200).json(result);
            } else {
                result.status = '200';
                result.message = 'Không tìm thấy bài viết';
                result.data = null;
                return res.status(200).json(result);
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [POST] /:articleId/like (Thích bài viết)
    async createLikeArticle(req, res){
        const result = {};
        const { articleId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeArticleServic để tạo lượt thích
            const likeArticle = await createLikeArticleService(articleId, userId);
            // Kiểm tra (nếu likeArticle là null, có lỗi ở Service)
            if(likeArticle === null){
                // console.log(likeArticle);
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu likeArticle khác null, có data)
            result.status = likeArticle?.status ? likeArticle?.status : 200;
            result.message = likeArticle?.message ? likeArticle?.message : '';
            result.data = likeArticle?.data ? likeArticle?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /:articleId/unlike (Hủy thích bài viết)
    async unLikeArticle(req, res){
        const result = {};
        const { articleId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeArticleServic để tạo lượt thích
            const unlikeArticle = await unLikeArticleService(articleId, userId);
            // Kiểm tra (nếu likeArticle là null, có lỗi ở Service)
            if(unlikeArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu unlikeArticle khác null, có data)
            result.status = unlikeArticle?.status ? unlikeArticle?.status : 200;
            result.message = unlikeArticle?.message ? unlikeArticle?.message : '';
            result.data = unlikeArticle?.data ? unlikeArticle?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new ArticleController;