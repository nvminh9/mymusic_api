const { getUserArticleTotal } = require("../../../services/articleService");
const { getUserSongs } = require("../../../services/musicService");
const { getUserService, getUserFollowerTotalService, getUserFollowTotalService, updateUserService } = require("../../../services/userService");

class UserController{

    // Lấy ra user theo email
    // [GET] /user
    async index(req, res){
        const { email } = req.body;
        const data = await getUserService(email);
        return res.status(200).json(data);
    };

    // Tạo user mới 
    // [POST] /user
    // ...

    // Cập nhật thông tin user
    // [PUT] /user/profile/:userName
    async updateUserInfo(req, res){
        const { userName } = req.params;
        const { description, gender } = req.body;
        const result = {};
        // Kiểm tra file upload
        let userAvatar = req.files["userAvatar"] ? req.files["userAvatar"][0].filename : null;
        // Tạo object lưu các giá trị để update thông tin user
        let updateData = { description, gender };
        if (userAvatar) updateData.userAvatar = `/image/${userAvatar}`;
        // Thực hiện cập nhật thông tin user
        const updatedUser = await updateUserService(userName, updateData); // Cập nhật thông tin người dùng (description, gender)
        // Kiểm tra cập nhật thông tin
        if(updatedUser !== null){
            result.status = 200;
            result.message = "Cập nhật thông tin người dùng thành công";
            result.data = {
                user: updatedUser,
            };
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy người dùng";
            result.data = {
                user: null
            };
            return res.status(404).json(result);
        }
    };

    // ...

    // Lấy ra profile của user
    // [GET] /user/profile/:userName
    async getUserProfile(req, res){
        const { userName } = req.params;
        const result = {};
        // Số lượng người theo dõi
        const follower = await getUserFollowerTotalService(userName);
        // Số lượng đang theo dõi
        const follow = await getUserFollowTotalService(userName);
        // Số lượng bài viết
        const articlesAndUser = await getUserArticleTotal(userName); // Chưa Clean (sẽ chỉnh lại)
        if(follower && follow && articlesAndUser){
            result.status = 200;
            result.message = "Thông tin profile";
            result.data = {
                follower: follower,
                follow: follow,
                articles: articlesAndUser.articles,
                user: articlesAndUser.user,
            }
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy thông tin profile";
            result.data = null;
            return res.status(200).json(result);
        }
    };

    // Lấy ra danh sách bài viết của user
    // [GET] /user/:userName/articles
    async getUserArticles(req, res){
        const { userName } = req.params;
        const result = {};
        // Số lượng bài viết
        const articlesAndUser = await getUserArticleTotal(userName); // Chưa Clean (sẽ chỉnh lại)
        if(articlesAndUser){
            result.status = 200;
            result.message = "Danh sách bài viết của người dùng";
            result.data = {
                articles: articlesAndUser.articles,
                user: articlesAndUser.user,
            }
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy danh sách bài viết của người dùng";
            result.data = null;
            return res.status(200).json(result);
        }
    };

    // Lấy ra danh sách bài nhạc của user
    // [GET] /user/:userName/musics
    async getUserMusics(req, res){
        const { userName } = req.params;
        const result = {};
        // Lấy danh sách bài nhạc của người dùng (theo userName)
        const songs = await getUserSongs(userName);
        if(songs){
            result.status = 200;
            result.message = "Danh sách bài nhạc của người dùng";
            result.data = songs;
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy danh sách bài nhạc của người dùng";
            result.data = null;
            return res.status(200).json(result);
        }
    };
}

module.exports = new UserController;