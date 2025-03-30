const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Models
const User = require('../app/models/sequelize/User');
const Blacklist = require('../app/models/sequelize/Blacklist');

// Đăng ký
// ...

// Đăng nhập
const signInUserService = async (email, password) => {
    try {
        // Sẽ thay bằng hàm GET user ở trên...
        // Tìm người dùng theo email
        const user = await User.findOne({
            where: {
                email: email
            }
        });
        // Kiểm tra người dùng có tồn tại không
        if(user){
            // So sánh password
            const isMatchPassword = await bcrypt.compare(password, user.password);
            // Nếu mật khẩu không chính xác
            if(!isMatchPassword){
                return {
                    status: 401,
                    message: "Email hoặc mật khẩu chưa chính xác"
                };
            }else {
                // Tạo access token ...
                const payload = {
                    email: user.email,
                    name: user.name,
                    userName: user.userName,
                    id: user.userId,
                };
                const accessToken = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE
                    }
                )
                // Bỏ password trước khi trả về user info
                user.password = "";
                return {
                    status: 200,
                    message: "Đăng nhập thành công",
                    data: {
                        accessToken: accessToken,
                        user: user,
                    }
                }
            }
        }else {
            return {
                status: 401,
                message: "Email hoặc mật khẩu chưa chính xác"
            };
        }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Đăng xuất
const signOutUserService = async (token) => {
    const checkIfBlacklisted = await Blacklist.findOne({
        where: {
            token: token,
        },
        attributes: {
            exclude: ["id","createdAt","updatedAt"],
        }
    })
    if(checkIfBlacklisted){
        return null;
    }else {
        try {
            let result = await Blacklist.create({
                token,
            });
            console.log(">>> User logout, đã lưu token logout vào blacklist ");
            return result;
        } catch (error) {
            console.log(">>❌ Error in signOutUserService: ", error);
            return null;
        }
    }
}

module.exports = {
    signInUserService, 
    signOutUserService
}