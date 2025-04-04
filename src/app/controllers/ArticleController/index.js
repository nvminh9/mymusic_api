const { createArticleService } = require("../../../services/articleService");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");

class ArticleController {

    // [POST] /article/create
    async createArticle(req, res){
        const result = {};
        const { textContent, privacy } = req.body;
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Kiểm tra file upload
            // Photo files
            console.log("photoFiles");
            console.log(req.files["photoFiles"]); // array
            let photos = [];
            if(req.files["photoFiles"]){
                for(let i = 0; i < req.files["photoFiles"].length; i++){
                    photos[i] = req.files["photoFiles"][i].filename;
                };
            } else {
                photos[0] = null;
            }
            // Video files
            console.log("videoFiles");
            console.log(req.files["videoFiles"]); // array
            let videos = [];
            if(req.files["videoFiles"]){
                for(let i = 0; i < req.files["videoFiles"].length; i++){
                    videos[i] = req.files["videoFiles"][i].filename;
                };
            } else {
                videos[0] = null;
            }

            // Dữ liệu bài viết
            let articleData = { textContent, privacy };
            articleData.userId = userId;
            // Dữ liệu hình ảnh của bài viết
            let articleImageData = [];
            if(photos[0] !== null){
                for(let i = 0; i < photos.length; i++){
                    articleImageData[i] = {
                        photoLink: `/image/${photos[i]}`
                    }
                }
            } else {
                articleImageData[0] = null;
            }
            // Dữ liệu video của bài viết
            let articleVideoData = [];
            if(videos[0] !== null){
                for(let i = 0; i < videos.length; i++){
                    articleVideoData[i] = {
                        videoLink: `/video/${videos[i]}`
                    }
                }
            } else {
                articleVideoData[0] = null;
            }

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

    // [GET] /  (read) Chi tiết bài viết
    index(req, res){
        // return res.status(200).json("Get bài viết");
        return res.send(`Get Bài viết`);
    };

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new ArticleController;