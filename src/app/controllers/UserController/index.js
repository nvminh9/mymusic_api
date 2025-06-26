const { getUserArticleTotal } = require("../../../services/articleService");
const { getUserSongs } = require("../../../services/musicService");
const { getUserService, getUserFollowerTotalService, getUserFollowTotalService, updateUserService, createFollowUser, getFollow, deleteFollowUser } = require("../../../services/userService");
const dotenv = require('dotenv');
dotenv.config();
const jwt = require("jsonwebtoken");

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
    // [PATCH] /user/profile/:userName
    async updateUserInfo(req, res){ // Cần cập nhật lại không lấy userName từ params mà lấy từ token để đảm bảo tính bảo mật
        const { userName } = req.params;
        const { description, gender } = req.body;
        const result = {};
        // Kiểm tra file upload
        let userAvatar = req.files["userAvatar"] ? req.files["userAvatar"][0].filename : null;
        // Tạo object lưu các giá trị để update thông tin user
        let updateData = { description, gender };
        if (userAvatar) updateData.userAvatar = `/image/${userAvatar}`;
        // Thực hiện cập nhật thông tin user
        const updatedUser = await updateUserService(userName, updateData); // Cập nhật thông tin người dùng (description, gender, userAvatar)
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
        const result = {};
        const { userName } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        // lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const followerUserName = decoded.userName; // userName của auth user
        const followerId = decoded.id; // userId của auth user
        // Kiểm tra auth user đã theo dõi user chưa 
        const followStatus = await getFollow(followerUserName, userName);
        // Dữ liệu người theo dõi
        const follower = await getUserFollowerTotalService(userName, followerId);
        // Dữ liệu đang theo dõi
        const follow = await getUserFollowTotalService(userName, followerId);
        // Dữ liệu bài viết
        const articlesAndUser = await getUserArticleTotal(userName, followerId); // Chưa Clean (sẽ chỉnh lại)
        // follower && follow && articlesAndUser // old state
        if(articlesAndUser){
            result.status = 200;
            result.message = "Thông tin profile";
            result.data = {
                follower: follower,
                follow: follow,
                articles: articlesAndUser.articles,
                user: articlesAndUser.user,
                followStatus: followStatus === true ? true : false
            }
            return res.status(200).json(result);
        }else{
            result.status = 404;
            result.message = "Không tìm thấy thông tin profile";
            result.data = null;
            return res.status(404).json(result);
        }
    };

    // Lấy danh sách người theo dõi
    // [GET] /user/profile/:userName/followers
    async getFollowers(req, res){
        const result = {};
        const { userName } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        // lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const followerId = decoded.id;
        try {
            // Danh sách người theo dõi
            const followers = await getUserFollowerTotalService(userName, followerId);
            // Kiểm tra
            if(followers !== null){
                result.status = 200;
                result.message = "Danh sách người theo dõi";
                result.data = followers;
                return res.status(200).json(result);
            } else {
                result.status = 404;
                result.message = "Lấy danh sách người theo dõi không thành công";
                result.data = followers;
                return res.status(404).json(result);
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // Lấy danh sách đang theo dõi
    // [GET] /user/profile/:userName/follow
    async getFollows(req, res){
        const result = {};
        const { userName } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        // lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const followerId = decoded.id;
        try {
            // Danh sách đang theo dõi
            const follows = await getUserFollowTotalService(userName, followerId);
            // Kiểm tra
            if(follows !== null){
                result.status = 200;
                result.message = "Danh sách đang theo dõi";
                result.data = follows;
                return res.status(200).json(result);
            } else {
                result.status = 404;
                result.message = "Lấy danh sách đang theo dõi không thành công";
                result.data = follows;
                return res.status(404).json(result);
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

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

    // Thực hiện theo dõi người dùng
    // [POST] /profile/:userName/follow
    async handleFollowUser(req, res){
        const result = {};
        try {
            const token = req.headers.authorization.split(' ')[1];
            // lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const followerId = decoded.id;
            const follower = decoded.userName;
            // dữ liệu của user được follow
            const { userName } = req.params;
            // thực hiện tạo theo dõi người dùng
            const followResult = await createFollowUser(followerId, follower, userName);
            if(followResult !== null){
                result.status = 200;
                result.message = "Theo dõi người dùng thành công"
                result.data = followResult;
                return res.status(200).json(result);
            } else {
                result.status = 404;
                result.message = "Theo dõi người dùng không thành công, không tìm thấy người dùng"
                result.data = null;
                return res.status(404).json(result);
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // Thực hiện hủy theo dõi người dùng
    // [PATCH] /profile/:userName/unfollow
    async handleUnfollowUser(req, res){
        const result = {};
        const { userName } = req.params;
        try {
            const token = req.headers.authorization.split(' ')[1];
            // lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const follower = decoded.userName;
            const checkDeleteFollowUser = await deleteFollowUser(follower, userName);
            // Kiểm tra
            if(checkDeleteFollowUser){
                result.status = 200;
                result.message = "Hủy theo dõi thành công";
                result.data = checkDeleteFollowUser;
                return res.status(200).json(result);
            } else {
                result.status = 200;
                result.message = "Hủy theo dõi không thành công, không tìm thấy người dùng";
                result.data = checkDeleteFollowUser;
                return res.status(200).json(result);
            };
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };
}

module.exports = new UserController;