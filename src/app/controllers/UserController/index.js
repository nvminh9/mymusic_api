const { getUserArticleTotal } = require("../../../services/articleService");
const { getUserService, getUserFollowerTotal, getUserFollowTotal } = require("../../../services/userService");

class UserController{

    // Lấy ra user theo email
    // [GET] /user
    async index(req, res){
        const { email } = req.body;
        const data = await getUserService(email);
        return res.status(200).json(data);
    };

    // ...

    // Lấy ra profile của user
    // [GET] /user/profile/:userId
    async getUserProfile(req, res){
        const { userId } = req.params;
        const result = {};
        // Số lượng người theo dõi
        const follower = await getUserFollowerTotal(userId);
        // Số lượng đang theo dõi
        const follow = await getUserFollowTotal(userId);
        // Số lượng bài viết
        const articles = await getUserArticleTotal(userId);
        if(follower && follow && articles){
            result.status = 200;
            result.message = "Thông tin profile";
            result.data = {
                follower: follower,
                follow: follow,
                articles: articles
            }
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy thông tin profile";
            result.data = null;
            return res.status(200).json(result);
        }
    }

    // Lấy ra danh sách bài viết của user
    // [GET] /user/:userId/articles
    async getUserArticles(req, res){
        const { userId } = req.params;
        const result = {};
        // Số lượng bài viết
        const articles = await getUserArticleTotal(userId);
        if(articles){
            result.status = 200;
            result.message = "Danh sách bài viết của người dùng";
            result.data = {
                articles: articles
            }
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy danh sách bài viết của người dùng";
            result.data = null;
            return res.status(200).json(result);
        }
    }
}

module.exports = new UserController;