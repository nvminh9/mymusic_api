const { createUserService, getUserService } = require("../../../services/userService");
const { signInUserService, signOutUserService } = require("../../../services/authService");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const fs = require('fs');
const { getEmbedding } = require("../../ML/embedder");

class AuthController {

    // [GET] /auth
    async index(req, res){
        const token = req.headers.authorization.split(' ')[1];
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const data = await getUserService(decoded.email);
        return res.status(200).json(data);
    }

    // [POST] /auth/signup
    async handleSignUp(req, res){
        const result = {};
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/;
        const userNameRegex = /^[a-zA-Z0-9.]{5,30}$/;
        // Kiểm tra xem có dữ liệu gửi lên không
        if(req.body){
            const {name, userName, gender, birth, email, password} = req.body;

            // Kiểm tra xem email có đúng định dạng không
            const isCorrectEmailFormat = emailRegex.test(email);
            // Nếu email không đúng định dạng
            if(!isCorrectEmailFormat){
                result.status = 400
                result.message = `Email chưa đúng định dạng`;
                return res.status(400).json(result);
            }

            // Kiểm tra xem password có đúng định dạng không
            const isCorrectPasswordFormat = passwordRegex.test(password);
            // Nếu password không đúng định dạng
            if(!isCorrectPasswordFormat){
                result.status = 400
                result.message = `Password chưa đúng định dạng`;
                return res.status(400).json(result);
            }

            // Kiểm tra xem userName có đúng định dạng không
            const isCorrectUserNameFormat = userNameRegex.test(userName);
            // Nếu userName không đúng định dạng
            if(!isCorrectUserNameFormat){
                result.status = 400;
                result.message = 'Tên người dùng chưa đúng định dạng';
                return res.status(400).json(result);
            }

            // Tạo embedding (theo name, userName, description)
            const source = [name, userName, null].filter(Boolean).join(' . ');
            const vec = await getEmbedding(source);

            const data = await createUserService(name, userName, gender, birth, email, password, null, vec);
            // Nếu tạo mới người dùng không thành công
            if(data == null){
                result.status = 409
                result.message = `Email hoặc tên người dùng đã tồn tại`;
                return res.status(409).json(result);
            }
            // Nếu tạo mới người dùng thành công
            result.status = 200
            result.message = `Đăng ký thành công`;
            result.data = data;
            return res.status(200).json(result); 
        }else{
            result.status = 200
            result.message = `Người dùng chưa nhập thông tin đăng ký`;
            return res.status(200).json(result); 
        }
    }

    // [POST] /auth/signin
    async handleSignIn(req, res){
        const result = {};        
        // Kiểm tra xem có dữ liệu gửi lên không
        if(req.body){
            const {email, password} = req.body;
            const data = await signInUserService(email, password);
            // Nếu đăng nhập thành công
            // result.status = 200
            // result.message = `Đăng nhập thành công`;
            // result.data = data;
            return res.status(200).json(data);
        }else {
            result.status = 200
            result.message = `Người dùng chưa nhập thông tin đăng nhập`;
            return res.status(200).json(result); 
        }
    }

    // [GET] /auth/signout
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

    generateRandomPassword() {
        return crypto.randomBytes(32).toString('hex'); // tạo chuỗi ngẫu nhiên 64 ký tự
    };

    // [POST] /auth/google/signup (Đăng ký với Google)
    async handleSignUpWithGoogle(req, res) {
        const { idToken, userName } = req.body;
        
        // OAuth Client
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        try {
            // Xác thực token với Google
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            // Payload
            const payload = ticket.getPayload();
            const { email, name, picture, sub: googleId } = payload;

            // Tìm user trong DB và đăng nhập, nếu chưa có thì tạo user mới
            const user = await getUserService(email);
            // Kiểm tra
            if(user.data){
                // Nếu có user data thì trả về thông báo email đã được đăng ký
                // Kết quả
                return res.status(200).json({
                    status: 200,
                    message: "Email đã được đăng ký",
                    data: null
                });
            } else {
                if(!userName){
                    return res.status(200).json({
                        status: 200,
                        message: "Email chưa được đăng ký",
                        data: null
                    });
                } else {
                    // Nếu không có user data thì bắt đầu tạo
                    // const randomPassword = this.generateRandomPassword();
                    const randomPassword = crypto.randomBytes(32).toString('hex');

                    // Tạo userAvatar từ picture trong payload
                    const response = await fetch(picture);
                    const buffer = await response.arrayBuffer();                
                    fs.writeFileSync(`src/assets/image/userAvatar-${picture?.split("/")?.[4]}.jpg`, Buffer.from(buffer));

                    // Tạo embedding (theo name, userName, description)
                    const source = [name, userName, null].filter(Boolean).join(' . ');
                    const vec = await getEmbedding(source);

                    const createUser = await createUserService(name, userName, null, null, email, randomPassword, `/image/userAvatar-${picture?.split("/")?.[4]}.jpg`, vec);
                    // Login
                    const loginResult = await signInUserService(email, randomPassword);
                    // Kết quả
                    return res.status(loginResult.status).json(loginResult);
                }
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [POST] /auth/google (Đăng nhập với Google)
    async handleSignInWithGoogle(req, res) {
        const { idToken, userName } = req.body; // userName: null
        
        // OAuth Client
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        try {
            // Xác thực token với Google
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            // Payload
            const payload = ticket.getPayload();
            const { email, name, picture, sub: googleId } = payload;

            // Tìm user trong DB và đăng nhập, nếu chưa có thì tạo user mới
            const user = await getUserService(email);
            // Kiểm tra
            if(user.data){
                // Nếu có user data thì tiến hành đăng nhập
                // Login
                // Tạo access token ...
                const payload = {
                    email: email,
                    name: name,
                    userName: user.data.userName,
                    id: user.data.userId,
                };
                const accessToken = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE
                    }
                )
                // Kết quả
                return res.status(200).json({
                    status: 200,
                    message: "Đăng nhập thành công",
                    data: {
                        accessToken: accessToken,
                        user: user.data,
                    }
                });
            } else {
                // Nếu chưa có user data thì trả về thông báo email chưa được đăng ký
                // Kết quả
                return res.status(200).json({
                    status: 200,
                    message: "Tài khoản chưa được đăng ký",
                    data: null
                });
            }
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };
}

module.exports = new AuthController;