class UserController{

    // [GET] /user
    index(req, res){
        return res.status(200).json("User Information")
    };
}

module.exports = new UserController;