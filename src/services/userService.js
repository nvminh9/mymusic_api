const User = require('../app/models/sequelize/User');
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
            }
        });
        // Kiểm tra người dùng có tồn tại không
        if(user){
            return {
                ErrorCode: 200,
                ErrorMessage: "Tìm thấy người dùng",
                Data: user
            };
        }else {
            return {
                ErrorCode: 404,
                ErrorMessage: "Không tìm thấy người dùng",
                Data: null
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
                    ErrorCode: 401,
                    ErrorMessage: "Email hoặc mật khẩu chưa chính xác"
                };
            }else {
                // Tạo access token ...
                return {
                    ErrorCode: 200,
                    ErrorMessage: "Tạo access token thành công"
                }
            }
        }else {
            return {
                ErrorCode: 404,
                ErrorMessage: "Không tìm thấy người dùng"
            };
        }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

module.exports = {
    createUserService,
    signInUserService
}