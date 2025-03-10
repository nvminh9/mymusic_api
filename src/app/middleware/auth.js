const dotenv = require('dotenv');
dotenv.config();
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
    // Các route không cần xác thực
    const allow_routes = ["/","/auth/signup","/auth/signin"]; 
    // Kiểm tra xem request có phải route không cần xác thực không
    if(allow_routes.find(item => '/v1/api' + item === req.baseUrl + req.path)){
        next();
    }else {
        // Check token
        if(req?.headers?.authorization?.split(' ')?.[1]){
            const token = req.headers.authorization.split(' ')[1];
            console.log(">>> Check token: ", token);
            // Verify token
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                console.log(">>> Decoded: ", decoded);
                next();
            } catch (error) {
                return res.status(401).json({
                    message: "Unauthorized",
                    error: "Token is expired or invalid"
                });
            }
        }else {
            // return exception unauthorized
            return res.status(401).json({
                message: "Unauthorized",
                error: "Missing token"
            });
        }
    }
}

module.exports = auth;