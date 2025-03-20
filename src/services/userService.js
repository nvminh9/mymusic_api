const dotenv = require('dotenv');
dotenv.config();
const User = require('../app/models/sequelize/User');
const Follower = require('../app/models/sequelize/Follower');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Tạo mới một người dùng (CREATE)
const createUserService = async (name, userName, gender, birth, email, password) => {
    try {
        // Hash password
        const hashPassword = await bcrypt.hash(password, saltRounds);
        // Save user to database
        let result = await User.create({
            name,
            userName,
            gender,
            birth,
            email,
            password: hashPassword,
        });
        console.log(">>> ✅ Create user successfully: ");
        return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Lấy thông tin người dùng (READ)
const getUserService = async (email) => {
    // Tìm người dùng theo email
    try{
        const user = await User.findOne({
            where: {
                email: email
            },
            attributes: {
                exclude: ["password"]
            },
        });
        // Kiểm tra người dùng có tồn tại không
        if(user){
            return {
                status: 200,
                message: "Tìm thấy người dùng",
                data: user
            };
        }else {
            return {
                status: 404,
                message: "Không tìm thấy người dùng",
                data: null
            };
        }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Cập nhật thông tin người dùng (UPDATE)
// updateData = { description, gender, userAvatar }
const updateUserService = async (userName, updateData) => {
    try {
        // Thực hiện update
        const updated = await User.update(
            updateData,
            {
                where: {
                    userName
                }
            }
        );
        // Kiểm tra updated
        if(updated){
            const updatedUser = await User.findOne({
                where: {
                    userName
                },
                attributes: {
                    exclude: ["password"]
                }
            });
            return updatedUser;
        }else{
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Xóa người dùng (DELETE)
// ...

// Lấy ra số người theo dõi (Người theo dõi)
const getUserFollowerTotalService = async (userName) => {
    // Lấy ra số lượng người dùng theo dõi 
    try {
        const follower = await Follower.findAndCountAll({
            where: {
                userName: userName,
            }
        });
        // Kiểm tra
        if(follower){
            return follower;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy ra số người dùng đang theo dõi (Đang theo dõi)
const getUserFollowTotalService = async (userName) => {
    // Lấy ra số lượng người dùng đang theo dõi
    try {
        const follow = await Follower.findAndCountAll({
            where: {
                follower: userName,
            }
        });
        // Kiểm tra
        if(follow){
            return follow;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    createUserService,
    getUserService,
    getUserFollowerTotalService,
    getUserFollowTotalService,
    updateUserService
}