const { getUserService } = require("../../../services/userService");

class UserController{

    // [GET] /user
    async index(req, res){
        const {email} = req.body;
        const data = await getUserService(email);
        return res.status(200).json(data);
    };
}

module.exports = new UserController;