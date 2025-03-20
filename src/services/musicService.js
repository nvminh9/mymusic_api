const dotenv = require('dotenv');
dotenv.config();
const Song = require('../app/models/sequelize/Song');
const User = require('../app/models/sequelize/User')

// Tạo mới một bài nhạc (CREATE)
const createSongService = async () => {
    try {
        // console.log(">>> ✅ Create user successfully: ");
        // return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Lấy thông tin bài nhạc (READ)
const getSongService = async () => {
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

// Cập nhật thông tin bài nhạc (UPDATE)
// ...

// Xóa bài nhạc (DELETE)
// ...

// Lấy ra danh sách bài nhạc của người dùng (theo userId)
const getUserSongs = async (userName) => {
    try {
        // Tìm user với userName (bao gồm theo các Song của User)
        const user = await User.findOne({
            where: {
                userName: userName
            },
            include: [Song]
        });
        if(user){
            return user;
        }else{
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}


module.exports = {
    getUserSongs
}