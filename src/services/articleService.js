const dotenv = require('dotenv');
dotenv.config();
const User = require('../app/models/sequelize/User');
const Article = require('../app/models/sequelize/Article');

// Tạo mới một bài viết (CREATE)
const createArticleService = async () => {
    try {
        
        // console.log(">>> ✅ Create user successfully: ");
        // return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Lấy thông tin bài viết (READ)
const getArticleService = async () => {
    try{
        // Tìm bài viết
        // const user = await User.findOne({
        //     where: {
        //         email: email
        //     },
        //     attributes: {
        //         exclude: ["password"]
        //     },
        // });
        // Kiểm tra bài viết có tồn tại không
        // if(user){
        //     return {
        //         status: 200,
        //         message: "Tìm thấy người dùng",
        //         data: user
        //     };
        // }else {
        //     return {
        //         status: 404,
        //         message: "Không tìm thấy người dùng",
        //         data: null
        //     };
        // }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Cập nhật thông tin người dùng (UPDATE)
// ...

// Xóa người dùng (DELETE)
// ...

// Lấy ra số bài viết của người dùng (theo userId)
const getUserArticleTotal = async (userId) => {
    try {
        // Tìm các bài viết của user theo userId
        const articles = await Article.findAndCountAll({
            where: {
                userId: userId,
            }
        });
        // Kiểm tra
        if(articles){
            return articles;
        }else{
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    createArticleService,
    getArticleService,
    getUserArticleTotal
}