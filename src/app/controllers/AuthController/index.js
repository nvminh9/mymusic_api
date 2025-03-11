const { createUserService, getUserService } = require("../../../services/userService");
const { signInUserService, signOutUserService } = require("../../../services/authService");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

class AuthController {

    // [GET] /auth
    async index(req, res){
        const token = req.headers.authorization.split(' ')[1];
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const data = await getUserService(decoded.email);
        return res.status(200).json(data);
    }

    // [POST] /signup
    async handleSignUp(req, res){
        const result = {};
        const emailRegexp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordRegexp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/;
        console.log(">>> Check user information: ", req.body);
        // Kiểm tra xem có dữ liệu gửi lên không
        if(req.body){
            const {name, userName, gender, birth, email, password} = req.body;
            // Kiểm tra xem email có đúng định dạng không
            const isCorrectEmailFormat = emailRegexp.test(email);
            // Nếu email không đúng định dạng
            if(!isCorrectEmailFormat){
                result.status = "400"
                result.message = `Email chưa đúng định dạng`;
                return res.status(400).json(result);
            }
            // Kiểm tra xem password có đúng định dạng không
            const isCorrectPasswordFormat = passwordRegexp.test(password);
            // Nếu password không đúng định dạng
            if(!isCorrectPasswordFormat){
                result.status = "400"
                result.message = `Password chưa đúng định dạng`;
                return res.status(400).json(result);
            }
            const data = await createUserService(name, userName, gender, birth, email, password);
            // Nếu tạo mới người dùng không thành công
            if(data == null){
                result.status = "500"
                result.message = `Có lỗi xảy ra trong quá trình tạo người dùng mới, Email hoặc Username đã tồn tại`;
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

    // [GET] /signout
    async handleSignout(req, res){
        const token = req.headers.authorization.split(' ')[1];
        const result = await signOutUserService(token);
        if(result == null){
            return res.status(200).json({
                message: "Có lỗi xảy ra trong quá trình đăng xuất hoặc đã đăng xuất trước đó"
            });
        }else {
            return res.status(200).json({
                message: "Đăng xuất thành công"
            });
        }
    } 
}

module.exports = new AuthController;