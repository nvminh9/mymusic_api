const { createArticleService, getArticleService, getArticleComments, getArticleCommentsService, createLikeArticleService, unLikeArticleService, getArticleLikesService, deleteArticleService, shareArticleService, getSharedArticleService } = require("../../../services/articleService");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { getEmbedding } = require("../../ML/embedder");

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
            const authUserName = decoded.userName;
            
            // Dữ liệu bài viết
            const articleEmbedding = await getEmbedding(`${textContent || ""}${authUserName || ""}`);
            let articleData = { textContent, privacy, embedding: `[${articleEmbedding.join(',')}]` };
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

            // Kiểm tra
            if(article === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = article?.status ? article?.status : 200;
            result.message = article?.message ? article?.message : 'No messages';
            result.data = article?.data ? article?.data : null;
            return res.status(article?.status ? article?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [DELETE] /:articleId (Xóa bài viết)
    async deleteArticle(req, res){
        try {
            const result = {};
            const { articleId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa bài viết
            const deletedArticle = await deleteArticleService(articleId, userId);
            // Kiểm tra
            if(deletedArticle === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedArticle?.status ? deletedArticle?.status : 200;
            result.message = deletedArticle?.message ? deletedArticle?.message : 'No messages';
            result.data = deletedArticle?.data ? deletedArticle?.data : null;
            return res.status(deletedArticle?.status ? deletedArticle?.status : 200).json(result); 
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

    // [POST] /:articleId/share (Chia sẻ bài viết)
    async shareArticle(req, res) {
        try {
            const result = {};
            const { articleId } = req.params;
            const { sharedTextContent, privacy } = req.body;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            const authUserName = decoded.userName;

            // Tạo embedding
            const sharedArticleEmbedding = await getEmbedding(`${sharedTextContent || ""}${authUserName || ""}`);
            // Service chia sẻ bài viết
            const articleData = { userId, articleId, sharedTextContent, privacy, embedding: `[${sharedArticleEmbedding.join(',')}]` };
            const sharedArticle = await shareArticleService(articleData);

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

    // [GET] /shared/:sharedArticleId (Chi tiết bài chia sẻ)
    async getSharedArticle(req, res) {
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

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new ArticleController;