const dotenv = require("dotenv");
dotenv.config();

class ArticleController {

    // [POST] / (creat)
    
    // [GET] /  (read) Chi tiết bài viết
    index(req, res){
        // return res.status(200).json("Get bài viết");
        return res.send(`Get Bài viết`);
    }

    // [PUT] / (update)

    // [GET] / (delete)

}

module.exports = new ArticleController;