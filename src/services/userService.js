const dotenv = require('dotenv');
dotenv.config();
const { User } = require('../app/models/sequelize');
const { Follower } = require('../app/models/sequelize');
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
// tham số followerId là id của người dùng đang đăng nhập
const getUserFollowerTotalService = async (userName, followerId) => {
    // Chứa kết quả cuối cùng
    const result = {};
    // Lấy ra số lượng người dùng theo dõi 
    try {
        // Tìm user
        const user = await User.findOne({
            where: {
                userName: userName
            },
            attributes: {
                exclude: ["name","userName","gender","birth","userAvatar","email","password","userCoverImage","description","createdAt","updatedAt"]
            }
        });
        const userId = user.userId;
        // Cần tìm theo userId để có thể include User
        const follower = await Follower.findAndCountAll({
            where: {
                userId: userId,
                status: 0
            },
            include: [
                {
                    model: User,
                    as: "followerUser",
                    attributes: {
                        exclude: ["password"]
                    },
                },
            ],
        });
        // Lấy danh sách người dùng mà auth user đã theo dõi (status = 0)
        const followingList = await Follower.findAll({
            where: {
                followerId: followerId,
                status: 0
            },
            attributes: ["userId"],
        });
        // Chuyển followingList thành array (mảng ID của user đã theo dõi)
        const followingIdsArray = followingList.map((item) => item.userId);
        // gán lại follower.count cho result.count
        result.count = follower.count;
        // map (thêm thuộc tính followStatus vào mỗi object trong mảng follower.rows)
        result.rows = follower.rows.map((item) => ({
            ...item.toJSON(),
            followStatus: followingIdsArray.includes(item.followerId),
        }));
        // Kiểm tra
        if(result){
            return result;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy ra số người dùng đang theo dõi (Đang theo dõi)
// tham số followerId là id của user đang đăng nhập
const getUserFollowTotalService = async (userName, followerId) => {
    const result = {};
    // Lấy ra số lượng người dùng đang theo dõi
    try {
        // Kiểm tra người dùng có tồn tại
        const user = await User.findOne({
            where: {
                userName: userName
            },
            attributes: {
                exclude: ["name","userName","gender","birth","userAvatar","email","password","userCoverImage","description","createdAt","updatedAt"]
            }
        });
        const userId = user.userId;
        // Lấy danh sách người đang theo dõi (tìm theo id của user để có thể include User)
        const follow = await Follower.findAndCountAll({
            where: {
                followerId: userId,
                status: 0
            },
            include: [
                {
                    model: User,
                    as: "followingUser",
                    attributes: {
                        exclude: ["password"]
                    },
                },
            ],
        });
        // Lấy danh sách người dùng mà auth user đã theo dõi (status = 0)
        const followingList = await Follower.findAll({
            where: {
                followerId: followerId,
                status: 0
            },
            attributes: ["userId"],
        });
        // Chuyển followingList thành array (mảng ID của user đã theo dõi)
        const followingIdsArray = followingList.map((item) => item.userId);
        // gán lại follower.count cho result.count
        result.count = follow.count;
        // map (thêm thuộc tính followStatus vào mỗi object trong mảng follow.rows)
        result.rows = follow.rows.map((item) => ({
            ...item.toJSON(),
            followStatus: followingIdsArray.includes(item.userId),
        }));
        // Kiểm tra
        if(result){
            return result;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};


// Kiểm tra theo dõi (kiểm tra đã theo dõi chưa)
const getFollow = async (follower, userName) => {
    try {
        const result = await Follower.findOne({
            where: {
                follower: follower,
                userName: userName,
                status: 0,
            },
            attributes: {
                exclude: ["followerId","follower","userId","userName"]
            },
        });
        // console.log(result);
        // Kiểm tra
        if(result !== null){
            // Đã theo dõi
            return true;
        } else {
            // Chưa theo dõi
            return false;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện xử lý theo dõi người dùng
const createFollowUser = async (followerId, follower, userName) => {
    try {
        const user = await User.findOne({
            where: {
                userName: userName
            },
            attributes: {
                exclude: ["name","userName","gender","birth","userAvatar","email","password","userCoverImage","description","createdAt","updatedAt"]
            }
        });
        // Nếu không tìm thấy người dùng thì trả về null
        if(!user){
            console.log("Không tìm thấy người dùng");
            return null;
        }
        // Check xem userId có phải là auth user ko (tránh follow chính mình)
        if(user.userId === followerId){
            console.log("Không thể theo dõi chính mình");
            return null;
        }
        // check xem followerId đã theo dõi userId trước đó chưa
        const checkFollower = await Follower.findOne({
            where: {
                followerId: followerId,
                userId: user.userId
            }
        })
        // console.log(">>> Check Follow: ", checkFollower);
        // console.log(">>> Check Follow Status: ", typeof checkFollower.dataValues.status);
        if(checkFollower !== null && checkFollower.dataValues.status === '0'){
            console.log("Đã theo dõi từ trước");
            return null;
        }
        // Nếu checkFollower khác null và status = 1 (unfollow) thì followerId đã theo dõi userId trước đó (chỉ update status = 0)
        if(checkFollower !== null && checkFollower.status === '1'){
            const updateFollowStatus = await Follower.update(
                {
                    status: 0
                },
                {
                    where: {
                        id: checkFollower.id
                    }
                }
            );
            // Kiểm update follow status
            if(updateFollowStatus){
                console.log("Update Follow Status")
                return updateFollowStatus;
            } else {
                console.log("False: Update Follow Status");
                return null;
            }
        }
        // Tạo record follow mới cho followerId theo dõi userId
        const result = await Follower.create({
            followerId: followerId,
            follower: follower,
            userId: user.userId,
            userName: userName,
            status: 0 // 0. followed
        });
        // Kiểm tra result tạo follow
        if(result){  
            console.log("Create Follow");
            return result;
        } else {
            console.log("False: Create Follow");
            return result;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện xử lý hủy theo dõi người dùng
// Soft Delete (đổi status -> 1 (unfollow))
const deleteFollowUser = async (follower, userName) => {
    try {
        const result = await Follower.update(
            { status: 1 },
            {
                where: {
                    follower: follower,
                    userName: userName,
                    status: 0
                }
            }
        );
        // Kiểm tra
        if(result[0] === 1){
            console.log("Hủy theo dõi thành công");
            return true;
        } else if (result[0] === 0) {
            console.log("Hủy theo dõi không thành công");
            return false;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

module.exports = {
    createUserService,
    getUserService,
    getUserFollowerTotalService,
    getUserFollowTotalService,
    updateUserService,
    createFollowUser,
    getFollow,
    deleteFollowUser
}