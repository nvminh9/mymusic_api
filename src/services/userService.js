const dotenv = require('dotenv');
dotenv.config();
const User = require('../app/models/sequelize/User');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');

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
// ...

// Xóa người dùng (DELETE)
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
                };
                const accessToken = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE
                    }
                )
                return {
                    status: 200,
                    message: "Đăng nhập thành công",
                    data: {
                        accessToken: accessToken,
                        email: user.email,
                        name: user.name
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

module.exports = {
    createUserService,
    getUserService,
    signInUserService
}