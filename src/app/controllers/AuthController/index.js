const { createUserService, signInUserService } = require("../../../services/userService");

class AuthController {

    // [GET] /auth
    index(req, res){
        return res.status(200).json("User đã đăng nhập bằng ...");
    }

    // [POST] /signup
    async handleSignUp(req, res){
        const result = {};
        console.log(">>> Check user information: ", req.body);
        // Kiểm tra xem có dữ liệu gửi lên không
        if(req.body){
            const {name, userName, gender, birth, email, password} = req.body;
            const data = await createUserService(name, userName, gender, birth, email, password);
            // Nếu tạo mới người dùng không thành công
            if(data == null){
                result.status = "500"
                result.message = `Có lỗi xảy ra trong quá trình tạo người dùng mới`;
                return res.status(500).json(result);
            }
            // Nếu tạo mới người dùng thành công
            result.status = "200"
            result.message = `Tạo người dùng mới với thông tin sau: ${email}, ${name}, ${userName}`;
            result.data = data;
            return res.status(200).json(result); 
        }else{
            result.status = "200"
            result.message = `Người dùng chưa nhập thông tin đăng ký`;
            return res.status(200).json(result); 
        }
    }

    // [POST] /signin
    async handleSignIn(req, res){
        const result = {};
        console.log(">>> Check user information: ", req.body);
        // Kiểm tra xem có dữ liệu gửi lên không
        if(req.body){
            const {email, password} = req.body;
            const data = await signInUserService(email, password);
            // Nếu đăng nhập thành công
            // result.status = "200"
            // result.message = `Đăng nhập thành công`;
            // result.data = data;
            return res.status(200).json(data);
        }else {
            result.status = "200"
            result.message = `Người dùng chưa nhập thông tin đăng nhập`;
            return res.status(200).json(result); 
        }
    }
}

module.exports = new AuthController;