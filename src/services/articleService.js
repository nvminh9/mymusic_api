const dotenv = require('dotenv');
dotenv.config();
const { User, Article, Photo, Video, LikeArticle, Comment } = require('../app/models/sequelize');

// Tạo mới một bài viết (CREATE)
// articleData là object chứa dữ liệu tạo bài viết
// articleImageData là array chứa các object có thuộc tính photoLink (chứa link của Hình)
// articleVideoData là array chứa các object có thuộc tính videoLink (chứa link của Video)
const createArticleService = async (articleData, articleImageData, articleVideoData) => {
    try {
        // Tạo bài viết (với textContent)
        const article = await Article.create(
            articleData
        );
        // Kiểm tra
        if(article){
            let articleResult = {};
            articleResult = {...article.dataValues};

            // Tạo photo cho bài viết (nếu có)
            if(articleImageData[0] !== null){
                let photos = [];
                for(let i = 0; i < articleImageData.length; i++){
                    // Tạo trong DB
                    photos[i] = await Photo.create(
                        {
                            articleId: article.articleId,
                            photoLink: articleImageData[i].photoLink,
                        }
                    );
                    // Nếu tạo trong DB có lỗi thì sẽ gán thành object rỗng
                    if(!photos[i]){
                        photos[i] = {};
                    };
                }
                // Kiểm tra
                if(photos.length > 0){
                    articleResult.photos = photos;
                } else {
                    articleResult.photos = null;
                }
            } else {
                articleResult.photos = null;
            }

            // Tạo video cho bài viết (nếu có)
            if(articleVideoData[0] !== null){
                let videos = [];
                for(let i = 0; i < articleVideoData.length; i++){
                    // Tạo trong DB
                    videos[i] = await Video.create(
                        {
                            articleId: article.articleId,
                            videoLink: articleVideoData[i].videoLink,
                        }
                    );
                    // Nếu tạo trong DB có lỗi thì sẽ gán thành object rỗng
                    if(!videos[i]){
                        videos[i] = {};
                    };
                }
                // Kiểm tra
                if(videos.length > 0){
                    articleResult.videos = videos;
                } else {
                    articleResult.videos = null;
                }
            } else {
                articleResult.videos = null;
            }

            return articleResult;
        } else {
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy thông tin bài viết (READ)
const getArticleService = async () => {
    try{
        // Tìm bài viết
        // const user = await User.findOne({
        //     where: {
        //         email: email
        //     },
        //     attributes: {
        //         exclude: ["password"]
        //     },
        // });
        // Kiểm tra bài viết có tồn tại không
        // if(user){
        //     return {
        //         status: 200,
        //         message: "Tìm thấy người dùng",
        //         data: user
        //     };
        // }else {
        //     return {
        //         status: 404,
        //         message: "Không tìm thấy người dùng",
        //         data: null
        //     };
        // }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Cập nhật thông tin người dùng (UPDATE)
// ...

// Xóa người dùng (DELETE)
// ...

// Lấy ra số bài viết của người dùng (theo userId)
const getUserArticleTotal = async (userName) => {
    const result = {};
    try {
        // Tìm user với userName
        const user = await User.findOne({
            where: {
                userName: userName
            },
            // attributes: {
                
            // }
        });
        // Kiểm tra user
        // ...
        const userId = user.userId;
        // Tìm các bài viết của user theo userId
        // Dùng findAndCountAll sẽ bị lỗi ở thuộc tính count trả về, do count sẽ đếm cả các include
        const articles = await Article.findAll({
            where: {
                userId: userId,
            },
            include: [Photo, LikeArticle, Comment],
        });
        // Tạo thuộc tính mediaContent chứa hình ảnh và video có thứ tự theo cột order
        // console.log("articles: ", articles[0].dataValues);
        // Kiểm tra
        if(articles){
            articles.forEach((article) => {
                const photos = article.dataValues.Photos.map((photo) => ({...photo.dataValues, type: "photo"}));
                // const videos = article.dataValues.Videos.map((video) => ({...video, type: "video"}));
                // const videos = article.Videos.map(video => video.videoLink);
                const mediaContent = [
                    ...photos
                    // ...videos
                ];
                mediaContent.sort((a, b) => a.order - b.order);
                delete article.dataValues.Photos;
                article.dataValues.mediaContent = mediaContent;
            });
            result.articles = articles;
            result.user = user;
            return result;
        }else{
            return null;
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    createArticleService,
    getArticleService,
    getUserArticleTotal
}