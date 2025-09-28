const dotenv = require('dotenv');
dotenv.config();
const { Genre } = require('../app/models/sequelize');

// Thực hiện lấy danh sách các thể loại âm nhạc
const getListOfGenreService = async () => {
    try{
        const listOfGenre = await Genre.findAll();
        // Kiểm tra
        if(!listOfGenre){
            // Kết quả
            return {
                status: 200,
                message: 'Không tìm thấy các thể loại nhạc',
                data: null
            };
        }
        
        // Kết quả
        return {
            status: 200,
            message: 'Danh sách các thể loại nhạc',
            data: listOfGenre
        };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    getListOfGenreService,
}