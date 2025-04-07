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
            
            // Dữ liệu bài viết
            let articleData = { textContent, privacy };
            articleData.userId = userId;
            // Dữ liệu files hình ảnh và video
            // Kiểm tra file upload
            // Media Files (array object chứa cả image và video)
            let articleImageData = [];
            let articleVideoData = [];
            if(req.files["mediaFiles"]){
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

    // [GET] /  (read) Chi tiết bài viết
    index(req, res){
        // return res.status(200).json("Get bài viết");
        return res.send(`Get Bài viết`);
    };

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new ArticleController;